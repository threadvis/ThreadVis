/** ****************************************************************************
 * Cache.js
 *
 * (c) 2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * Implements cache for threaded messages
 * Store message ids of thread via setStringProperty in msf file
 *
 * $Id$
 ******************************************************************************/
function Cache(threadvis) {
    this.threadvis = threadvis;
    this.cacheBuildCount = 0;
    this.updatingCache = false;
    this.newMessages = new Array();
}



/** ****************************************************************************
 * Get cache string for message
 * Read X-ThreadVis-Cache
 ******************************************************************************/
Cache.prototype.getCache = function(msg) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCache", {"action" : "start"});
    }
    var cache = this.getCacheInternal(msg, false);
    this.threadvis.getThreader().thread();
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCache", {"action" : "end", "cache" : cache});
    }
    return cache;
}



/** ****************************************************************************
 * Get cache string for message (internal)
 ******************************************************************************/
Cache.prototype.getCacheInternal = function(msg, references) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCacheInternal", {"action" : "start"});
    }
    var cache = "";
    cache = msg.getStringProperty("X-ThreadVis-Cache");
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCacheInternal", {"read cache" : cache});
    }
    if (cache != "") {
        this.addToThreaderFromCache(cache, msg.folder.rootFolder);
    } else {
        if (references) {
            this.addToThreaderFromReferences(msg);
        }
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCacheInternal", {"action" : "end"});
    }

    return cache;
}



/** ****************************************************************************
 * Add all messages from references to threader
 ******************************************************************************/
Cache.prototype.addToThreaderFromReferences = function(msg) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addToThreaderFromReferences", {"action" : "start"});
    }

    var rootFolder = msg.folder.rootFolder;
    this.threadvis.addMessage(msg);
    var references = (new References(msg.getStringProperty("references")))
        .getReferences();
    for (var i = 0; i < references.length; i++) {
        var ref = references[i];
        // fixxme rootfolder
        if (this.threadvis.getThreader().hasMessage(ref)) {
            continue;
        }
        var refMessage = this.searchMessageByMsgId(ref, rootFolder);
        if (refMessage) {
            this.getCacheInternal(refMessage, true);
        }
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addToThreaderFromReferences", {"action" : "end"});
    }
}



/** ****************************************************************************
 * Get cache string for container, store for all messages in thread
 ******************************************************************************/
Cache.prototype.updateCache = function(container, rootFolder) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateCache", {"action" : "start"});
    }
    var topcontainer = container.getTopContainer();
    var cache = topcontainer.getCache();
    cache = "[" + cache + "]";

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateCache", {"cache" : cache});
    }

    this.putCache(topcontainer, cache, rootFolder);

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateCache", {"action" : "end"});
    }
}



/** ****************************************************************************
 * Recursivly put cache string in all messages
 ******************************************************************************/
Cache.prototype.putCache = function(container, cache, rootFolder) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "putCache", {"action" : "start",
            "container" : container,
            "cache" : cache});
    }
    if (! container.isDummy()) {
        var msgId = container.getMessage().getId();
        var msg = this.searchMessageByMsgId(msgId, rootFolder);
        if (msg) {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "putCache", {"cache" : cache});
            }
            msg.setStringProperty("X-ThreadVis-Cache", cache);
        }
    }

    var child = null;
    for (child = container.getChild(); child != null; child = child.getNext()) {
        this.putCache(child, cache, rootFolder);
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "putCache", {"action" : "end"});
    }
}



/** ****************************************************************************
 * Add all messages from cache to threader
 ******************************************************************************/
Cache.prototype.addToThreaderFromCache = function(cache, rootFolder) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addToThreaderFromCache", {"action" : "start"});
    }
    var elements = eval('(' + cache + ')');

    for (var i = 0; i < elements.length; i++) {
        var msgId = elements[i];
        if (this.threadvis.getThreader().hasMessage(msgId)) {
            continue;
        }
        var msg = this.searchMessageByMsgId(msgId, rootFolder);
        if (msg != null) {
            this.threadvis.addMessage(msg);
        }
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addToThreaderFromCache", {"action" : "end"});
    }
}



/** ****************************************************************************
 * Search for message id in current account
 ******************************************************************************/
Cache.prototype.searchMessageByMsgId = function(messageId, rootFolder) {
    return this.searchInSubFolder(rootFolder, messageId);
}



/** ****************************************************************************
 * Search for message id in subfolder
 ******************************************************************************/
Cache.prototype.searchInSubFolder = function(folder, messageId) {
    if (folder.hasSubFolders) {
        var subfolders = folder.GetSubFolders();
        var subfolder = null;
        var msgHdr = null;
        var msgDB = null;
        var currentFolderURI = "";

        var done = false;
        while(!done) {
            currentFolderURI = subfolders.currentItem()
                .QueryInterface(Components.interfaces.nsIRDFResource).Value;
            subfolder = GetMsgFolderFromUri(currentFolderURI);

            if (currentFolderURI.substring(1,7) != "news://") {
                msgHdr = this.searchInSubFolder(subfolder, messageId);
            }

            if (!msgHdr) {
                try {
                    msgDB = subfolder.getMsgDatabase(msgWindow);
                } catch (ex) {
                    subfolder.updateFolder(msgWindow);
                    msgDB = subfolder.getMsgDatabase(msgWindow);
                }
                msgHdr = msgDB.getMsgHdrForMessageID(messageId);
            }

            if (msgHdr) {
                return msgHdr;
            }

            try {
                subfolders.next();
            } catch(e) {
                done = true;
            }
        }
    }
    return null;
}



/** ****************************************************************************
 * Periodically update cache with new messages
 ******************************************************************************/
Cache.prototype.updateNewMessages = function(message, doVisualise) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateNewMessages", {"action" : "start",
                "message" : message.messageId});
    }

    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(message.folder.server);

    this.updateNewMessagesInternal(message, doVisualise, 
        account.key, message.folder.rootFolder);

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateNewMessages", {"action" : "end"});
    }
}



/** ****************************************************************************
 * Periodically update cache with new messages
 ******************************************************************************/
Cache.prototype.updateNewMessagesInternal = function(message, doVisualise,
    accountKey, rootFolder) {

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateNewMessagesInternal", {"action" : "start"});
    }

    // check for already running update
    var ref = this;
    if (this.updatingCache) {
        setTimeout(function() {
                ref.updateNewMessagesInternal(message, doVisualise, accountKey,
                    rootFolder);
            }, 1000);
        return;
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateNewMessagesInternal", {"action" : "start2"});
    }

    this.updatingCache = true;

    this.threadvis.setStatus(
        this.threadvis.strings.getString("cache.building.start"));
    var searchSession = 
        Components.classes["@mozilla.org/messenger/searchSession;1"]
        .createInstance(Components.interfaces.nsIMsgSearchSession);
    var searchTerm = searchSession.createTerm();
    searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Date;
    searchTerm.op = Components.interfaces.nsMsgSearchOp.IsAfter;

    var termValue = searchTerm.value;
    termValue.attrib = searchTerm.attrib;

    // get last update timestamp from preferences
    var updateTimestamp = this.getLastUpdateTimestamp(accountKey);

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
            "updateNewMessagesInternal", {
                "updatetimestamp" : updateTimestamp,
                "date" : new Date(updateTimestamp / 1000),
                "looking for message date" : message.date,
                "date" : new Date(message.date / 1000)
            });
    }

    termValue.date = updateTimestamp;
    searchTerm.value = termValue;

    searchSession.appendTerm(searchTerm);
    this.addSubFolders(searchSession, rootFolder);

    var newUpdateTimestamp = (new Date()).getTime() * 1000;
    var ref = this;
    var count = 0;
    searchSession.registerListener({
        onNewSearch: function() {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "updateNewMessagesInternal", {"action" : "new search"});
            }
            ref.cacheBuildCount++;
        },
        onSearchDone: function(status) {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "updateNewMessagesInternal", {"action" : "search done"});
            }
            ref.threadvis.setStatus("");
            ref.setLastUpdateTimestamp(accountKey, newUpdateTimestamp);

            ref.threadvis.threader.thread();
            var container = ref.threadvis.getThreader()
                .findContainer(message.messageId);

            if (container) {
                if (container.isDummy()) {
                    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                        "updateNewMessages", {"action" : "dummy container found"});
                    }
                    // current message still not found
                    // somehow it is not cached altough it should have been
                    // reset last update timestamp to date if this message
                    ref.threadvis.setStatus(
                        ref.threadvis.strings.getString("cache.error"));

                    // set last update timestamp just before this message
                    // set -10 minutes
                    var messageUpdateTimestamp = message.date - 1000000*60*10;

                    // if we already tried to build cache for this message
                    // reset to 0 just in case
                    if (ref.cacheBuildCount > 1) {
                        messageUpdateTimestamp = 0;
                    }
                    ref.setLastUpdateTimestamp(accountKey,
                        messageUpdateTimestamp);

                    ref.updatingCache = false;
                    ref.updateNewMessagesInternal(message, doVisualise,
                        accountKey, rootFolder);
                    return;
                }

                ref.updateNewMessagesWriteCache(rootFolder, function() {
                    if (doVisualise) {
                        ref.threadvis.visualiseMessage(message);
                    }
                });

                ref.cacheBuildCount = 0;
                ref.updatingCache = false;

            } else {
                // current message still not found
                // somehow it is not cached altough it should have been
                // reset last update timestamp to date if this message
                ref.threadvis.setStatus(
                    ref.threadvis.strings.getString("cache.error"));

                // set last update timestamp just before this message
                // -10 minutes
                var messageUpdateTimestamp = message.date - 1000000 * 60;

                // if we already tried to build cache for this message
                // reset to 0 just in case
                if (ref.cacheBuildCount > 1) {
                    messageUpdateTimestamp = 0;
                    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_ERROR,
                            "updateNewMessages", {
                                "action" : "cache error, message not found. reset timestamp to 0.",
                                "updateTimestamp" : messageUpdateTimestamp,
                                "date" : new Date(updateTimestamp / 1000),
                                "subject" : message.mime2DecodedSubject,
                                "autor" : message.mime2DecodedAutor,
                                "messageId" : message.messageId,
                                "messagedate" : message.date
                            });
                    }
                }
                if (ref.cacheBuildCount > 2) {
                    ref.threadvis.setStatus(
                        ref.threadvis.strings.getString("cache.error"));
                    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_ERROR,
                            "updateNewMessages", {
                                "action" : "cache error, message not found.",
                                "subject" : message.mime2DecodedSubject,
                                "autor" : message.mime2DecodedAutor,
                                "messageId" : message.messageId
                            });
                    }
                    ref.cacheBuildCount = 0;
                    ref.updatingCache = false;
                    return;
                }

                ref.updatingCache = false;
                ref.setLastUpdateTimestamp(accountKey, messageUpdateTimestamp);
                ref.updateNewMessagesInternal(message, doVisualise, accountKey,
                    rootFolder);
            }
        },
        onSearchHit: function(header, folder) {
            ref.threadvis.setStatus(
                ref.threadvis.strings.getString("cache.building.status") + count);
            ref.threadvis.addMessage(header);
            // also add messages from cache to threader, since we re-write
            // the cache
            ref.getCacheInternal(header, true);
            //ref.getCacheInternal(header, false);
            count++;
            ref.newMessages.push(header);
            if (ref.cacheBuildCount <=1) {
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                        "updateNewMessages", {"action" : "hit",
                            "subject" : header.mime2DecodedSubject,
                            "author" : header.mime2DecodedAuthor,
                            "messageId" : header.messageId});
                }
            }
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "updateNewMessages", {"action" : "hit",
                        "subject" : header.mime2DecodedSubject,
                        "author" : header.mime2DecodedAuthor,
                        "messageId" : header.messageId});
            }
        }
    });

    searchSession.search(null);
}



/** ****************************************************************************
 * Get the last update timestamp for the given account
 ******************************************************************************/
Cache.prototype.getLastUpdateTimestamp = function(accountKey) {
    var pref = this.threadvis.preferences.getPreference(
        this.threadvis.preferences.PREF_CACHE_LASTUPDATETIMESTAMP);
    var entries = pref.split(",");
    var timestamps = new Object();
    for (var key in entries) {
        var entry = entries[key];
        if (entry) {
            var splits = entry.split("=");
            timestamps[splits[0]] = splits[1];
        }
    }
    if (timestamps[accountKey]) {
        return timestamps[accountKey];
    } else {
        return 0;
    }
}



/** ****************************************************************************
 * Set the last update timestamp for the given account
 ******************************************************************************/
Cache.prototype.setLastUpdateTimestamp = function(accountKey, timestamp) {
    var pref = this.threadvis.preferences.getPreference(
        this.threadvis.preferences.PREF_CACHE_LASTUPDATETIMESTAMP);
    var entries = pref.split(",");
    var timestamps = new Object();
    for (var key in entries) {
        var entry = entries[key];
        var splits = entry.split("=");
        timestamps[splits[0]] = splits[1];
    }
    timestamps[accountKey] = timestamp;

    var output = "";
    for (var key in timestamps) {
        if (key) {
            output += key + "=" + timestamps[key] + ",";
        }
    }

    output = output.substring(0, output.length - 1);
    this.threadvis.preferences.setPreference(
        this.threadvis.preferences.PREF_CACHE_LASTUPDATETIMESTAMP,
        output, this.threadvis.preferences.PREF_STRING);
}



/** ****************************************************************************
 * Add all subfolders of account to searchquery
 ******************************************************************************/
Cache.prototype.addSubFolders = function(searchSession, folder) {
    if (folder.hasSubFolders) {
        var subFolderEnumerator = folder.GetSubFolders();
        var done = false;
        while (! done) {
            var next = subFolderEnumerator.currentItem();
            if (next) {
                var nextFolder = next.QueryInterface(
                    Components.interfaces.nsIMsgFolder);
                if (nextFolder && ! (nextFolder.flags 
                    & MSG_FOLDER_FLAG_VIRTUAL)) {
                    if (!nextFolder.noSelect &&
                        this.threadvis.checkEnabledAccountOrFolder(nextFolder)) {
                        var searchScope = nextFolder.server.searchScope;
                        if (searchScope == nsMsgSearchScope.onlineMail) {
                            // ??? FIXXME
                            // imap messages are only found when using offline mail
                            searchSession.addScopeTerm(nsMsgSearchScope.offlineMail,
                                nextFolder);
                        } else if (searchScope == nsMsgSearchScope.news) {
                            // ??? FIXME
                            // newsgroups messages are only found when using localNews
                            searchSession.addScopeTerm(nsMsgSearchScope.localNews,
                                nextFolder);
                        } else {
                            searchSession.addScopeTerm(searchScope, nextFolder);
                        }
                    }
                    this.addSubFolders(searchSession, nextFolder);
                }
            }
            try {
                subFolderEnumerator.next();
            } catch (ex) {
                done = true;
            }
        }
    }
}



/** ****************************************************************************
 * Reset all caches for all messages in account
 ******************************************************************************/
Cache.prototype.reset = function(key) {
    // get account for key
    var accountManager = Components
        .classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var account = accountManager.getAccount(key)

    var counter = 0;
    if (account instanceof Components.interfaces.nsIMsgAccount) {
        // reset update timestamp
        this.setLastUpdateTimestamp(account.key, 0);

        // reset all caches for all messages
        var rootFolder = account.incomingServer.rootFolder;
        var folders = this.resetGetAllFolders(rootFolder);
        for (var j = 0; j < folders.length; j++) {
            counter = this.resetAllMessages(folders[j], counter);
        }
    }
}



/** ****************************************************************************
 * Get all subfolders starting from "folder" as array
 ******************************************************************************/
Cache.prototype.resetGetAllFolders = function(folder) {
    var folderEnumerator = folder.GetSubFolders();
    var currentFolder = null;
    var folders = new Array();

    while (true) {
        try {
            currentFolder = folderEnumerator.currentItem();
        } catch (Exception) {
            break;
        }

        if (currentFolder instanceof Components.interfaces.nsIMsgFolder) {
            if (! (currentFolder.flags & MSG_FOLDER_FLAG_VIRTUAL)) {
                folders.push(currentFolder);
            }
        }

        if (currentFolder.hasSubFolders) {
            folders.concat(this.resetGetAllFolders(currentFolder));
        }

        try {
            folderEnumerator.next();
        } catch (Exception) {
            break;
        }
    }
    return folders;
}



/** ****************************************************************************
 * Reset cache for all messages in folder
 ******************************************************************************/
Cache.prototype.resetAllMessages = function(folder, counter) {
    var enumerator = folder.getMessages(null);
    while (enumerator.hasMoreElements()) {
        var header = enumerator.getNext();
        if (header instanceof Components.interfaces.nsIMsgDBHdr) {
            counter++;
            this.threadvis.setStatus(
                this.threadvis.strings.getString("cache.reset.status") + counter);
            header.setStringProperty("X-ThreadVis-Cache", "");
        }
    }
    return counter;
}


/** ****************************************************************************
 * Write cache to disk for all new messages
 ******************************************************************************/
Cache.prototype.updateNewMessagesWriteCache = function(rootFolder, callback) {
    var util = new Util();
    var ref = this;
    this.updatedTopContainers = new Object();
    util.registerListener({
        onItem: function(item, count, remaining) {
            var container = ref.threadvis.getThreader().findContainer(item.messageId);
            var topContainer = container.getTopContainer();
            ref.threadvis.setStatus(
                ref.threadvis.strings.getString("cache.update.status") + count + " [" + remaining + "]");
            if (! ref.updatedTopContainers[topContainer]) {
                ref.updatedTopContainers[topContainer] = true;
                ref.updateCache(container, rootFolder);
            }
        },
        onFinished: function() {
            ref.threadvis.setStatus("Cache done");
            delete this.newMessages;
            this.newMessages = new Array();
            callback();
        }
    });
    util.process(this.newMessages);
}



function Util() {
    var listener = null;
    this.count = 0;
}

Util.prototype.registerListener = function(listener) {
    this.listener = listener;
}

Util.prototype.process = function(array) {
    var elem = array.pop();
    var remaining = array.length;
    var ref = this;
    if (elem) {
        this.count++;
        this.listener.onItem(elem, this.count, remaining);
        setTimeout(function() {ref.process(array);}, 1);
    } else {
        this.listener.onFinished();
    }
}
