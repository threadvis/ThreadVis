/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.mozdev.org/
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010 Alexander C. Hubmann-Haidvogel
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
 * Implements cache for threaded messages
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    Components.utils.import("resource://app/modules/gloda/public.js");

    /***************************************************************************
     * Create cache object
     * 
     * @return A new cache object
     **************************************************************************/
    ThreadVis.Cache = {}

    /***************************************************************************
     * Get cache array for message
     * 
     * @param msg
     *            The message for which to get the cache
     * @return void
     **************************************************************************/
    ThreadVis.Cache.getCache = function(msg, callback, numTry) {
        if (numTry == null) {
            numTry = 1;
        }
        Gloda.getMessageCollectionForHeader(msg, {
            onItemsAdded : function(items, collection) {
            },
            onItemsModified : function(items, collection) {
            },
            onItemsRemoved : function(items, collection) {
            },
            onQueryCompleted : function(collection) {
                var found = collection.items.length > 0;
                if (found) {
                    var message = collection.items[0];
                    message.conversation.getMessagesCollection( {
                        onItemsAdded : function(items, collection) {
                        },
                        onItemsModified : function(items, collection) {
                        },
                        onItemsRemoved : function(items, collection) {
                        },
                        onQueryCompleted : function(collection) {
                            for ( var i = 0; i < collection.items.length; i++) {
                                var message = ThreadVis.Cache
                                        .createMessage(collection.items[i]);
                                ThreadVis.Cache.addToThreader(message);
                            }
                            callback();
                        }
                    }, null);
                } else {
                    if (numTry > 10) {
                        // tried 10 times to fetch message from gloda,
                        // display error.
                    } else {
                        setTimeout(function() {
                            ThreadVis.Cache.getCache(msg, callback, numTry++);
                        }, 5000);
                    }
                }
            }
        }, null);
    }

    /***************************************************************************
     * Create a message
     * 
     * @param glodaMessage
     *            The gloda message to add
     * @return void
     **************************************************************************/
    ThreadVis.Cache.createMessage = function(glodaMessage) {
        // check if msg is a sent mail
        var issent = false;

        // it is sent if it is stored in a folder that is marked as sent (if
        // enabled)
        issent |= glodaMessage.folderMessage.folder.isSpecialFolder(
                Components.interfaces.nsMsgFolderFlags.SentMail, true)
                && ThreadVis.Preferences
                        .getPreference(ThreadVis.Preferences.PREF_SENTMAIL_FOLDERFLAG);
        // or it is sent if the sender address is a local identity (if enabled)
        issent |= ThreadVis.sentMailIdentities[glodaMessage.from.value] == true
                && ThreadVis.Preferences
                        .getPreference(ThreadVis.Preferences.PREF_SENTMAIL_IDENTITY);

        var message = new ThreadVis.Message(glodaMessage, issent);

        return message;
    }

    /***************************************************************************
     * Add a message to the threader
     * 
     * @param message
     *            The message to ad
     * @return void
     **************************************************************************/
    ThreadVis.Cache.addToThreader = function(message) {
        ThreadVis.Threader.addMessage(message);
    }

    /***************************************************************************
     * Search for message id in current account
     * 
     * @param messageId
     *            The message id to search
     * @param rootFolder
     *            The root folder in which to search
     * @return The message
     **************************************************************************/
    ThreadVis.Cache.searchMessageByMsgId = function(messageId, rootFolder) {
        return this.searchInFolder(rootFolder, messageId);
    }

    /***************************************************************************
     * Search for message id in folder
     * 
     * @param folder
     *            The folder in which to search
     * @param messageId
     *            The message id to search
     * @return The message
     **************************************************************************/
    ThreadVis.Cache.searchInFolder = function(folder, messageId) {
        // first, search in this folder
        // check for enabled/disabled folders
        if (ThreadVis.checkEnabledAccountOrFolder(folder)) {
            // exclude virtual folders in search
            if (!(folder.flags & Components.interfaces.nsMsgFolderFlags.Virtual)
                    && !folder.noSelect) {
                msgDB = folder.msgDatabase;
                if (msgDB) {
                    msgHdr = msgDB.getMsgHdrForMessageID(messageId);
                    msgDB = null;
                    delete msgDB;
                }

                if (msgHdr) {
                    return msgHdr;
                }
            }
        }

        // if not found, loop over subfolders and search them
        if (folder.hasSubFolders) {
            var subfolders = folder.subFolders;
            var subfolder = null;
            var msgHdr = null;
            var msgDB = null;
            var currentFolderURI = "";

            var done = false;
            while (!done) {
                var currentItem = null;
                currentItem = subfolders.getNext();
                currentFolderURI = currentItem
                        .QueryInterface(Components.interfaces.nsIRDFResource).Value;
                subfolder = MailUtils.getFolderForURI(currentFolderURI, true);

                var foundHeader = this.searchInFolder(subfolder, messageId);
                subfolder = null;
                if (foundHeader) {
                    return foundHeader;
                }

                try {
                    done = !subfolders.hasMoreElements();
                } catch (e) {
                    done = true;
                }
            }
        }
        return null;
    }

    /***************************************************************************
     * Clear in-memory data
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Cache.clearData = function() {
        ThreadVis.Threader.reset();
    }

    return ThreadVis;
}(ThreadVis || {}));
