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
    this.openDatabases();
    this.accountCaches = {};
    this.callbacks = [];
    this.createAccountCaches();
    this.startPeriodicAccountChecking();
}



/** ****************************************************************************
 * Get cache array for message
 *
 * @param msg
 *          The message for which to get the cache
 * @return
 *          The cache array of all message ids
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getCache = function(msg) {
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
 *
 * @param msg
 *          The message
 * @param accountKey
 *          The account key of the account
 * @param references
 *          True to also add the references
 * @return
 *          An array of all message ids in the thread
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getCacheInternal = function(msg, accountKey,
    references) {
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
        var copyStatement = connection.createStatement(
            "SELECT childmsgid FROM copy WHERE parentmsgid = ?");
        try {
            while (statement.executeStep()) {
                var msgid = statement.getString(0);
                cache.push(msgid);
                // also add any copied messages to the cache here
                copyStatement.bindStringParameter(0, msgid);
                while (copyStatement.executeStep()) {
                    var childMsgId = copyStatement.getString(0);
                    cache.push(childMsgId);
                }
                copyStatement.reset();
            }
        } catch (ex) {
            THREADVIS.logger.log("Error while performing SQL statement", {
                "exception": ex});
        } finally {
            statement.reset();
            statement = null;
            copyStatement.reset();
            copyStatement = null;
        }
    }

    connection = null;
    delete connection;

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCacheInternal", {"read cache" : cache});
    }
    if (cache.length == 0 && references) {
        this.addToThreaderFromReferences(msg, accountKey);
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCacheInternal", {"action" : "end"});
    }

    return cache;
}



/** ****************************************************************************
 * Add all messages from references to threader
 *
 * @param msg
 *          The message from which to add all messages in references
 * @param accountKey
 *          The account key
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.addToThreaderFromReferences = function(msg,
    accountKey) {
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
 * Add all messages from cache to threader
 *
 * @param cache
 *          The cache array of all message ids to add to the threader
 * @param rootFolder
 *          The root folder in which to search the message ids
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.addToThreaderFromCache = function(cache,
    rootFolder) {
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
        } else {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_ERROR,
                    "addToThreaderFromCache", {"action" : "searchMessageByMsgId",
                    "message" : "message not found",
                    "msgid" : msgId,
                    "rootFolder" : rootFolder.URI});
            }
        }
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addToThreaderFromCache", {"action" : "end"});
    }
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
        if (! (folder.flags & THREADVIS.MSG_FOLDER_FLAG_VIRTUAL) &&
            !folder.noSelect) {
            msgDB = this.getMsgFolderDatabase(folder);
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

            var foundHeader = this.searchInFolder(subfolder, messageId);
            subfolder = null;
            delete subfolder;
            if (foundHeader) {
                return foundHeader;
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
 * Reset all caches for all messages in account
 *
 * @param accountKey
 *          The account key to reset
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.reset = function(accountKey) {
    // reset the cache for the account, i.e. delete the cache file and
    // re-create it
    // this also resets any update timestamps, as they are stored in the
    // database aswell
    this.openDatabase(accountKey, true);
}



/** ****************************************************************************
 * Get the connection for a specific account
 *
 * @param accountKey
 *          The account key
 * @return
 *          The database connection
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getDatabaseConnection = function(accountKey) {
    return this.databaseConnections[accountKey];
}



/** ****************************************************************************
 * Open/create thread databases for all accounts
 *
 * @return
 *          void
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
 *
 * @param accountKey
 *          The account key
 * @param forceRecreate
 *          True to force a recreate of the database
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.openDatabase = function(accountKey, forceRecreate) {
    var storageService = Components.classes["@mozilla.org/storage/service;1"]
        .getService(Components.interfaces.mozIStorageService);

    // try to create file
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsIFile);

    file.append("ThreadVis");
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
        if (connection.tableExists("updatetimestamps")) {
            connection.executeSimpleSQL("DROP TABLE updatetimestamps");
        }
        if (connection.tableExists("copy")) {
            connection.executeSimpleSQL("DROP TABLE copy");
        }
        if (connection.tableExists("cut")) {
            connection.executeSimpleSQL("DROP TABLE cut");
        }
    }

    // check for table
    if (! connection.tableExists("threads")) {
        connection.createTable("threads", "msgid string, threadid int");
        connection.executeSimpleSQL("CREATE UNIQUE INDEX threads_msgid_idx ON threads(msgid ASC)");
        connection.executeSimpleSQL("CREATE INDEX threads_threadid_idx ON threads(threadid ASC)");
    }
    if (! connection.tableExists("threadcounter")) {
        connection.createTable("threadcounter", "threadid int");
    }
    if (! connection.tableExists("updatetimestamps")) {
        connection.createTable("updatetimestamps", "folderuri string, updatetimestamp string");
    }
    if (! connection.tableExists("copy")) {
        connection.createTable("copy", "parentmsgid string, childmsgid string");
        connection.executeSimpleSQL("CREATE UNIQUE INDEX copy_tupel_idx ON copy(parentmsgid ASC, childmsgid ASC)");
        connection.executeSimpleSQL("CREATE INDEX copy_childmsgid_idx ON copy(childmsgid ASC)");
    }
    if (! connection.tableExists("cut")) {
        connection.createTable("cut", "parentmsgid string, childmsgid string");
        connection.executeSimpleSQL("CREATE UNIQUE INDEX cut_tupel_idx ON cut(parentmsgid ASC, childmsgid ASC)");
        connection.executeSimpleSQL("CREATE INDEX cut_childmsgid_idx ON cut(childmsgid ASC)");
    }

    this.databaseConnections[accountKey] = connection;
}



/** ****************************************************************************
 * Start a database transaction
 *
 * @param accountKey
 *          The account key
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.beginDatabaseTransaction = function(accountKey) {
    try {
        this.getDatabaseConnection(accountKey).beginTransaction();
    } catch (ex) {
    }
}



/** ****************************************************************************
 * End a database transaction
 *
 * @param accountKey
 *          The account key
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.commitDatabaseTransaction = function(accountKey) {
    try {
        this.getDatabaseConnection(accountKey).commitTransaction();
    } catch (ex) {
    }
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



/** ****************************************************************************
 * Check if message is already cached
 *
 * @param msgId
 *          The message id to be checked.
 * @param accountKey
 *          The accountKey of the account in which the message is stored.
 * @return
 *          True if message exists in database, false if not.
 ******************************************************************************/
ThreadVisNS.Cache.prototype.isCached = function(msgId, accountKey) {
    var connection = this.getDatabaseConnection(accountKey);
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
    }
    statement.reset();
    statement = null;
    delete statement;
    connection = null;
    delete connection;

    var isCached = threadId != null;

    return isCached;
}



/** ****************************************************************************
 * Check if any of the passed message ids exists in the database
 * if so, return the thread key
 *
 * @param accountKey
 *          The account key to create the database connection.
 * @param messageIds
 *          The array of all message ids in the thread.
 * @return
 *          An array of all thread ids, if they exists. Emtpty array otherwise.
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getThreadIdsForMessageIds = function(accountKey,
    messageIds) {

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getThreadIdsForMessageIds", {"action" : "start"});
    }

    var connection = this.getDatabaseConnection(accountKey);
    var statement = connection.createStatement(
        "SELECT threadid FROM threads WHERE msgid = ?");

    var count = 0;
    var threadIds = [];
    var duplicates = {};
    try {
        for (var i = 0; i < messageIds.length; i++) {
            count++;
            statement.bindStringParameter(0, messageIds[i]);
            if (statement.executeStep()) {
                var threadId = statement.getInt32(0);
                if (threadId) {
                    if (! duplicates[threadId]) {
                        threadIds.push(threadId);
                        duplicates[threadId] = true;
                    }
                }
            }
            statement.reset();
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
        connection = null;
        delete connection;
    }

    return threadIds;
}



/** ****************************************************************************
 * Create a new thread id
 *
 * @param accountKey
 *          The account key to create the database connection.
 * @return
 *          The new thread id.
 ******************************************************************************/
ThreadVisNS.Cache.prototype.createNewThreadId = function(accountKey) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "createNewThreadId", {"action" : "start"});
    }

    var connection = this.getDatabaseConnection(accountKey);
    var statement = connection.createStatement(
        "SELECT threadid FROM threadcounter");

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
        delete statement;
    }

    // check if thread id exists
    var exists = true;
    if (threadId == null) {
        threadId = 0;
        exists = false;
    }

    // increment thread id
    threadId++;

    // if thread id already existed, update to new value, otherwise
    // insert the first id
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
        delete statement;
    }

    connection = null;
    delete connection;

    return threadId;
}



/** ****************************************************************************
 * Write thread to database
 *
 * @param accountKey
 *          The account key to create the database connection.
 * @param threadId
 *          The thread id to write
 * @param threadIds
 *          Other thread ids to use. Add all messages from those
 *          thread ids as well.
 * @param messageIds
 *          The array of message ids to add to the thread
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.storeThread = function(accountKey, threadId,
    threadIds, messageIds) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "storeThread", {"action" : "start"});
    }

    var connection = this.getDatabaseConnection(accountKey);
    var statement = null;

    // first, fetch all additional messages from threadIds
    statement = connection.createStatement(
        "SELECT msgid FROM threads WHERE threadid = ?");
    for (var i = 0; i < threadIds.length; i++) {
        statement.bindInt32Parameter(0, threadIds[i]);
        try {
            while (statement.executeStep()) {
                var msgid = statement.getString(0);
                messageIds.push(msgid);
            }
        } catch (ex) {
            THREADVIS.logger.log("Error while performing SQL statement", {
                "exception": ex});
        }
        statement.reset();
    }
    statement.reset();
    statement = null;

    // delete all unused thread ids
    statement = connection.createStatement(
        "DELETE FROM threads WHERE threadid = ?");
    for (var i = 0; i < threadIds.length; i++) {
        try {
            statement.bindInt32Parameter(0, threadIds[i]);
            statement.execute();
            statement.reset();
        } catch (ex) {
            THREADVIS.logger.log("Error while performing SQL statement", {
                "exception": ex});
        }
    }
    statement.reset();
    statement = null;

    // for all message ids in the cache, write to database
    statement = connection.createStatement(
        "INSERT INTO threads (msgid, threadid) VALUES (?, ?)");
    var msgId = null;
    for (var i = 0; i < messageIds.length; i++) {
        try {
            statement.bindStringParameter(0, messageIds[i]);
            statement.bindInt32Parameter(1, threadId);
            statement.execute();
        } catch (ex) {
            // ignore any exceptions, as we might insert message ids multiple times
        }
    }
    statement.reset();
    statement = null;
}



/** ****************************************************************************
 * Get the update timestamp for a folder
 *
 * @param accountKey
 *          The account key to create the database connection.
 * @param folderuri
 *          The folder URI.
 * @return
 *          The last update timestamp.
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getFolderUpdateTimestamp = function(accountKey,
    folderuri) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getFolderUpdateTimestamp", {"action" : "start"});
    }

    var connection = this.getDatabaseConnection(accountKey);
    var statement = connection.createStatement(
        "SELECT updatetimestamp FROM updatetimestamps WHERE folderuri = ?");

    var updatetimestamp = 0;
    try {
        statement.bindStringParameter(0, folderuri);
        if (statement.executeStep()) {
            updatetimestamp = parseInt(statement.getString(0));
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
        connection = null;
        delete connection;
    }

    return updatetimestamp;
}



/** ****************************************************************************
 * Set the update timestamp for a folder
 *
 * @param accountKey
 *          The account key to create the database connection.
 * @param folderuri
 *          The folder URI.
 * @param timestamp
 *          The timestamp to set.
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.setFolderUpdateTimestamp = function(accountKey,
    folderuri, timestamp) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "setFolderUpdateTimestamp", {"action" : "start"});
    }

    var connection = this.getDatabaseConnection(accountKey);

    var statement = connection.createStatement(
        "DELETE FROM updatetimestamps WHERE folderuri = ?");
    try {
        statement.bindStringParameter(0, folderuri);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    statement = connection.createStatement(
        "INSERT INTO updatetimestamps (folderuri, updatetimestamp) VALUES (?,?)");

    var updatetimestamp = 0;
    try {
        statement.bindStringParameter(0, folderuri);
        statement.bindStringParameter(1, timestamp);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
        connection = null;
        delete connection;
    }

    return updatetimestamp;
}



/** ****************************************************************************
 * Create account caches for all accounts
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.createAccountCaches = function() {
    // loop over all accounts
    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = accountManager.accounts;

    for (var i = 0; i < accounts.Count(); i++) {
        // check enabled account
        if (this.isAccountEnabled(accounts.GetElementAt(i))) {
            this.accountCaches[accounts.GetElementAt(i).key] =
                new ThreadVisNS.AccountCache(this, accounts.GetElementAt(i));
        }
    }
    accounts = null;
    delete accounts;
    accountManager = null;
    delete accountManager;
}



/** ****************************************************************************
 * Get all account caches
 *
 * @return
 *          All account caches
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getAccountCaches = function() {
    return this.accountCaches;
}



/** ****************************************************************************
 * Check all accounts
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.checkAllAccounts = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "checkAllAccounts", {"action" : "start"});
    }
    for (var accountKey in this.accountCaches) {
        this.checkAccount(accountKey);
    }
}



/** ****************************************************************************
 * Start periodic checking of all accounts for new messages to cache
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.startPeriodicAccountChecking = function() {
    var interval = this.threadvis.preferences.getPreference(
        this.threadvis.preferences.PREF_CACHE_CHECK_INTERVAL);

    if (interval > 0) {
        var ref = this;
        setInterval(function() {
            ref.checkAllAccounts();
        }, interval);
    }

    // below is broken in TB3b2
    /*var notificationListener = {
        itemAdded: function(item) {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "new item found", {"item" : item});
            }
        }
    }
    var notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
        .getService(Components.interfaces.nsIMsgFolderNotificationService);
    notificationService.addListener(notificationListener,
        notificationService.allMsgNotifications);

    delete notificationService;
    notificationService = null;
    */

    var ref = this;
    // add folder listener, so that we can add newly received messages
    var folderListener = {
        OnItemAdded: function(parentItem, item, view) {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "onItemAdded", {item: item});
            }

            if (item instanceof Components.interfaces.nsIMsgDBHdr) {
                var server = item.folder.server;
                var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(server);
                var accountKey = account.key;
                account = null;
                delete account;
                server = null;
                delete server;

                ref.checkAccount(accountKey, item.folder);
            }
        },
        OnItemRemoved: function(parentItem, item, view) {
        },
        OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
        OnItemEvent: function(folder, event) {}
    }

    var gMailSession = Components.classes["@mozilla.org/messenger/services/session;1"]
        .getService(Components.interfaces.nsIMsgMailSession);
    gMailSession.AddFolderListener(folderListener,
        Components.interfaces.nsIFolderListener.all);
}



/** ****************************************************************************
 * Check account for any uncached messages
 *
 * @param accountKey
 *          The accountkey to check
 * @param folder
 *          An optional folder to check. If not set, all folders are checked.
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.checkAccount = function(accountKey, folder) {
    var accountCache = this.accountCaches[accountKey];
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "checkAccount", {
                accountKey: accountKey,
                folder: folder,
                accountCache: accountCache
            }
        );
    }
    if (accountCache) {
        var ref = this;
        accountCache.register("onCheckDone", function() {
            accountCache.cacheUncachedMessages();
        });
        accountCache.register("onCacheDone", function() {
            ref.onCacheDone();
        });
        accountCache.check(folder);
    }
}



/** ****************************************************************************
 * Is account enabled
 *
 * @param account
 *          The account
 * @return
 *          True if the account is enabled
 ******************************************************************************/
ThreadVisNS.Cache.prototype.isAccountEnabled = function(account) {
    if (this.threadvis.preferences.getPreference(
        this.threadvis.preferences.PREF_DISABLED_ACCOUNTS) != ""
            && this.threadvis.preferences.getPreference(
                this.threadvis.preferences.PREF_DISABLED_ACCOUNTS)
                    .indexOf(" " + account.key + " ") > -1) {
        return false;
    }
    return true;
}



/** ****************************************************************************
 * Cancel all caching activity
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.cancel = function() {
    for (var key in this.accountCaches) {
        this.accountCaches[key].cancel();
    }
}



/** ****************************************************************************
 * Called after caching is done
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.onCacheDone = function() {
    this.notify("onCacheDone");
}



/** ****************************************************************************
 * Register for callback
 *
 * @param event
 *          The event for which to register
 * @param callback
 *          The function to call
 ******************************************************************************/
ThreadVisNS.Cache.prototype.register = function(event, callback) {
    if (! this.callbacks[event]) {
        this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
}



/** ****************************************************************************
 * Notify callbacks
 *
 * @param event
 *          The event to notify
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.notify = function(event) {
    if (! this.callbacks[event]) {
        return;
    }
    for (var i = 0; i < this.callbacks[event].length; i++) {
        this.callbacks[event][i]();
    }
    this.callbacks[event] = null;
    delete this.callbacks[event];
}



/** ****************************************************************************
 * Cache a single uncached message
 *
 * @param message
 *          The message to cache
 * @param accountKey
 *          The account key
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.cacheMessage = function(message, accountKey) {
    // get the references header
    var messageIds = [];
    messageIds.push(message.messageId);
    // TODO also evaluate in-reply-to header!
    messageIds = messageIds.concat((new ThreadVisNS.References(
        message.getStringProperty("references"))).getReferences());
    // try to get existing thread ids for any of the message-ids in references
    var threadIds = this.getThreadIdsForMessageIds(accountKey, messageIds);

    // re-use first thread id or create new one if none was found
    var threadId = null;
    if (threadIds.length == 0) {
        // no thread id was found, create a new one
        threadId = this.createNewThreadId(accountKey);
    } else {
        // use first thread id
        threadId = threadIds[0];
    }

    // write cache data
    this.storeThread(accountKey, threadId, threadIds, messageIds);
}



/** ****************************************************************************
 * Check for user-defined thread. Look up a new parent of this child message id.
 *
 * @param accountKey
 *          The current account key.
 * @param childMsgId
 *          The message id of the child to look up
 * @return
 *          The message id of the new parent, if one exists. Null otherwise
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getCopy = function(accountKey, childMsgId) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCopy", {"action" : "start",
                "childMsgId" : childMsgId});
    }

    var connection = this.getDatabaseConnection(accountKey);

    var statement = connection.createStatement(
        "SELECT parentmsgid FROM copy WHERE childmsgid = ?");

    var parentMsgId = null;
    try {
        statement.bindStringParameter(0, childMsgId);
        if (statement.executeStep()) {
            parentMsgId = statement.getString(0);
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCopy", {"action" : "end",
                "childMsgId" : childMsgId,
                "parentMsgId" : parentMsgId});
    }

    return parentMsgId;
}



/** ****************************************************************************
 * Check for user-defined thread. Look up a new parent of this child message id.
 *
 * @param accountKey
 *          The current account key.
 * @param childMsgId
 *          The message id of the child to look up
 * @return
 *          The message id of the new parent, if one exists. Null otherwise
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getCut = function(accountKey, childMsgId) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCut", {"action" : "start"});
    }

    var connection = this.getDatabaseConnection(accountKey);

    var statement = connection.createStatement(
        "SELECT parentmsgid FROM cut WHERE childmsgid = ?");

    var parentMsgId = null;
    try {
        statement.bindStringParameter(0, childMsgId);
        if (statement.executeStep()) {
            parentMsgId = statement.getString(0);
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "getCut", {"action" : "end",
                "childMsgId" : childMsgId,
                "parentMsgId" : parentMsgId});
    }

    return parentMsgId;
}



/** ****************************************************************************
 * Add a new user-defined thread entry. ChildMsgId is a new child of
 * parentMsgId.
 *
 * @param accountKey
 *          The current account key.
 * @param childMsgId
 *          The message id of the child.
 * @param parentMsgId
 *          The message id of the new parent
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.addCopy = function(accountKey, childMsgId,
    parentMsgId) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addCopy", {"action" : "start",
                "childMsgId" : childMsgId,
                "parentMsgId" : parentMsgId});
    }

    var connection = this.getDatabaseConnection(accountKey);

    // first check if this connection exists as a cut, if so, simply delete it
    var statement = connection.createStatement(
        "DELETE FROM cut WHERE childmsgid = ? AND parentmsgid = ?");
    try {
        statement.bindStringParameter(0, childMsgId);
        statement.bindStringParameter(1, parentMsgId);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    var statement = connection.createStatement(
        "INSERT INTO copy (childmsgid, parentmsgid) VALUES (?, ?)");
    try {
        statement.bindStringParameter(0, childMsgId);
        statement.bindStringParameter(1, parentMsgId);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    // also add message id to cache of this thread
    var threadId = null;
    var statement = connection.createStatement(
        "SELECT threadid FROM threads WHERE msgid = ?");
    try {
        statement.bindStringParameter(0, parentMsgId);
        if (statement.executeStep()) {
            threadId = statement.getInt32(0);
        }
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    if (threadId) {
        var statement = connection.createStatement(
            "INSERT INTO threads (msgid, threadid) VALUES (?, ?)");
        try {
            statement.bindStringParameter(0, childMsgId);
            statement.bindInt32Parameter(1, threadId);
            statement.execute();
        } catch (ex) {
            // ignore any exceptions, as we might insert message ids multiple times
        } finally {
            statement.reset();
            statement = null;
            delete statement;
        }
    }
}



/** ****************************************************************************
 * Add a new user-defined thread entry. ChildMsgId is no longer a child of
 * parentMsgId.
 *
 * @param accountKey
 *          The current account key.
 * @param childMsgId
 *          The message id of the child.
 * @param parentMsgId
 *          The message id of the old parent
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Cache.prototype.addCut = function(accountKey, childMsgId,
    parentMsgId) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addCut", {"action" : "start",
                "childMsgId" : childMsgId,
                "parentMsgId" : parentMsgId});
    }

    var connection = this.getDatabaseConnection(accountKey);

    // first check if this connection exists as a copy, if so, simply delete it
    var statement = connection.createStatement(
        "DELETE FROM copy WHERE childmsgid = ? AND parentmsgid = ?");
    try {
        statement.bindStringParameter(0, childMsgId);
        statement.bindStringParameter(1, parentMsgId);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    var statement = connection.createStatement(
        "INSERT INTO cut (childmsgid, parentmsgid) VALUES (?, ?)");
    try {
        statement.bindStringParameter(0, childMsgId);
        statement.bindStringParameter(1, parentMsgId);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }

    // also delete message id from cache of this thread
    // don't do this, keep original information!
    /*
    var statement = connection.createStatement(
        "DELETE FROM threads WHERE msgid = ?");
    try {
        statement.bindStringParameter(0, childMsgId);
        statement.execute();
    } catch (ex) {
        THREADVIS.logger.log("Error while performing SQL statement", {
            "exception": ex});
    } finally {
        statement.reset();
        statement = null;
        delete statement;
    }
    */
}



/** ****************************************************************************
 * Get the message database for a folder. This has changed in Thunderbird 3
 * (changeset 1714:649e4c6a0e38), it is no longer a function, but an attribute.
 *
 * @param folder
 *          The folder for which to fetch the message database.
 * @return
 *          The message database for the folder.
 ******************************************************************************/
ThreadVisNS.Cache.prototype.getMsgFolderDatabase = function(folder) {
    // first, check the attribute
    var db = folder.msgDatabase;
    if (db) {
        return db;
    }

    // no database, try getMsgDatabase
    try {
        db = folder.getMsgDatabase(null);
        if (db) {
            return db;
        }
    } catch (ex) {
    }

    // still no database, try updateFolder
    try {
        folder.updateFolder(null);
    } catch (ex) {
    }

    // again, try attribute
    db = folder.msgDatabase;
    if (db) {
        return db;
    }

    // still no luck, try a last getMsgDatabase
    try {
        db = folder.getMsgDatabase(null);
        if (db) {
            return db;
        }
    } catch (ex) {
    }

    return null;
}
