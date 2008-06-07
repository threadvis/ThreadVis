/** ****************************************************************************
 * Cache.js
 *
 * (c) 2007 Alexander C. Hubmann
 * (c) 2007-2008 Alexander C. Hubmann-Haidvogel
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
    this.addedMessages = new Array();
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
        delete msg;
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
        // Seamonkey < 2 and Thunderbird <= 2 use GetSubFolders
        // (which returns a nsIEnumerator)
        // so we have to use .currentItem() and .next()
        // Thunderbird 3 and Seamonkey 2 use subFolders (which returns a nsISimpleEnumerator
        // so we have to use .getNext() and .hasMoreElements()
        var subfolders = null;
        if (folder.GetSubFolders) {
            subfolders = folder.GetSubFolders();
        }
        if (folder.subFolders) {
            subfolders = folder.subFolders;
        }
        var subfolder = null;
        var msgHdr = null;
        var msgDB = null;
        var currentFolderURI = "";

        var done = false;
        while(!done) {
            var currentItem = null;
            if (subfolders.currentItem) {
                currentItem = subfolders.currentItem();
            }
            if (subfolders.getNext) {
                currentItem = subfolders.getNext();
            }
            currentFolderURI = currentItem
                .QueryInterface(Components.interfaces.nsIRDFResource).Value;
            subfolder = GetMsgFolderFromUri(currentFolderURI);

            // check for enabled/disabled folders
            if (THREADVIS.checkEnabledAccountOrFolder(subfolder)) {
                // exclude virtual folders in search
                if (! (subfolder.flags & MSG_FOLDER_FLAG_VIRTUAL)) {
                    if (currentFolderURI.substring(1,7) != "news://") {
                        msgHdr = this.searchInSubFolder(subfolder, messageId);
                    }

                    if (!msgHdr) {
                        subfolder.updateFolder(msgWindow);
                        try {
                            msgDB = subfolder.getMsgDatabase(msgWindow);
                        } catch (ex) {
                            subfolder.updateFolder(msgWindow);
                            msgDB = subfolder.getMsgDatabase(msgWindow);
                        }
                        msgHdr = msgDB.getMsgHdrForMessageID(messageId);
                    }

                    delete msgDB;

                    if (msgHdr) {
                        return msgHdr;
                    }
                }
            }

            try {
                if (subfolders.next) {
                    subfolders.next();
                }
                if (subfolders.hasMoreElements) {
                    done = ! subfolders.hasMoreElements();
                }
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

    delete account;

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
        /*setTimeout(function() {
                ref.updateNewMessagesInternal(message, doVisualise, accountKey,
                    rootFolder);
            }, 5000);*/
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
            delete searchSession;
            var util = new Util();
            util.registerListener({
                onItem: function(item, count, remaining, timeRemaining) {
                    if (count % 10 == 0) {
                        ref.threadvis.setStatus("Adding: " + count + " [" + remaining +
                            "] " + timeRemaining);
                    }
                    ref.threadvis.addMessage(item);
                    // also add messages from cache to threader, since we re-write
                    // the cache
                    ref.getCacheInternal(item, true);
                    //ref.getCacheInternal(header, false);
                    if (ref.cacheBuildCount <=1) {
                        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                                "updateNewMessages", {"action" : "hit",
                                "subject" : item.mime2DecodedSubject,
                                "author" : item.mime2DecodedAuthor,
                                "messageId" : item.messageId});
                        }
                    }
                    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                            "updateNewMessages", {"action" : "hit",
                            "subject" : item.mime2DecodedSubject,
                            "author" : item.mime2DecodedAuthor,
                        "messageId" : item.messageId});
                    }
                },
                onFinished: function() {
                    ref.onSearchDone(message, doVisualise, accountKey,
                        rootFolder, newUpdateTimestamp);
                }
            });
            util.process(ref.addedMessages);
        },
        onSearchHit: function(header, folder) {
            if (count % 10 == 0) {
                ref.threadvis.setStatus(
                    ref.threadvis.strings.getString("cache.building.status") + count);
            }
            count++;
            ref.newMessages.push(header);
            ref.addedMessages.push(header);
        }
    });

    searchSession.search(null);
}



Cache.prototype.onSearchDone = function(message, doVisualise,
    accountKey, rootFolder, newUpdateTimestamp) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateNewMessagesInternal", {"action" : "search done"});
    }
    this.threadvis.setStatus("");
    this.setLastUpdateTimestamp(accountKey, newUpdateTimestamp);

    var ref = this;
    this.threadvis.threader.threadBackground(function() {
        ref.finishCache(message, doVisualise, accountKey, rootFolder,
            newUpdateTimestamp);
    });
}


Cache.prototype.finishCache = function(message, doVisualise, accountKey,
    rootFolder, newUpdateTimestamp) {
    var container = this.threadvis.getThreader()
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
            this.threadvis.setStatus(
                this.threadvis.strings.getString("cache.error"));

            // set last update timestamp just before this message
            // set -10 minutes
            var messageUpdateTimestamp = message.date - 1000000*60*10;

            // if we already tried to build cache for this message
            // reset to 0 just in case
            /*if (this.cacheBuildCount > 1) {
                messageUpdateTimestamp = 0;
            }*/
            this.setLastUpdateTimestamp(accountKey,
                messageUpdateTimestamp);

            this.updatingCache = false;
            this.updateNewMessagesInternal(message, doVisualise,
                accountKey, rootFolder);
            return;
        }

        var ref = this;
        this.updateNewMessagesWriteCache(rootFolder, function() {
            if (doVisualise) {
                //ref.threadvis.visualiseMessage(message);
                ref.threadvis.setSelectedMessage();
            }
            ref.updatingCache = false;
            ref.cacheBuildCount = 0;
        });

    } else {
        // current message still not found
        // somehow it is not cached altough it should have been
        // reset last update timestamp to date if this message
        this.threadvis.setStatus(
            this.threadvis.strings.getString("cache.error"));

        // set last update timestamp just before this message
        // -10 minutes
        var messageUpdateTimestamp = message.date - 1000000 * 60;

        // if we already tried to build cache for this message
        // reset to 0 just in case
        /*if (this.cacheBuildCount > 1) {
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
        }*/
        if (this.cacheBuildCount > 2) {
            this.threadvis.setStatus(
                this.threadvis.strings.getString("cache.error"));
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_ERROR,
                        "updateNewMessages", {
                            "action" : "cache error, message not found.",
                            "subject" : message.mime2DecodedSubject,
                            "autor" : message.mime2DecodedAutor,
                            "messageId" : message.messageId
                });
            }
            this.cacheBuildCount = 0;
            this.updatingCache = false;
            return;
        }

        this.updatingCache = false;
        this.setLastUpdateTimestamp(accountKey, messageUpdateTimestamp);
        this.updateNewMessagesInternal(message, doVisualise, accountKey,
            rootFolder);
    }
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
        // Seamonkey < 2 and Thunderbird <= 2 use GetSubFolders
        // (which returns a nsIEnumerator)
        // so we have to use .currentItem() and .next()
        // Thunderbird 3 and Seamonkey 2 use subFolders (which returns a nsISimpleEnumerator
        // so we have to use .getNext() and .hasMoreElements()
        var subFolderEnumerator = null;
        if (folder.GetSubFolders) {
            subFolderEnumerator = folder.GetSubFolders();
        }
        if (folder.subFolders) {
            subFolderEnumerator = folder.subFolders;
        }
        var done = false;
        while (! done) {
            var next = null;
            if (subFolderEnumerator.currentItem) {
                next = subFolderEnumerator.currentItem();
            }
            if (subFolderEnumerator.getNext) {
                next = subFolderEnumerator.getNext();
            }
            if (next) {
                var nextFolder = next.QueryInterface(
                    Components.interfaces.nsIMsgFolder);
                if (nextFolder && ! (nextFolder.flags 
                    & MSG_FOLDER_FLAG_VIRTUAL)) {
                    if (!nextFolder.noSelect &&
                        this.threadvis.checkEnabledAccountOrFolder(nextFolder)) {
                        nextFolder.updateFolder(msgWindow);
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
                if (subFolderEnumerator.next) {
                    subFolderEnumerator.next();
                }
                if (subFolderEnumerator.hasMoreElements) {
                    done = ! subFolderEnumerator.hasMoreElements();
                }
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
    // Seamonkey < 2 and Thunderbird <= 2 use GetSubFolders
    // (which returns a nsIEnumerator)
    // so we have to use .currentItem() and .next()
    // Thunderbird 3 and Seamonkey 2 use subFolders (which returns a nsISimpleEnumerator
    // so we have to use .getNext() and .hasMoreElements()
    var folderEnumerator = null;
    if (folder.GetSubFolders) {
        folderEnumerator = folder.GetSubFolders();
    }
    if (folder.subFolders) {
        folderEnumerator = folder.subFolders;
    }
    var currentFolder = null;
    var folders = new Array();

    while (true) {
        try {
            if (folderEnumerator.currentItem) {
                currentFolder = folderEnumerator.currentItem();
            }
            if (folderEnumerator.getNext) {
                currentFolder = folderEnumerator.getNext();
            }
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
            if (folderEnumerator.next) {
                folderEnumerator.next();
            }
            if (folderEnumerator.hasMoreElements &&
                ! folderEnumerator.hasMoreElements()) {
                break;
            }
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
        onItem: function(item, count, remaining, timeRemaining) {
            var container = ref.threadvis.getThreader().findContainer(item.messageId);
            if (container == null) {
                return;
            }
            var topContainer = container.getTopContainer();
            if (count % 10 == 0) {
                ref.threadvis.setStatus(
                    ref.threadvis.strings.getString("cache.update.status")
                        + count + " [" + remaining + "] " + timeRemaining);
            }
            if (! ref.updatedTopContainers[topContainer]) {
                ref.updatedTopContainers[topContainer] = true;
                ref.updateCache(container, rootFolder);
                ref.threadvis.getThreader().removeThread(topContainer);
            }
            delete container;
            delete topContainer;
        },
        onFinished: function() {
            ref.threadvis.setStatus("Cache done");
            delete ref.newMessages;
            delete ref.addedMessages;
            delete ref.updatedTopContainers;
            ref.newMessages = new Array();
            ref.addedMessages = new Array();
            ref.updatedTopContainers = new Object();
            ref.threadvis.getThreader().reset();
            callback();
        }
    });
    util.process(this.newMessages);
}



function Util() {
    this.listener = null;
    this.count = 0;
    this.startTime = 0;
}

Util.prototype.registerListener = function(listener) {
    this.listener = listener;
}

Util.prototype.process = function(array) {
    if (this.startTime == 0) {
        this.startTime = (new Date()).getTime();
    }
    var currentTime = (new Date()).getTime();
    var elem = array.pop();
    var remaining = array.length;
    var timeRemaining = ((currentTime - this.startTime) / this.count) * remaining;
    var ref = this;
    if (elem) {
        this.count++;
        this.listener.onItem(elem, this.count, remaining,
            this.formatTimeRemaining(timeRemaining));
        setTimeout(function() {ref.process(array);}, 0);
    } else {
        delete array;
        delete elem;
        this.listener.onFinished();
    }
}

Util.prototype.formatTimeRemaining = function(remaining) {
    // remaining is in miliseconds
    remaining = remaining - (remaining % 1000);
    remaining = remaining / 1000;
    var seconds = remaining % 60;
    remaining = remaining - seconds;
    remaining = remaining / 60;
    var minutes = remaining % 60;
    remaining = remaining - minutes;
    remaining = remaining / 60;
    var hours = remaining % 24;
    remaining = remaining - hours;
    remaining = remaining / 24;
    var days = remaining % 365;
    remaining = remaining - days;
    remaining = remaining / 365;
    var years = remaining;

    var strings = THREADVIS.strings;

    var label = "";
    if (years == 1) {
        label += years + " " +
            strings.getString("visualisation.timedifference.year");
    }
    if (years > 1) {
        label += years + " " +
            strings.getString("visualisation.timedifference.years");
    }
    if (days == 1) {
        label += " " + days + " " +
            strings.getString("visualisation.timedifference.day");
    }
    if (days > 1) {
        label += " " + days + " " +
            strings.getString("visualisation.timedifference.days");
    }
    if (hours == 1) {
        label += " " + hours + " " +
            strings.getString("visualisation.timedifference.hour");
    }
    if (hours > 1) {
        label += " " + hours + " " +
            strings.getString("visualisation.timedifference.hours");
    }
    if (minutes == 1) {
        label += " " + minutes + " " +
            strings.getString("visualisation.timedifference.minute");
    }
    if (minutes > 1) {
        label += " " + minutes + " " +
            strings.getString("visualisation.timedifference.minutes");
    }
    if (seconds == 1) {
        label += " " + seconds + " " +
            strings.getString("visualisation.timedifference.second");
    }
    if (seconds > 1) {
        label += " " + seconds + " " +
            strings.getString("visualisation.timedifference.seconds");
    }

    return label;
}