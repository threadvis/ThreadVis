/* *********************************************************************************************************************
 * This file is part of ThreadVis.
 * https://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis titled
 * "ThreadVis for Thunderbird: A Thread Visualisation Extension for the Mozilla Thunderbird Email Client"
 * at Graz University of Technology, Austria. An electronic version of the thesis is available online at
 * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with ThreadVis.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *********************************************************************************************************************
 * Implements cache for threaded messages.
 * Thread a list of messages by looking at the references header and additional information
 *
 * Based on the algorithm from Jamie Zawinski <jwz@jwz.org>
 * www.jwz.org/doc/threading.html
 **********************************************************************************************************************/

const EXPORTED_SYMBOLS = [ "Threader" ];

const { Container } = ChromeUtils.import("chrome://threadvis/content/container.jsm");
const { Logger } = ChromeUtils.import("chrome://threadvis/content/utils/logger.jsm");
const { Message } = ChromeUtils.import("chrome://threadvis/content/message.jsm");
const { Thread } = ChromeUtils.import("chrome://threadvis/content/thread.jsm");

const { Gloda } = ChromeUtils.import("resource:///modules/gloda/Gloda.jsm");

/**
 * Return a threaded view for the given message header
 *
 * @param {nsIMsgDBHdr} messageHeader - The message header for which to create the thread
 * @return {ThreadVis.Container} - a thread of containers
 */
const get = async (messageHeader) => {
    // convert message header to gloda messag{}
    const message = await getGlodaMessage(messageHeader);
    // get gloda thread
    const glodaThread = await getGlodaThread(message);
    // create the in-memory thread representation
    const containers = createContainers(glodaThread);
    const thread = new Thread(containers);
    thread.select(messageHeader.messageId);
    return thread;
};

/**
 * Create an in-memory view of the thread
 *
 * @param messageCollection - the collection of all messages in the thread
 */
const createContainers = (messageCollection) => {
    return messageCollection
        // convert to "our" messages
        .map((item) => createMessage(item))
        // and put all into thread
        .reduce(reduceMessages, []);
};

/**
 * Get a Gloda message for message header
 *
 * @param {nsIMsgDBHdr} messageHeader - The message header for which to get the Gloda message
 * @return {GlodaMessage} - the Gloda message
 */
const getGlodaMessage = (messageHeader) => {
    return new Promise((resolve, reject) =>  {
        Gloda.getMessageCollectionForHeader(messageHeader, {
            onItemsAdded : (items, collection) => {},
            onItemsModified : (items, collection) => {},
            onItemsRemoved : (items, collection) => {},
            onQueryCompleted : (collection) => {
                if (collection.items.length > 0) {
                    resolve(collection.items[0]);
                } else {
                    reject("Message not found in Gloda.");
                }
            }
        }, null);
    });
};

/**
 * Get all messages for a thread
 *
 * @param {GlodaMessage} message - The Gloda message
 * @return All Gloda messages in the thread
 */
const getGlodaThread = (message) => {
    return new Promise((resolve, reject) =>  {
        // get all messages in the thread from Gloda
        message.conversation.getMessagesCollection({
            onItemsAdded : (items, collection) => {},
            onItemsModified : (items, collection) => {},
            onItemsRemoved : (items, collection) => {},
            onQueryCompleted : (collection) => resolve(collection.items)
        });
    });
};

/**
 * Create a ThreadVis message
 *
 * @param {GlodaMessage} glodaMessage - The gloda message to add
 * @return {ThreadVis.Message} - The wrapped message
 */
const createMessage = (glodaMessage) => {
    if (!glodaMessage.folderMessage) {
        Logger.error("Cache",
            `Could not find "real" message for gloda message with msg-id "${glodaMessage.headerMessageID}" in folder "${glodaMessage.folderURI}"`);
    }

    return new Message(glodaMessage);
};

/**
 * Put this message in a container
 *
 * @param {ThreadVis.Message} message - The message to put into a container
 */
const reduceMessages = (containers, message) => {
    // try to get message container
    let messageContainer = containers.find((container) => container.id === message.id);

    if (messageContainer) {
        // if we found a container for this message id, either it's a dummy or we have two mails with the same message-id
        // this should only happen if we sent a mail to a list and got back our sent-mail in the inbox
        // in that case we want that our sent-mail takes precedence over the other,
        // since we want to display it as sent, and we only want to display it once
        if (!messageContainer.message || (messageContainer.message && !messageContainer.message.isSent)) {
            // store message in this container
            messageContainer.message = message;
        } else if (messageContainer.message?.isSent) {
            // the message in messageContainer is a sent message, the new message is not the sent one
            // in this case we simply ignore the new message, since the sent message takes precedence
            return containers;
        } else {
            messageContainer = undefined;
        }
    }

    if (!messageContainer) {
        // no suitable container found, create new one
        messageContainer = new Container(message.id, message);
        // remember container
        containers.push(messageContainer);
    }

    // for each element in references field of message
    let parentReferenceContainer = undefined;

    message.references.forEach((reference) => {
        // somehow, Thunderbird does not correctly filter invalid ids
        if (reference.indexOf("@") === -1) {
            // invalid message id, ignore
            return;
        }

        // try to find container for referenced message
        let referenceContainer = containers.find((container) => container.id === reference);
        if (!referenceContainer) {
            // no container found, create new one
            referenceContainer = new Container(reference);
            // index container
            containers.push(referenceContainer);
        }

        // link reference container together

        // if we have a parent container and current container does not have a parent
        // and we are not looking at the same container see if we are already a child of parent
        if (parentReferenceContainer && !referenceContainer.parent
                && parentReferenceContainer !== referenceContainer
                && !referenceContainer.findParent(parentReferenceContainer)) {
            parentReferenceContainer.addChild(referenceContainer);
        }
        parentReferenceContainer = referenceContainer;
    });

    // set parent of current message to last element in references

    // if we have a suitable parent container, and the parent container is the current container
    // or the parent container is a child of the current container, discard it as parent
    if (parentReferenceContainer
            && (parentReferenceContainer === messageContainer || parentReferenceContainer.findParent(messageContainer))) {
        parentReferenceContainer = undefined;
    }

    // if current message already has a parent
    if (messageContainer.parent && parentReferenceContainer) {
        // remove us from this parent
        messageContainer.parent.removeChild(messageContainer);
    }

    // if we have a suitable parent
    if (parentReferenceContainer) {
        // add us as child
        parentReferenceContainer.addChild(messageContainer);
    }

    return containers;
};


const Threader = {
    get
};