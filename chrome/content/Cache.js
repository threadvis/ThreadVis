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
    this.visitedMsgIds = new Object();
}



/** ****************************************************************************
 * Get cache string for message
 * Read X-ThreadVis-Cache
 ******************************************************************************/
Cache.prototype.getCache = function(msg) {
    this.visitedMsgIds = new Object();
    var cache = this.getCacheInternal(msg);
    this.threadvis.getThreader().thread();
    return cache;
}



/** ****************************************************************************
 * Get cache string for message (internal)
 ******************************************************************************/
Cache.prototype.getCacheInternal = function(msg) {
    if (this.visitedMsgIds[msg.messageId] == true) {
        return;
    }
    this.visitedMsgIds[msg.messageId] = true;
    var cache = "";
    cache = msg.getStringProperty("X-ThreadVis-Cache");
    if (cache != "") {
        this.addToThreaderFromCache(cache);
    } else {
        this.addToThreaderFromReferences(msg);
    }
    return cache;
}



/** ****************************************************************************
 * Add all messages from references to threader
 ******************************************************************************/
Cache.prototype.addToThreaderFromReferences = function(msg) {
    this.threadvis.addMessage(msg);
    var references = (new References(msg.getStringProperty("references"))).getReferences();
    for (var i = 0; i < references.length; i++) {
        var ref = references[i];
        var refMessage = this.searchMessageByMsgId(ref);
        if (refMessage) {
            this.getCacheInternal(refMessage);
        }
    }
}



/** ****************************************************************************
 * Get cache string for container, store for all messages in thread
 ******************************************************************************/
Cache.prototype.updateCache = function(container) {
    var topcontainer = container.getTopContainer();
    var cache = topcontainer.getCache();
    cache = "[" + cache + "]";
    this.putCache(topcontainer, cache);
}



/** ****************************************************************************
 * Recursivly put cache string in all messages
 ******************************************************************************/
Cache.prototype.putCache = function(container, cache) {
    if (! container.isDummy()) {
        var msgid = container.getMessage().getId();
        var msg = this.searchMessageByMsgId(msgid);
        msg.setStringProperty("X-ThreadVis-Cache", cache);
    }
    
    var child = null;
    for (child = container.getChild(); child != null; child = child.getNext()) {
        this.putCache(child, cache);
    }
}



/** ****************************************************************************
 * Add all messages from cache to threader
 ******************************************************************************/
Cache.prototype.addToThreaderFromCache = function(cache) {
    var elements = eval('(' + cache + ')');
    
    for (var i = 0; i < elements.length; i++) {
        var msgid = elements[i];
        var msg = this.searchMessageByMsgId(msgid);
        if (msg != null) {
            this.threadvis.addMessage(msg);
        }
    }
}



/** ****************************************************************************
 * Search for message id in current account
 ******************************************************************************/
Cache.prototype.searchMessageByMsgId = function(messageId) {
    return this.searchInSubFolder(this.threadvis.rootFolder, messageId);
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
