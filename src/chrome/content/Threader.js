/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011,
 *               2013, 2018 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with ThreadVis. If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *****************************************************************************
 * Thread a list of messages by looking at the references header and
 * additional information
 *
 * Based on the algorithm from Jamie Zawinski <jwz@jwz.org>
 * www.jwz.org/doc/threading.html
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /**
     * Constructor
     * 
     * @return A new threader object
     */
    ThreadVis.Threader = {
        /**
         * Link message ids to container objects
         */
        _idTable : {},

        /**
         * Add a new message
         * 
         * @param message
         *            The new Message to add
         */
        addMessage : function(message) {
            this._putMessageInContainer(message);
        },

        /**
         * Find a message
         * 
         * @param messageId
         *            The message id to search
         * @return The found message, null if message does not exist
         */
        findContainer : function(messageId) {
            return this._idTable[messageId];
        },

        /**
         * Put this message in a container
         * 
         * @param message
         *            The message to put into a container
         */
        _putMessageInContainer : function(message) {
            // try to get message container
            var messageContainer = this._idTable[message.getId()];

            if (messageContainer != null) {
                // if we found a container for this message id, either it's
                // a dummy or we have two mails with the same message-id
                // this should only happen if we sent a mail to a list and
                // got back our sent-mail in the inbox
                // in that case we want that our sent-mail takes precedence
                // over the other, since we want to display it as sent, and we
                // only want to display it once
                if (messageContainer.isDummy()
                        || (!messageContainer.isDummy() && !messageContainer
                                .getMessage().isSent())) {
                    // store message in this container
                    messageContainer.setMessage(message);
                    // index container in hashtable
                    this._idTable[message.getId()] = messageContainer;
                } else if (!messageContainer.isDummy()
                        && messageContainer.getMessage().isSent()) {
                    // the message in messageContainer is a sent message,
                    // the new message is not the sent one
                    // in this case we simply ignore the new message, since
                    // the sent message takes precedence
                    return;
                } else {
                    messageContainer = null;
                }
            }

            if (messageContainer == null) {
                // no suitable container found, create new one
                messageContainer = new ThreadVis.Container();
                messageContainer.setMessage(message);
                // index container in hashtable
                this._idTable[message.getId()] = messageContainer;
            }

            // for each element in references field of message
            var parentReferenceContainer = null;
            var parentReferenceId = "";
            var references = message.getReferences().getReferences();

            for (var referencekey in references) {
                var referenceId = references[referencekey];

                // try to find container for referenced message
                var referenceContainer = this._idTable[referenceId];
                if (referenceContainer == null) {
                    // no container found, create new one
                    referenceContainer = new ThreadVis.Container();
                    // index container
                    this._idTable[referenceId] = referenceContainer;
                }

                // link reference container together

                // if we have a parent container
                // and current container does not have a parent
                // and we are not looking at the same container
                // see if we are already a child of parent
                if (parentReferenceContainer != null
                        && !referenceContainer.hasParent()
                        && parentReferenceContainer != referenceContainer
                        && !referenceContainer
                                .findParent(parentReferenceContainer)) {
                    parentReferenceContainer.addChild(referenceContainer);
                }
                parentReferenceContainer = referenceContainer;
                parentReferenceId = referenceId;
            }

            // set parent of current message to last element in references

            // if we have a suitable parent container, and the parent
            // container is the current container or the parent container is a
            // child of the current container, discard it as parent
            if (parentReferenceContainer != null
                    && (parentReferenceContainer == messageContainer || parentReferenceContainer
                            .findParent(messageContainer))) {
                parentReferenceContainer = null;
            }

            // if current message already has a parent
            if (messageContainer.hasParent()
                    && parentReferenceContainer != null) {
                // remove us from this parent
                messageContainer.getParent().removeChild(messageContainer);
            }

            // if we have a suitable parent
            if (parentReferenceContainer != null) {
                // add us as child
                parentReferenceContainer.addChild(messageContainer);
            }
        },

        /**
         * Reset in-memory data
         */
        reset : function() {
            this._idTable = {};
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
