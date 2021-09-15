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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020 Alexander C. Hubmann-Haidvogel
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
 * Implements cache for threaded messages
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "Cache" ];

const { Message } = ChromeUtils.import("chrome://threadvis/content/message.js");
const { Strings } = ChromeUtils.import("chrome://threadvis/content/strings.js");
const { Threader } = ChromeUtils.import("chrome://threadvis/content/threader.js");

Components.utils.import("resource:///modules/gloda/Gloda.jsm");

/**
 * Get cache array for message
 * 
 * @param {nsIMsgDBHdr} msg The message for which to get the cache
 * @returns Promise when query is done or error occurred
 */
const get = (msg, callback) => {
    // first, clear data
    clearData();
    return new Promise((resolve, reject) =>  {
        Gloda.getMessageCollectionForHeader(msg, {
            onItemsAdded : function(items, collection) { },
            onItemsModified : function(items, collection) { },
            onItemsRemoved : function(items, collection) { },
            onQueryCompleted : function(collection) {
                let found = collection.items.length > 0;
                if (found) {
                    let message = collection.items[0];
                    message.conversation.getMessagesCollection({
                        onItemsAdded : function(items, collection) { },
                        onItemsModified : function(items, collection) { },
                        onItemsRemoved : function(items, collection) { },
                        onQueryCompleted : function(collection) {
                            for (let i = 0; i < collection.items.length; i++) {
                                let message = createMessage(collection.items[i]);
                                addToThreader(message);
                            }
                            resolve();
                        }
                    }, null);
                } else {
                    // tried to find message in global index but failed. display an error
                    reject({
                        error : true,
                        errorText : Strings.getString("error.messagenotfound")
                    });
                }
            }
        }, null);
    });
};

/**
 * Create a message
 * 
 * @param {GlodaMessage} glodaMessage
 *              The gloda message to add
 * @return {ThreadVis.Message} The wrapped message
 * @type ThreadVis.Message
 */
const createMessage = (glodaMessage) => {
    // check if msg is a sent mail

    if (glodaMessage.folderMessage == null) {
        ThreadVis.log("Cache",
                "Could not find 'real' message for gloda message with msg-id '"
                + glodaMessage.headerMessageID + "' in folder '" + glodaMessage.folderURI + "'");
    }

    return new Message(glodaMessage);
};

/**
 * Add a message to the threader
 * 
 * @param {ThreadVis.Message} message
 *              The message to add
 */
const addToThreader = (message) => {
    Threader.addMessage(message);
}

/**
 * Clear in-memory data
 */
const clearData = () => {
    Threader.reset();
}

/**
 * Static cache object
 */
const Cache = {
    get
};