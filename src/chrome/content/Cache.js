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
 * Copyright (C) 2007, 2008, 2009 Alexander C. Hubmann-Haidvogel
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



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



Components.utils.import("resource://app/modules/gloda/public.js");



/** ****************************************************************************
 * Create cache object
 *
 * @param threadvis
 *          The threadvis object
 * @return
 *          A new cache object
 ******************************************************************************/
ThreadVisNS.Cache = function(threadvis) {
    this.threadvis = threadvis;
}



/** ****************************************************************************
 * Get cache array for message
 *
 * @param msg
 *          The message for which to get the cache
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getCache = function(msg, callback) {
    var ref = this;
    Gloda.getMessageCollectionForHeader(msg, {
        onItemsAdded: function(items, collection) {
        },
        onQueryCompleted: function(collection) {
            var found = collection.items.length > 0;
            if (found) {
                var message = collection.items[0];
                message.conversation.getMessagesCollection({
                    onItemsAdded: function(items, collection) {
                    },
                    onQueryCompleted: function(collection) {
                        for (var i = 0; i < collection.items.length; i++) {
                            //cache.push(collection.items[i].headerMessageID)
                            var message = ref.createMessage(collection.items[i]);
                            ref.addToThreader(message);
                        }
                        callback();
                    }
                }, null);
            } else {
                alert("no gloda message for: " + msg);
            }
        }
    }, null);
}



/** ****************************************************************************
 * Create a message
 *
 * @param glodaMessage
 *          The gloda message to add
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.createMessage = function(glodaMessage) {
    var subject = glodaMessage.subject;
    var messageId = glodaMessage.headerMessageID;
    var date = glodaMessage.date;
    var folderURI = glodaMessage.folderURI;

    var dbMessage = glodaMessage.folderMessage;
    var references = dbMessage.getStringProperty("references");
    var from = dbMessage.mime2DecodedAuthor;
    var fromIdentity = glodaMessage.from;

    // check if msg is a sent mail
    var issent = false;

    // it is sent if it is stored in a folder that is marked as sent (if enabled)
    issent |= dbMessage.folder.isSpecialFolder(
                Components.interfaces.nsMsgFolderFlags.SentMail, true) &&
        this.threadvis.preferences.getPreference(
                this.threadvis.preferences.PREF_SENTMAIL_FOLDERFLAG);
    // or it is sent if the sender address is a local identity (if enabled)
    issent |= this.threadvis.sentMailIdentities[fromIdentity.value] == true &&
        this.threadvis.preferences.getPreference(
                this.threadvis.preferences.PREF_SENTMAIL_IDENTITY);

    var message = new ThreadVisNS.Message(subject, from, fromIdentity,
        messageId, date, folderURI, references, issent);

    return message;
}



/** ****************************************************************************
 * Add a message to the threader
 *
 * @param message
 *          The message to ad
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.addToThreader = function(message) {
    this.threadvis.getThreader().addMessage(message);
}



/** ****************************************************************************
 * Search for message id in current account
 *
 * @param messageId
 *          The message id to search
 * @param rootFolder
 *          The root folder in which to search
 * @return
 *          The message
 ******************************************************************************/
ThreadVisNS.Cache.prototype.searchMessageByMsgId = function(messageId,
    rootFolder) {
    return this.searchInFolder(rootFolder, messageId);
}



/** ****************************************************************************
 * Search for message id in folder
 *
 * @param folder
 *          The folder in which to search
 * @param messageId
 *          The message id to search
 * @return
 *          The message
 ******************************************************************************/
ThreadVisNS.Cache.prototype.searchInFolder = function(folder, messageId) {
    // first, search in this folder
    // check for enabled/disabled folders
    if (THREADVIS.checkEnabledAccountOrFolder(folder)) {
        // exclude virtual folders in search
        if (! (folder.flags & Components.interfaces.nsMsgFolderFlags.Virtual) &&
            !folder.noSelect) {
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
        while(!done) {
            var currentItem = null;
            currentItem = subfolders.getNext();
            currentFolderURI = currentItem
                .QueryInterface(Components.interfaces.nsIRDFResource).Value;
            subfolder = MailUtils.getFolderForURI(currentFolderURI, true);

            var foundHeader = this.searchInFolder(subfolder, messageId);
            subfolder = null;
            delete subfolder;
            if (foundHeader) {
                return foundHeader;
            }

            try {
                done = ! subfolders.hasMoreElements();
            } catch(e) {
                done = true;
            }
        }
    }
    return null;
}



/** ****************************************************************************
 * Clear in-memory data
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.clearData = function() {
    this.threadvis.getThreader().reset();
}
