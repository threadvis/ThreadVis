/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2008 Alexander C. Hubmann-Haidvogel
 *
 * Implements cache for a single folder
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Create the folder cache object
 *
 * @param cache
 *          The cache object
 * @param folder
 *          The folder to observe
 * @param accountKey
 *          The key of the account of the folder (needed to open a database
 *          connection)
 * @return
 *          A new folder cache object
 ******************************************************************************/
ThreadVisNS.FolderCache = function(cache, folder, accountKey) {
    this.SEARCH_TIMEOUT = 10000;

    this.cache = cache;
    this.folder = folder;
    this.accountKey = accountKey;
    this.searchSession = null;
    this.messageProcessor = null;
    this.messages = [];
    this.messageCount = 0;
    this.working = false;
    this.doneSearching = false;
    this.doneProcessing = false;
    this.processingCount = 0;
    this.processingRemaining = 0;
    this.processingRemainingTime = 0;

    this.callbacks = [];
}



/** ****************************************************************************
 * Check a single folder for any messages that have no been cached
 * Trigger a search for all messages.
 * Check if any messages need updating.
 * Notify any observers of updates.
 *
 * @param timestamp
 *          Optional timestamp to use when checking for messages. Used
 *          instead of stored last update timestamp.
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.check = function(timestamp) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "FolderCache", {"action" : "start checking folder",
            "folder" : this.folder.URI});
    }

    if (this.working) {
        return;
    }

    this.working = true;
    this.doneSearching = false;

    // cancel an already running search session
    this.resetSearchSession();

    // clear messages
    this.messages = null;
    delete this.messages;
    this.messages = [];
    this.processingCount = 0;
    this.processingRemaining = 0;
    this.processingRemainingTime = 0;

    this.searchSession = 
        Components.classes["@mozilla.org/messenger/searchSession;1"]
        .createInstance(Components.interfaces.nsIMsgSearchSession);

    var searchTerm = this.searchSession.createTerm();
    searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Date;
    searchTerm.op = Components.interfaces.nsMsgSearchOp.IsAfter;

    var termValue = searchTerm.value;
    termValue.attrib = searchTerm.attrib;
    if (timestamp) {
        termValue.date = timestamp;
    } else {
        termValue.date = this.getUpdateTimestamp();
    }
    searchTerm.value = termValue;
    this.searchSession.appendTerm(searchTerm);

    var searchScope = this.folder.server.searchScope;
    if (searchScope == nsMsgSearchScope.onlineMail) {
        // ??? FIXXME
        // imap messages are only found when using offline mail
        this.searchSession.addScopeTerm(nsMsgSearchScope.offlineMail,
            this.folder);
    } else if (searchScope == nsMsgSearchScope.news) {
        // ??? FIXME
        // newsgroups messages are only found when using localNews
        this.searchSession.addScopeTerm(nsMsgSearchScope.localNews,
            this.folder);
    } else {
        this.searchSession.addScopeTerm(searchScope, this.folder);
    }

    this.searchSession.registerListener(this);
    try {
        this.searchSession.search(null);
    } catch (ex) {
    }
}



/** ****************************************************************************
 * Reset the search session
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.resetSearchSession = function() {
    if (this.searchSession) {
        this.searchSession.interruptSearch();
        this.searchSession.unregisterListener(this);
        delete this.searchSession;
        this.searchSession = null;
    }
}



/** ****************************************************************************
 * Reset the message processor
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.resetMessageProcessor = function() {
    if (this.messageProcessor) {
        this.messageProcessor.cancel();
        delete this.messageProcessor;
        this.messageProcessor = null;
    }
}



/** ****************************************************************************
 * Callback from nsIMsgSearchSession when a new search has been started.
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.onNewSearch = function() {
    this.handleSearchTimeout(true);
}



/** ****************************************************************************
 * Callback from nsIMsgSearchSession when a new message has been found
 *
 * @param header
 *          The found message header
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.onSearchHit = function(header) {
    this.messages.push(header);
    this.handleSearchTimeout(true);

    // TODO manage mail in junks of settable size
    /*var cacheJunkSize = 1000;
    if (this.messages.length >= cacheJunkSize) {
        alert("junking");
        this.resetSearchSession();
    }*/
}



/** ****************************************************************************
 * Callback from nsIMsgSearchSession when the search has finished
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.onSearchDone = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "FolderCache", {"action" : "search for all messages done",
            "folder" : this.folder.URI});
    }

    this.handleSearchTimeout(false);
    this.resetSearchSession();
    this.doneSearching = true;
    this.working = false;
    this.notify("onCheckDone");
}



/** ****************************************************************************
 * Search timeout handling
 *
 * @param restart
 *          True to restart timer
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.handleSearchTimeout = function(restart) {
    clearTimeout(this.searchTimeout);
    if (restart) {
        var ref = this;
        this.searchTimeout = setTimeout(function () {
            THREADVIS.logger.log("Search for new messages timed out after 10 seconds.", {});
            ref.searchSession.interruptSearch();
            ref.onSearchDone();
        }, this.SEARCH_TIMEOUT);
    }
}



/** ****************************************************************************
 * Process collected messages from search
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.processMessages = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "FolderCache", {"action" : "process all found messages",
            "found messages" : this.messages.length,
            "folder" : this.folder.URI});
    }

    if (this.working || ! this.doneSearching) {
        return;
    }
    this.working = true;
    this.doneProcessing = false;

    this.resetMessageProcessor();
    this.messageProcessor = new ThreadVisNS.Util.Processor();
    this.messageProcessor.registerListener(this);

    // sort the message list by date
    this.messages.sort(function(a, b) {
        return a.date - b.date;
    });
    this.messageProcessor.setList(this.messages);
    this.messageProcessor.start();
}



/** ****************************************************************************
 * Process a single message
 *
 * @param item
 *          The message to process
 * @param count
 *          The running count of messages
 * @param remaining
 *          The number of remaining messages
 * @param timeRemaining
 *          An estimate of the remaining time
 * @param callback
 *          Call this when processing of the message is done
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.onItem = function(item, count, remaining,
    timeRemaining, callback) {
    // if item is invalid
    if (! (item instanceof Components.interfaces.nsIMsgDBHdr)) {
        return;
    }
    var isCached = this.cache.isCached(item.messageId, this.accountKey);
    if (! isCached) {
        // cache message now
        this.cache.cacheMessage(item, this.accountKey);
        // set update timestamp to the date of this message
        this.setUpdateTimestamp(item.date, item);
        if (count % 10 == 0) {
            THREADVIS.setStatus(this.folder.URI + " " +
                THREADVIS.strings.getString("cache.update.status") + " " +
                    count + " [" + remaining + "] " + timeRemaining);
        }
    } else {
        // set update timestamp nevertheless
        this.setUpdateTimestamp(item.date, item);
    }

    this.processingCount = count;
    this.processingRemaining = remaining;
    this.processingRemainingTime = timeRemaining;

    callback();
}



/** ****************************************************************************
 * Processing done
 *
 * @param totalCount
 *          The total count of processed messages
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.onFinished = function(totalCount) {
    this.messageCount = totalCount;
    this.processingDone();
}



/** ****************************************************************************
 * Processing done
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.processingDone = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "FolderCache", {"action" : "processing of all messages done",
            "folder" : this.folder.URI});
    }

    this.messages = [];
    this.working = false;
    this.doneProcessing = true;
    this.notify("onCachingDone");
}



/** ****************************************************************************
 * Check the status
 *
 * @return
 *          object.working
 *              True if cache is currently updating
 *          object.doneSearching
 *              True if searching is done
 *          object.doneProcessing
 *              True if processing is done
 *          object.messages
 *              The array of all found messages
 *          object.processingDome
 *              Number of already processed messages
 *          object.processingRemaining
 *              Number of remaining messages to be processed
 *          object.processingRemainingTime
 *              Time reamining until all messages are processed
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.status = function() {
    return {
        working: this.working,
        doneSearching: this.doneSearching,
        doneProcessing: this.doneProcessing,
        messages: this.messageCount,
        processingDone: this.processingCount,
        processingRemaining: this.processingRemaining,
        processingRemainingTime: this.processingRemainingTime
    };
}



/** ****************************************************************************
 * Provide registration for callbacks
 *
 * @param event
 *          The event to listen to
 * @param callback
 *          The method to call
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.register = function(event, callback) {
    if (! this.callbacks[event]) {
        this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
}



/** ****************************************************************************
 * Notify callbacks. Delete any registered callbacks after firing the event.
 *
 * @param event
 *          The event to notify
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.notify = function(event) {
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
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.cacheUncachedMessage = function(message) {
    // get the references header
    var messageIds = [];
    messageIds.push(message.messageId);
    // TODO also evaluate in-reply-to header!
    messageIds = messageIds.concat((new ThreadVisNS.References(
        message.getStringProperty("references"))).getReferences());

    // try to get existing thread ids for any of the message-ids in references
    var threadIds = this.cache.getThreadIdsForMessageIds(this.accountKey,
        messageIds);

    // re-use first thread id or create new one if none was found
    var threadId = null;
    if (threadIds.length == 0) {
        // no thread id was found, create a new one
        threadId = this.cache.createNewThreadId(this.accountKey);
    } else {
        // use first thread id
        threadId = threadIds[0];
    }

    // write cache data
    this.cache.storeThread(this.accountKey, threadId, threadIds, messageIds);
    // set update timestamp to the date of this message
    this.setUpdateTimestamp(message.date, message);
}



/** ****************************************************************************
 * Get last update timestamp
 *
 * @return
 *          The last update timestamp.
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.getUpdateTimestamp = function() {
    return this.cache.getFolderUpdateTimestamp(this.accountKey, this.folder.URI);
}



/** ****************************************************************************
 * Set last update timestamp
 *
 * @param timestamp
 *          The timestamp to set.
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.setUpdateTimestamp = function(timestamp,
    message) {
    this.cache.setFolderUpdateTimestamp(this.accountKey, this.folder.URI,
        timestamp);
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "FolderCache", {"action" : "updatetimestamp",
            "message" : message.mime2DecodedSubject,
            "timestamp" : timestamp,
            "date" : ((new Date()). setTime(timestamp / 1000)),
            "messagedate" : ((new Date()). setTime(message.date / 1000))});
    }
}



/** ****************************************************************************
 * Cancel a running cache
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.FolderCache.prototype.cancel = function() {
    this.resetMessageProcessor();
    this.working = false;
    this.doneSearching = false;
    this.doneProcessing = false;
}
