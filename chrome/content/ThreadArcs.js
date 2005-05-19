/** ****************************************************************************
 * ThreadArcs.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file for Mozilla part of ThreadArcs Extension
 *
 * Version: $Id$
 ******************************************************************************/


var HTML_NAMESPACE_ =
    "http://www.w3.org/1999/xhtml";
var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var THREADARCS_ = null;
var LOGGER_ = null;
var THREADARCS_PARENT_ = null;

// add visualisation at startup
addEventListener("load", createThreadArcs, false);



/** ****************************************************************************
 * create one and only one thread arcs object
 ******************************************************************************/
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



/** ****************************************************************************
 * Check all openers for loggers
 ******************************************************************************/
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



/** ****************************************************************************
 * Check all openers for threadarcs
 ******************************************************************************/
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



/** ****************************************************************************
 * constructor
 ******************************************************************************/
function ThreadArcs()
{
    LOGGER_.log("threadarcs",
                    {"action": "startup"});

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


    this.add_messages_from_folder_enumerator_maxcounter_ = 100;


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
    addEventListener("unload",
                     function() {ref.unloadHandler()},
                     false);
}



/** ****************************************************************************
 * Add all messages from current account
 ******************************************************************************/
ThreadArcs.prototype.addMessages = function()
{
    LOGGER_.log("addmessages", {"action" : "start"});
    this.add_messages_start_time = new Date();
    this.loading_ = true;
    this.loaded_ = false;

    this.add_messages_done_ = false;

    // get root folder
    var folder = GetLoadedMsgFolder();
    var root = folder.rootFolder;

    this.server_ = folder.server;
    this.account_ = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(this.server_);

    this.folders_ = new Array();
    this.getAllFolders(root);

    this.waitForAddMessages();
}



/** ****************************************************************************
 * Wait until all messages are added
 ******************************************************************************/
ThreadArcs.prototype.waitForAddMessages = function()
{
    if (this.add_messages_done_)
    {
        this.loaded_ = true;
        this.loading_ = false;
        this.add_messages_end_time = new Date();
        var duration = this.add_messages_end_time - this.add_messages_start_time;
        LOGGER_.log("addmessages", {"action" : "end", "time" : duration});
        return;
    }

    // if we are already adding messages, wait until we are finished
    // to look at new folder
    if (this.add_messages_from_folder_doing_)
    {
        var ref = this;
        setTimeout(function(){ref.waitForAddMessages();}, 10);
        return;
    }


    // look at next folder
    var folder = this.folders_.shift();
    LOGGER_.logDebug("ThreadArcs.waitForAddMessages()",
                        {"action" : "next folder",
                         "folder" : folder});

    // if folder == null, we don't have any folders left to look at
    if (folder == null)
    {
        this.add_messages_done_ = true;
    }
    else
    {
        this.add_messages_from_folder_doing_ = true;
        this.add_messages_from_folder_done_ = false;
        this.addMessagesFromFolder(folder);
    }

    var ref = this;
    setTimeout(function(){ref.waitForAddMessages();}, 10);
}



/** ****************************************************************************
 * Add a message to the threader
 ******************************************************************************/
ThreadArcs.prototype.addMessage = function(header)
{
    LOGGER_.logDebug("ThreadArcs.addMessage()", {});
    var date = new Date();
    // PRTime is in microseconds, Javascript time is in milliseconds
    // so divide by 1000 when converting
    date.setTime(header.date / 1000);

    var message = new Message(header.mime2DecodedSubject,
                              header.mime2DecodedAuthor,
                              header.messageId,
                              header.messageKey,
                              date,
                              header.folder.URI ,
                              header.getStringProperty("references"),
                              false);

    // see if msg is a sent mail
    var issent = IsSpecialFolder(header.folder,
                                 MSG_FOLDER_FLAG_SENTMAIL,
                                 true) ||
                 this.account_.defaultIdentity.email == message.getFromEmail();

    message.setSent(issent);
    this.threader_.addMessage(message);
}



/** ****************************************************************************
 * Add all messages in this folder
 ******************************************************************************/
ThreadArcs.prototype.addMessagesFromFolder = function(folder)
{
    if (this.add_messages_from_folder_done_)
    {
        LOGGER_.logDebug("ThreadArcs.addMessagesFromFolder()",
                            {"folder" : folder.URI,
                             "action" : "end"});
        return;
    }

    LOGGER_.logDebug("ThreadArcs.addMessagesFromFolder()",
                        {"folder" : folder.URI,
                         "action" : "start"});

    // get messages from current folder
    var msg_enumerator = folder.getMessages(null);
    this.add_messages_from_folder_doing_ = true;
    var ref = this;
    setTimeout(function(){ref.addMessagesFromFolderEnumerator(msg_enumerator);}, 10);
    setTimeout(function(){ref.addMessagesFromFolder(folder);}, 10);
}



/** ****************************************************************************
 * Add all messages from this enumerator
 * do a setTimeout call every this.add_messages_from_folder_enumerator_maxcounter_ messages
 * to give ui time to do its thing
 ******************************************************************************/
ThreadArcs.prototype.addMessagesFromFolderEnumerator = function(enumerator)
{
    LOGGER_.logDebug("ThreadArcs.addMessagesFromFolderEnumerator()", {"action" : "start"});
    var header = null;
    while (enumerator.hasMoreElements())
    {
        this.add_messages_from_folder_enumerator_counter_++;
        if (this.add_messages_from_folder_enumerator_counter_ >= this.add_messages_from_folder_enumerator_maxcounter_)
        {
            var ref = this;
            this.add_messages_from_folder_enumerator_counter_ = 0;
            setTimeout(function() {ref.addMessagesFromFolderEnumerator(enumerator);}, 10);
            return;
        }

        header = enumerator.getNext();
        if (header instanceof Components.interfaces.nsIMsgDBHdr)
        {
            this.addMessage(header);
        }
    }

    LOGGER_.logDebug("ThreadArcs.addMessagesFromFolderEnumerator()",
                        {"action" : "end"});
    this.add_messages_from_folder_done_ = true;
    this.add_messages_from_folder_doing_ = false;
}



/** ****************************************************************************
 * Build a list of all folders to add messages from
 ******************************************************************************/
ThreadArcs.prototype.getAllFolders = function(folder)
{
    LOGGER_.logDebug("ThreadArcs.getAllFolders()",
                        {"folder" : folder.URI});
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
            this.folders_.push(current_folder);

        if (current_folder.hasSubFolders)
            this.getAllFolders(current_folder);

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


/** ****************************************************************************
 * Callback function from extension
 * called after mouse click in extension
 * select message in mail view
 ******************************************************************************/
ThreadArcs.prototype.callback = function(msgKey,
                                         folder)
{
    LOGGER_.log("msgselect",
                    {"from" : "extension",
                     "key" : msgKey});

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



/** ****************************************************************************
 * clear visualisation
 ******************************************************************************/
ThreadArcs.prototype.clearVisualisation = function()
{
    LOGGER_.logDebug("ThreadArcs.clearVisualisation()", {});
    if (this.clear_)
        return;

    this.visualisation_.createStack();
    this.clear_ = true;
}



/** ****************************************************************************
 * thread all messages
 ******************************************************************************/
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



/** ****************************************************************************
 * add all messages
 * if not already done
 ******************************************************************************/
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



/** ****************************************************************************
 * Called when a message is selected
 * Call applet with messageid to visualise
 ******************************************************************************/
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
    var msg = messenger.messageServiceFromURI(msg_uri)
              .messageURIToMsgHdr(msg_uri);

    LOGGER_.log("msgselect",
                    {"from" : "user",
                     "key" : msg.messageKey});

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



/** ****************************************************************************
 * close log file on unload
 ******************************************************************************/
ThreadArcs.prototype.unloadHandler = function()
{
    LOGGER_.close();
}



/** ****************************************************************************
 * visualise a message id
 * find the container
 * call method visualise(container)
 ******************************************************************************/
ThreadArcs.prototype.visualiseMsgId = function(message_id)
{
    LOGGER_.logDebug("ThreadArcs.visualiseMsgId()",
                        {"message-id" : message_id});

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



/** ****************************************************************************
 * Visualise a container
 ******************************************************************************/
ThreadArcs.prototype.visualise = function(container)
{
    LOGGER_.logDebug("ThreadArcs.visualise()",
                        {"container" : container});

    var msgkey = container.isDummy() ? 
                    "DUMMY" : 
                    container.getMessage().getKey();
    var topcontainer_msgKey = container.getTopContainer().isDummy() ? 
                                    "DUMMY" : 
                                    container.getTopContainer().getMessage().getKey();
    var msgcount = container.getTopContainer().getCountRecursive();

    LOGGER_.log("visualise",
                    {"msgkey" : msgkey,
                     "top container" : topcontainer_msgKey,
                     "msgcount" : msgcount});

    this.visualisation_.visualise(container)
}



/** ****************************************************************************
 * wait for all messages to be added
 * then start threading
 ******************************************************************************/
ThreadArcs.prototype.waitForThreading = function()
{
    LOGGER_.logDebug("ThreadArcs.waitForThreading()", {});

    if (this.loaded_ &&
        ! this.threaded_ &&
        ! this.threading_)
    {
        var ref = this;
        setTimeout(function(){ref.doThreading();}, 100);
    }
    else if (! this.threaded_ &&
             ! this.threading_)
    {
        var ref = this;
        setTimeout(function(){ref.waitForThreading();}, 100);
    }
}
