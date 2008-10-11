/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2008 Alexander C. Hubmann-Haidvogel
 *
 * Implements cache for a single account
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Create cache object
 *
 * @param cache
 *          Link to the cache object
 * @param account
 *          The account to analyse
 * @return
 *          A new account cache object
 ******************************************************************************/
ThreadVisNS.AccountCache = function(cache, account) {
    this.cache = cache;
    this.account = account;
    this.folders = [];
    this.preferences = new ThreadVisNS.PreferenceObserver();
    this.callbacks = [];
    this.working = false;
    this.doneChecking = false;
    this.doneCaching = false;
}



/** ****************************************************************************
 * Check all enabled folders of this account for not cached messages.
 *
 * @param folder
 *          If folder is set, only check this folder
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.check = function(folder) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "AccountCache", {"action" : "start checking all folders"});
    }

    if (this.working) {
        return;
    }
    this.working = true;

    THREADVIS.setStatus("Checking cache");

    // reset folders to check
    this.folders = [];

    // if folder is set, only check this folder, otherwise create a list
    // of all enabled folders
    if (folder) {
        this.folders.push(new ThreadVisNS.FolderCache(
            this.cache, folder, this.account.key));
    } else {
        // get all enabled folders in the account
        var rootFolder = this.account.incomingServer.rootFolder;
        var enabledFolders = this.getEnabledFolders(rootFolder);

        // loop over all folders, create folder caches
        for (var i = 0; i < enabledFolders.length; i++) {
            var f = enabledFolders[i];
            this.folders.push(new ThreadVisNS.FolderCache(
                this.cache, f, this.account.key));
        }
    }

    this.checkFolders();
}



/** ****************************************************************************
 * Pick a folder to check
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.checkFolders = function() {
    var nextFolder = null;
    for (var i = 0; i < this.folders.length; i++) {
        var folder = this.folders[i];
        var status = folder.status();
        if (status.doneSearching || status.working) {
            continue;
        }
        nextFolder = folder;
        break;
    }
    if (nextFolder) {
        var ref = this;
        nextFolder.register("onCheckDone", function() {
            ref.checkFolders();
        });
        nextFolder.check();
    } else {
        // check done, notify
        this.onCheckDone();
    }
}



/** ****************************************************************************
 * Called when search across all folders is done
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.onCheckDone = function() {
    this.working = false;
    this.doneChecking = true;
    THREADVIS.setStatus("Checking cache done");
    this.notify("onCheckDone");
}



/** ****************************************************************************
 * Called when caching across all folders is done
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.onCachingDone = function() {
    this.working = false;
    this.doneCaching = true;
    this.cache.commitDatabaseTransaction(this.account.key);
    THREADVIS.setStatus("Caching done");
    this.notify("onCacheDone");
}



/** ****************************************************************************
 * Get a list of all enabled and valid folders for a root folder
 *
 * @param folder
 *          The root folder to search
 * @return
 *          An array of valid and enabled folders.
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.getEnabledFolders = function(folder) {
    var folders = [];
    // first, check if we are allowed to add the folder
    // check for enabled/disabled folders
    if (THREADVIS.checkEnabledAccountOrFolder(folder)) {
        // exclude virtual folders in search
        if (! (folder.flags & MSG_FOLDER_FLAG_VIRTUAL) &&
            ! folder.noSelect) {

            // check if folder is valid
            // i.e. try to get message database for folder
            var checkFolder = this.preferences.getPreference(
                this.preferences.PREF_CACHE_SKIP_INVALID_FOLDERS);
            var folderValid = true;
            if (checkFolder) {
                folderValid = false;
                try {
                    var tmpDB = folder.getMsgDatabase(null);
                    if (tmpDB) {
                        folderValid = true;
                        tmpDB = null;
                        delete tmpDB;
                    } else {
                        THREADVIS.logger.log("Folder is not valid", {
                            "folder" : folder.URI});
                    }
                } catch (ex) {
                    THREADVIS.logger.log("Folder is not valid", {
                        "exception": ex,
                        "folder" : folder.URI});
                }
            }

            if (folderValid) {
                // NS_ERROR_NOT_INITIALIZED can happen here, so only do
                // if preference is enabled, and only do in try-catch block
                var updateFolder = this.preferences.getPreference(
                    this.preferences.PREF_CACHE_UPDATE_FOLDERS);
                if (updateFolder) {
                    try {
                        folder.updateFolder(null);
                    } catch (ex) {
                        THREADVIS.logger.log("Updating folder threw exception.", {
                            "folder" : nextFolder.URI,
                            "exception" : ex});
                    }
                }
                folders.push(folder);
            }
        }
    }

    // iterate all subfolders
    if (folder.hasSubFolders) {
        // Seamonkey < 2 and Thunderbird <= 2 use GetSubFolders
        // (which returns a nsIEnumerator)
        // so we have to use .currentItem() and .next()
        // Thunderbird 3 and Seamonkey 2 use subFolders (which returns an
        // nsISimpleEnumerator)
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
                folders = folders.concat(this.getEnabledFolders(nextFolder));
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
    return folders;
}



/** ****************************************************************************
 * Cache  uncached messages in the account
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.cacheUncachedMessages = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "AccountCache", {"action" : "start caching all uncached messages"});
    }

    if (this.working || ! this.doneChecking) {
        return;
    }
    this.working = true;
    this.doneCaching = false;

    // begin database transaction
    this.cache.beginDatabaseTransaction(this.account.key);

    THREADVIS.setStatus("Caching");

    // get a folder with uncached messages
    var nextFolder = null;
    for (var i = 0; i < this.folders.length; i++) {
        var folder = this.folders[i];
        var status = folder.status();
        if (status.doneSearching && ! status.doneProcessing) {
            nextFolder = folder;
            break;
        }
    }

    if (nextFolder) {
        var ref = this;
        nextFolder.register("onCachingDone", function() {
            ref.working = false;
            ref.cacheUncachedMessages();
        });
        // TODO either to this here or use method below
        nextFolder.processMessages();
    } else {
        // all folders cached
        this.onCachingDone();
    }
}



/** ****************************************************************************
 * Cache uncached messages in a folder
 *
 * @param folder
 *          The folder to process
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.cacheUncachedMessagesInFolder = function(folder) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "AccountCache", {"action" : "start caching all uncached messages in folder"});
    }

    var status = folder.status();
    if (status.doneSearching) {
        if (! folder.hasUncachedMessages()) {
            this.notify("onProcessingDone");
            return;
        }
    }

    var ref = this;
    // cache all uncached messages in the folder
    folder.register("onCachingDone", function() {
        try {
            this.cache.commitDatabaseTransaction(this.account.key);
        } catch (ex) {
        }
        this.notify("onProcessingDone");
    });

    try {
        this.cache.commitDatabaseTransaction(this.account.key);
    } catch (ex) {
    }
    try {
        this.cache.beginDatabaseTransaction(this.account.key);
    } catch (ex) {
    }

    folder.processMessages();
}



/** ****************************************************************************
 * Cancel
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.cancel = function() {
    for (var i = 0; i < this.folders.length; i++) {
        var folder = this.folders[i];
        folder.cancel();
    }
    this.cache.commitDatabaseTransaction(this.account.key);
}



/** ****************************************************************************
 * Register for callback
 *
 * @param event
 *          The event to register for
 * @param callback
 *          The function to callback
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.register = function(event, callback) {
    if (! this.callbacks[event]) {
        this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
}



/** ****************************************************************************
 * Notify callbacks
 *
 * @param event
 *          The event
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.notify = function(event) {
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
 * Get the folders
 *
 * @return
 *      The folders in the account
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.getFolders = function() {
    return this.folders;
}



/** ****************************************************************************
 * Get the status
 *
 * @return
 *          object.working
 *              True if cache update is working
 *          object.doneChecking:
 *              True if check is done
 *          object.doneCaching
 *              True if caching is done
 ******************************************************************************/
ThreadVisNS.AccountCache.prototype.status= function() {
    return {
        working: this.working,
        doneChecking: this.doneChecking,
        doneCaching: this.doneCaching
    };
}
