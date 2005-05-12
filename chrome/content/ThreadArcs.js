/* *******************************************************
 * ThreadArcs.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file for Mozilla part of ThreadArcs Extension
 *
 * Version: $Id$
 ********************************************************/


var HTML_NAMESPACE_ =
    "http://www.w3.org/1999/xhtml";
var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var THREADARCS_ = null;
var LOGGER_ = null;
var THREADARCS_PARENT_ = null;

// add visualisation at startup
addEventListener("load", createThreadArcs, false);


/**
 * create one and only one thread arcs object
 */
function createThreadArcs()
{
    // check for any opener and logger in that opener
    var logger = checkForLogger(window.opener);
    if (logger)
        LOGGER_ = logger;
    else if (LOGGER_ == null)
        LOGGER_ = new Logger();

    THREADARCS_PARENT_ = checkForThreadArcs(window.opener);
    if (THREADARCS_ == null)
        THREADARCS_ = new ThreadArcs();
}


/**
 * Check all openers for loggers
 */
function checkForLogger(win)
{
    if (! win)
        return null;

    if (win.LOGGER_)
        return win.LOGGER_;
    if (win.opener)
        return checkForLogger(win.opener);
    
    return null;
}


/**
 * Check all openers for threadarcs
 */
function checkForThreadArcs(win)
{
    if (! win)
        return null;

    if (win.THREADARCS_)
        return win.THREADARCS_;

    if (win.THREADARCS_PARENT_)
        return win.THREADARCS_PARENT_;

    if (win.opener)
        return checkForThreadArcs(win.opener);

    return null;
}


/**
 * constructor
 */
function ThreadArcs()
{
    LOGGER_.log("threadarcs", {"action": "startup"});

    // synchronization variables
    this.loaded_ = false;
    this.loading_ = false;
    this.threaded_ = false;
    this.threading_ = false;
    this.clear_ = false;

    // store server to react to server switch
    this.server_ = null;

    // visualisation object
    this.visualisation_ = new Visualisation();

    // threader object
    if (THREADARCS_PARENT_)
    {
        this.threader_ = THREADARCS_PARENT_.threader_;
        this.loaded_ = THREADARCS_PARENT_.loaded_;
        this.threaded_ = THREADARCS_PARENT_.threaded_;
        this.server_ = THREADARCS_PARENT_.server_;
    }
    else
        this.threader_= new Threader();

    // add messages when we display first header
    // register this as event handler later
    var ref = this;
    this.doLoad = {
        onStartHeaders: function()
        {
            ref.initMessages();
            ref.waitForThreading();
            ref.setSelectedMessage();
        },
        onEndHeaders: function()
        {
        }
    }
    gMessageListeners.push(this.doLoad);
    
    var ref = this;
    addEventListener("unload", function() {ref.unloadHandler()}, false);
}


/**
 * Add all messages from current account
 */
ThreadArcs.prototype.addMessages = function()
{
    LOGGER_.log("addmessages", {"action" : "start"});
    var start_time = new Date();
    this.loading_ = true;
    this.loaded_ = false;
    
    // get root folder
    var folder = GetLoadedMsgFolder();
    var root = folder.rootFolder;
    
    this.server_ = folder.server;
    this.addMessagesFromSubFolders(root);
    
    this.loaded_ = true;
    this.loading_ = false;
    var end_time = new Date();
    var duration = end_time - start_time;
    LOGGER_.log("addmessages", {"action" : "end", "time" : duration});
}


/**
 * Add all messages in this folder
 */
ThreadArcs.prototype.addMessagesFromFolder = function(folder)
{
    LOGGER_.logDebug("ThreadArcs.addMessagesFromFolder()", {"folder" : folder.URI});
    // get messages from current folder
    var msg_enumerator = folder.getMessages(null);
    var header = null;
    while (msg_enumerator.hasMoreElements())
    {
        header = msg_enumerator.getNext();
        if (header instanceof Components.interfaces.nsIMsgDBHdr)
        {
            // save current account key
            var date = new Date();
            // PRTime is in microseconds, Javascript time is in milliseconds
            // so divide by 1000 when converting
            date.setTime(header.date / 1000);
            
            // see if msg is a sent mail
            var issent = IsSpecialFolder(header.folder, MSG_FOLDER_FLAG_SENTMAIL, true);
            
            this.threader_.addMessageDetail(header.mime2DecodedSubject , header.mime2DecodedAuthor , header.messageId, header.messageKey, date, header.folder.URI , header.getStringProperty("references"), issent);
        }
    }
}


/**
 * Add all messages from subfolders
 */
ThreadArcs.prototype.addMessagesFromSubFolders = function(folder)
{
    LOGGER_.logDebug("ThreadArcs.addMessagesFromSubFolders()", {"folder" : folder.URI});
    var folder_enumerator = folder.GetSubFolders();
    var current_folder = null;
    while (true)
    {
        try
        {
            current_folder = folder_enumerator.currentItem();
        }
        catch (Exception)
        {
            break;
        }
        
        if (current_folder instanceof Components.interfaces.nsIMsgFolder)
            this.addMessagesFromFolder(current_folder);
        
        if (current_folder.hasSubFolders)
            this.addMessagesFromSubFolders(current_folder);
        
        try
        {
            folder_enumerator.next();
        }
        catch (Exception)
        {
            break;
        }
    }
}


/**
 * Callback function from extension
 * called after mouse click in extension
 * select message in mail view
 */
ThreadArcs.prototype.callback = function(msgKey, folder)
{
    LOGGER_.log("msgselect", {"from" : "extension", "key" : msgKey});
    // get folder for message
    SelectFolder(folder);
    
    // clear current selection
    var treeBoxObj = GetThreadTree().treeBoxObject;
    var treeSelection = treeBoxObj.selection;
    treeSelection.clearSelection();
    
    // select message
    gDBView.selectMsgByKey(msgKey);
    
    treeBoxObj.ensureRowIsVisible(treeSelection.currentIndex);
}


/**
 * clear visualisation
 */
ThreadArcs.prototype.clearVisualisation = function()
{
    LOGGER_.logDebug("ThreadArcs.clearVisualisation()", {});
    if (this.clear_)
        return;
    
    this.visualisation_.createStack();
    this.clear_ = true;
}


/**
 * thread all messages
 */
ThreadArcs.prototype.doThreading = function()
{
    LOGGER_.logDebug("ThreadArcs.doThreading()", {});
    if (! this.threading_ && ! this.threaded_)
    {
        this.threading_ = true;
        this.threaded_ = false;
        this.threader_.thread();
    }
    if (this.threading_)
    {
        var done = this.threader_.getDone();
        if (done)
        {
            this.threaded_ = true;
            this.threading_ = false;
            return;
        }
    var ref = this;
    setTimeout(function(){ref.doThreading();}, 100);
    }
}


/**
 * add all messages
 * if not already done
 */
ThreadArcs.prototype.initMessages = function()
{
    LOGGER_.logDebug("ThreadArcs.initMessages()", {});
    if (! this.loaded_ && ! this.loading_)
    {
        this.loading_ = true;
        var ref = this;
        setTimeout(function(){ref.addMessages();}, 100);
    }
}


/**
 * Called when a message is selected
 * Call applet with messageid to visualise
 */
ThreadArcs.prototype.setSelectedMessage = function()
{
    LOGGER_.logDebug("ThreadArcs.setSelectedMessage()", {});
    if (! this.loaded_ || ! this.threaded_)
    {
        var ref = this;
        setTimeout(function(){ref.setSelectedMessage();}, 100);
        this.clearVisualisation();
        return;
    }
    this.clear_ = false;
    
    // get currently loaded message
    var msg_uri = GetLoadedMessage();
    var msg = messenger.messageServiceFromURI(msg_uri).messageURIToMsgHdr(msg_uri);
    
    LOGGER_.log("msgselect", {"from" : "user", "key" : msg.messageKey});
    if (this.server_.key != msg.folder.server.key)
    {
        LOGGER_.log("switchaccount", {});
        // user just switched account
        this.loaded_ = false;
        this.threaded_ = false;
        this.threader_ = new Threader();
        this.doLoad.onStartHeaders();
    }
    
    // call threader
    // fixxme delay display
    // to give UI time to layout
    var ref = this;
    setTimeout(function(){ref.visualiseMsgId(msg.messageId);}, 100);
}


ThreadArcs.prototype.unloadHandler = function()
{
    LOGGER_.close();
}


/**
 * visualise a message id
 * find the container
 * call method visualise(container)
 */
ThreadArcs.prototype.visualiseMsgId = function(message_id)
{
    LOGGER_.logDebug("ThreadArcs.visualiseMsgId()", {"message-id" : message_id});
    var container = this.threader_.findContainer(message_id);
    if (container != null)
    {
        this.visualise(container);
    }
    else
    {
        this.clearVisualisation();
    }
    container = null;
}


/**
 * Visualise a container
 */
ThreadArcs.prototype.visualise = function(container)
{
    LOGGER_.logDebug("ThreadArcs.visualise()", {"container" : container});
    var msgkey = container.isDummy() ? "DUMMY" : container.getMessage().getKey();
    var topcontainer_msgKey = container.getTopContainer().isDummy() ? "DUMMY" : container.getTopContainer().getMessage().getKey();
    var msgcount = container.getTopContainer().getCountRecursive();
    LOGGER_.log("visualise", {"msgkey" : msgkey, "top container" : topcontainer_msgKey, "msgcount" : msgcount});
    this.visualisation_.visualise(container)
}


/**
 * wait for all messages to be added
 * then start threading
 */
ThreadArcs.prototype.waitForThreading = function()
{
    LOGGER_.logDebug("ThreadArcs.waitForThreading()", {});
    if (this.loaded_ && ! this.threaded_ && ! this.threading_)
    {
        var ref = this;
        setTimeout(function(){ref.doThreading();}, 100);
    }
    else if (! this.threaded_ && ! this.threading_)
    {
        var ref = this;
        setTimeout(function(){ref.waitForThreading();}, 100);
    }
}
