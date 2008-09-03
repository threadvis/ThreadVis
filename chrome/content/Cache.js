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



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Create cache object
 ******************************************************************************/
ThreadVisNS.Cache = function(threadvis) {
    this.threadvis = threadvis;
    this.cacheBuildCount = 0;
    this.updatingCache = false;
    this.addedMessages = new Array();
    this.newMessages = new Array();
    this.openDatabases();
}



/** ****************************************************************************
 * Get cache array for message
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getCache = function(msg, accountKey) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCache", {"action" : "start"});
    }
    var server = msg.folder.server;
    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(server);

    var cache = this.getCacheInternal(msg, account.key, false);

    account = null;
    delete account;
    server = null;
    delete server;

    this.threadvis.getThreader().thread();
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCache", {"action" : "end", "cache" : cache});
    }
    return cache;
}



/** ****************************************************************************
 * Get cache array for message (internal)
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getCacheInternal = function(msg, accountKey, references) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCacheInternal", {"action" : "start"});
    }

    var cache = [];
    var connection = this.getDatabaseConnection(accountKey);
    var statement = connection.createStatement(
        "SELECT threadid FROM threads WHERE msgid = ?");
    statement.bindStringParameter(0, msg.messageId);

    var threadId = null;
    try {
        if (statement.executeStep()) {
            threadId = statement.getInt32(0);
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
    }

    if (threadId != null) {
        statement = connection.createStatement(
            "SELECT msgid FROM threads WHERE threadid = ?");
        statement.bindInt32Parameter(0, threadId);
        try {
            while (statement.executeStep()) {
                var msgid = statement.getString(0);
                cache.push(msgid);
            }
        } catch (ex) {
            THREADVIS.logger.log("Error while performing SQL statement", {
                "exception": ex});
        } finally {
            statement.reset;
            statement = null;
        }
    }

    connection = null;
    delete connection;

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCacheInternal", {"read cache" : cache});
    }
    if (cache.length > 0) {
        this.addToThreaderFromCache(cache, msg.folder.rootFolder);
    } else {
        if (references) {
            this.addToThreaderFromReferences(msg, accountKey);
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
ThreadVisNS.Cache.prototype.addToThreaderFromReferences = function(msg, accountKey) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addToThreaderFromReferences", {"action" : "start"});
    }

    var rootFolder = msg.folder.rootFolder;
    this.threadvis.addMessage(msg);
    var references = (new ThreadVisNS.References(msg.getStringProperty("references")))
        .getReferences();

    for (var i = 0; i < references.length; i++) {
        var ref = references[i];
        // fixxme rootfolder
        if (this.threadvis.getThreader().hasMessage(ref)) {
            continue;
        }
        var refMessage = this.searchMessageByMsgId(ref, rootFolder);
        if (refMessage) {
            this.getCacheInternal(refMessage, accountKey, true);
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
ThreadVisNS.Cache.prototype.updateCache = function(container, msg) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateCache", {"action" : "start"});
    }
    var topcontainer = container.getTopContainer();
    var cache = topcontainer.getCache();

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateCache", {"cache" : cache});
    }

    var server = msg.folder.server;
    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(server);

    this.putCache(cache, account.key);

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateCache", {"action" : "end"});
    }
}



/** ****************************************************************************
 * Recursivly put cache string in all messages
 ******************************************************************************/
ThreadVisNS.Cache.prototype.putCache = function(cache, accountKey) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "putCache", {"action" : "start",
            "cache" : cache,
            "accountKey" : accountKey});
    }

    if (cache.length == 0) {
        return;
    }

    var connection = this.getDatabaseConnection(accountKey);
    var msgId = cache[0];
    var statement = connection.createStatement(
        "SELECT threadid FROM threads WHERE msgid = ?");
    statement.bindStringParameter(0, msgId);

    var threadId = null;
    try {
        if (statement.executeStep()) {
            threadId = statement.getInt32(0);
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
    }

    // if threadId exists, reuse it, otherwise create a new id
    if (threadId == null) {
        statement = connection.createStatement(
            "SELECT threadid FROM threadcounter");
        try {
            if (statement.executeStep()) {
                threadId = statement.getInt32(0);
            }
        } catch (ex) {
            THREADVIS.logger.log("Error while performing SQL statement", {
                "exception": ex});
        } finally {
            statement.reset();
            statement = null;
        }
        var exists = true;
        if (threadId == null) {
            threadId = 0;
            exists = false;
        }
        threadId++;

        if (exists) {
            statement = connection.createStatement(
                "UPDATE threadcounter SET threadid = ?");
        } else {
            statement = connection.createStatement(
                "INSERT INTO threadcounter (threadid) VALUES (?)");
        }
        statement.bindInt32Parameter(0, threadId);
        try {
            statement.execute();
        } catch (ex) {
            THREADVIS.logger.log("Error while performing SQL statement", {
                "exception": ex});
        } finally {
            statement.reset();
            statement = null;
        }
    }

    // clear cache for this threadid
    statement = connection.createStatement(
        "DELETE FROM threads WHERE threadid = ?");
    try {
        statement.bindInt32Parameter(0, threadId);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
    }

    // for all message ids in the cache, write to database
    statement = connection.createStatement(
        "INSERT INTO threads (msgid, threadid) VALUES (?, ?)");
        var msgId = null;
    try {
        while ((msgId = cache.pop()) != null) {
            statement.bindStringParameter(0, msgId);
            statement.bindInt32Parameter(1, threadId);
            statement.execute();
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
    }

    connection = null;
    delete connection;

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "putCache", {"action" : "end"});
    }
}



/** ****************************************************************************
 * Add all messages from cache to threader
 ******************************************************************************/
ThreadVisNS.Cache.prototype.addToThreaderFromCache = function(cache, rootFolder) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addToThreaderFromCache", {"action" : "start"});
    }

    for (var i = 0; i < cache.length; i++) {
        var msgId = cache[i];
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
ThreadVisNS.Cache.prototype.searchMessageByMsgId = function(messageId, rootFolder) {
    return this.searchInSubFolder(rootFolder, messageId);
}



/** ****************************************************************************
 * Search for message id in subfolder
 ******************************************************************************/
ThreadVisNS.Cache.prototype.searchInSubFolder = function(folder, messageId) {
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
                        // again, do not call updateFolder, this is bad
                        //subfolder.updateFolder(msgWindow);
                        try {
                            msgDB = subfolder.getMsgDatabase(msgWindow);
                        } catch (ex) {
                            // can we do this here?
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
ThreadVisNS.Cache.prototype.updateNewMessages = function(message, doVisualise) {
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
ThreadVisNS.Cache.prototype.updateNewMessagesInternal = function(message, doVisualise,
    accountKey, rootFolder) {

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "updateNewMessagesInternal", {"action" : "start",
            "message" : message.messageId});
    }

    this.threadvis.setStatus(null, {updateCache: {message: message,
        accountKey: accountKey}});

    // check for already running update
    var ref = this;
    if (this.updatingCache) {
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
                "updatedate" : new Date(updateTimestamp / 1000),
                "looking for message date" : message.date,
                "messagedate" : new Date(message.date / 1000)
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
            try {
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                        "updateNewMessagesInternal", {"action" : "new search"});
                }
            } catch (ex) {
                THREADVIS.logger.log("exception", {"exception" : ex});
            }
            ref.cacheBuildCount++;
        },
        onSearchDone: function(status) {
            try {
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                        "updateNewMessagesInternal", {"action" : "search done",
                            "count" : count,
                            "status" : status});
                }
            } catch (ex) {
                THREADVIS.logger.log("exception", {"exception" : ex});
            }
            delete searchSession;
            var util = new ThreadVisNS.Util();
            util.registerListener({
                onItem: function(item, count, remaining, timeRemaining) {
                    try {
                        if (count % 10 == 0) {
                            ref.threadvis.setStatus("Adding: " + count + " [" + remaining +
                                "] " + timeRemaining);
                        }
                    } catch (ex) {
                        THREADVIS.logger.log("exception", {"exception" : ex});
                    }
                    // if item is invalid
                    if (! (item instanceof Components.interfaces.nsIMsgDBHdr)) {
                        THREADVIS.logger.log("updateNewMessagesInternal", {
                            "error" : "not a valid item"});
                        return;
                    }
                    try {
                        ref.threadvis.addMessage(item);
                    } catch (ex) {
                        THREADVIS.logger.log("exception", {"exception" : ex});
                    }
                    // also add messages from cache to threader, since we re-write
                    // the cache
                    // TODO: this is bad as it works around the queue we set up
                    // don't add messages to the threader within the function, but return
                    // a list of messages and add them to the queue here!
                    try {
                        ref.getCacheInternal(item, accountKey, true);
                    } catch (ex) {
                        THREADVIS.logger.log("exception", {"exception" : ex});
                    }
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
                    try {
                        ref.onSearchDone(message, doVisualise, accountKey,
                            rootFolder, newUpdateTimestamp);
                    } catch (ex) {
                        THREADVIS.logger.log("exception", {"exception" : ex});
                    }
                }
            });
            try {
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                        "updateNewMessagesInternal", {"action" : "process",
                        "count" : ref.addedMessages.length});
                }
            } catch (ex) {
                THREADVIS.logger.log("exception", {"exception" : ex});
            }
            util.process(ref.addedMessages);
        },
        onSearchHit: function(header, folder) {
            try {
                if (count % 10 == 0) {
                    ref.threadvis.setStatus(
                        ref.threadvis.strings.getString("cache.building.status") + count);
                }
            } catch (ex) {
                THREADVIS.logger.log("exception", {"exception" : ex});
            }
            count++;
            try {
                ref.newMessages.push(header);
                ref.addedMessages.push(header);
            } catch (ex) {
                THREADVIS.logger.log("exception pushing headers", {"exception" : ex});
            }
        }
    });

    searchSession.search(null);
}



/** ****************************************************************************
 * Search for new messages is done, start threading
 ******************************************************************************/
ThreadVisNS.Cache.prototype.onSearchDone = function(message, doVisualise,
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


/** ****************************************************************************
 * After messages have been threaded, check to see if message exists
 ******************************************************************************/
ThreadVisNS.Cache.prototype.finishCache = function(message, doVisualise, accountKey,
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

            // reset in-memory data
            this.clearData();

            // set last update timestamp just before this message
            // set -10 minutes
            var messageUpdateTimestamp = message.date - 1000000*60*10;
            this.setLastUpdateTimestamp(accountKey,
                messageUpdateTimestamp);

            this.threadvis.setStatus(null, {updateCache: {rethread: true}});

            this.updatingCache = false;
            this.updateNewMessagesInternal(message, doVisualise,
                accountKey, rootFolder);
            return;
        }

        var ref = this;
        this.updateNewMessagesWriteCache(accountKey, function() {
            if (doVisualise) {
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

        // clear in-memory data
        this.clearData();

        // set last update timestamp just before this message
        // -10 minutes
        var messageUpdateTimestamp = message.date - 1000000 * 60;

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

        this.threadvis.setStatus(null, {updateCache: {rethread: true}});

        this.updatingCache = false;
        this.setLastUpdateTimestamp(accountKey, messageUpdateTimestamp);
        this.updateNewMessagesInternal(message, doVisualise, accountKey,
            rootFolder);
    }
}


/** ****************************************************************************
 * Get the last update timestamp for the given account
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getLastUpdateTimestamp = function(accountKey) {
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
ThreadVisNS.Cache.prototype.setLastUpdateTimestamp = function(accountKey, timestamp) {
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
ThreadVisNS.Cache.prototype.addSubFolders = function(searchSession, folder) {
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
                        // NS_ERROR_NOT_INITIALIZED can happen here
                        // i suppose we shouldn't do that at all
                        //nextFolder.updateFolder(msgWindow);
                        var searchScope = nextFolder.server.searchScope;
                        
                        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                            "addSubFolders", {"URI" : nextFolder.URI,
                                "flags" : nextFolder.flags});
                        }
                        
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
ThreadVisNS.Cache.prototype.reset = function(accountKey) {
    // reset update timestamp
    this.setLastUpdateTimestamp(accountKey, 0);

    // reset the cache for the account, i.e. delete the cache file and
    // re-create it
    this.openDatabase(accountKey, true);
}



/** ****************************************************************************
 * Write cache to disk for all new messages
 ******************************************************************************/
ThreadVisNS.Cache.prototype.updateNewMessagesWriteCache = function(accountKey, callback) {
    var util = new ThreadVisNS.Util();
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
            var cache = topContainer.getCache();
            if (! ref.updatedTopContainers[cache]) {
                ref.updatedTopContainers[cache] = true;
                ref.updateCache(container, item, accountKey);
                ref.threadvis.getThreader().removeThread(topContainer);
            }
            cache = null;
            delete cache;
            delete container;
            delete topContainer;
        },
        onFinished: function() {
            ref.threadvis.setStatus("Cache done");
            ref.commitDatabaseTransaction(accountKey);
            ref.clearData();
            ref.threadvis.setStatus(null, {updateCache: null});
            callback();
        }
    });
    // start transaction before writing messages
    this.beginDatabaseTransaction(accountKey);
    util.process(this.newMessages);
}



/** ****************************************************************************
 * Get the connection for a specific account
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getDatabaseConnection = function(account) {
    return this.databaseConnections[account];
}


/** ****************************************************************************
 * Open/create thread databases for all accounts
 ******************************************************************************/
ThreadVisNS.Cache.prototype.openDatabases = function() {
    this.databaseConnections = new Object();
    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);

    var accounts = accountManager.accounts;
    for (var i = 0; i < accounts.Count(); i++)  {
        var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
        this.openDatabase(account.key);
        delete account;
        account = null;
    }
}



/** ****************************************************************************
 * Open/create thread database
 ******************************************************************************/
ThreadVisNS.Cache.prototype.openDatabase = function(accountKey, forceRecreate) {
    var storageService = Components.classes["@mozilla.org/storage/service;1"]
        .getService(Components.interfaces.mozIStorageService);

    // try to create file
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsIFile);

    file.append("extensions");
    if (! file.exists()) {
        file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    file.append("{A23E4120-431F-4753-AE53-5D028C42CFDC}");
    if (! file.exists()) {
        file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    file.append("cache");
    if (! file.exists()) {
        file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    // use one file per account to allow for selective cache clear
    // and to avoid corruption
    file.append(accountKey + ".cache.sqlite");

    var connection = storageService.openDatabase(file);

    // drop tables if forceRecreate
    if (forceRecreate) {
        if (connection.tableExists("threads")) {
            connection.executeSimpleSQL("DROP TABLE threads");
        }
        if (connection.tableExists("threadcounter")) {
            connection.executeSimpleSQL("DROP TABLE threadcounter");
        }
    }

    var newCache = false;
    // check for table
    if (! connection.tableExists("threads")) {
        connection.createTable("threads", "msgid string, threadid int");
        connection.executeSimpleSQL("CREATE UNIQUE INDEX msgid_idx ON threads(msgid ASC)");
        connection.executeSimpleSQL("CREATE INDEX threadid_idx ON threads(threadid ASC)");
        newCache = true;
    }
    if (! connection.tableExists("threadcounter")) {
        connection.createTable("threadcounter", "threadid int");
        newCache = true;
    }

    // if new cache file, reset update timestamp so that all messages get
    // re-cached
    if (newCache) {
        this.setLastUpdateTimestamp(accountKey, 0);
    }
    this.databaseConnections[accountKey] = connection;
}



/** ****************************************************************************
 * Start a database transaction
 ******************************************************************************/
ThreadVisNS.Cache.prototype.beginDatabaseTransaction = function(accountKey) {
    this.getDatabaseConnection(accountKey).beginTransaction();
}



/** ****************************************************************************
 * End a database transaction
 ******************************************************************************/
ThreadVisNS.Cache.prototype.commitDatabaseTransaction = function(accountKey) {
    this.getDatabaseConnection(accountKey).commitTransaction();
}



/** ****************************************************************************
 * Clear in-memory data
 ******************************************************************************/
ThreadVisNS.Cache.prototype.clearData = function() {
    delete this.newMessages;
    delete this.addedMessages;
    delete this.updatedTopContainers;
    this.newMessages = new Array();
    this.addedMessages = new Array();
    this.updatedTopContainers = new Object();
    this.threadvis.getThreader().reset();
}



/** ****************************************************************************
 * Return if cache is currently updating
 ******************************************************************************/
ThreadVisNS.Cache.prototype.isUpdating = function() {
    return this.updatingCache;
}



/** ****************************************************************************
 * Utility class that provides background processing
 ******************************************************************************/
ThreadVisNS.Util = function() {
    this.listener = null;
    this.count = 0;
    this.startTime = 0;
}



/** ****************************************************************************
 * Register listener
 ******************************************************************************/
ThreadVisNS.Util.prototype.registerListener = function(listener) {
    this.listener = listener;
}



/** ****************************************************************************
 * Process an array of elements
 ******************************************************************************/
ThreadVisNS.Util.prototype.process = function(array) {
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




/** ****************************************************************************
 * Format remaining time to process array
 ******************************************************************************/
ThreadVisNS.Util.prototype.formatTimeRemaining = function(remaining) {
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