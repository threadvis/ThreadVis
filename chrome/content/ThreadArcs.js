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

// visualisation object
var visualisation_ = null;

// threader object
var threader_= null;

// store server to react to server switch
var server_ = null;

// synchronization variables
var loaded_ = false;
var loading_ = false;
var threaded_ = false;
var threading_ = false;
var clear_ = false;



// add visualisation at startup
setTimeout(addThreadArcs, 1000);



// add messages when we display first header
// register this as event handler later
var doLoad = {
    onStartHeaders: function()
    {
        initMessages();
        waitForThreading();
        setSelectedMessage();
    },
    onEndHeaders: function()
    {
    }
}



/**
 * Add all messages from current account
 */
function addMessages()
{
    loading_ = true;
    loaded_ = false;
    
    // get root folder
    var folder = GetLoadedMsgFolder();
    var root = folder.rootFolder;
    
    server_ = folder.server;
    addMessagesFromSubFolders(root);
    
    loaded_ = true;
    loading_ = false;
}


/**
 * Add all messages in this folder
 */
function addMessagesFromFolder(folder)
{
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
            date = date.getDate() + ". " + date.getMonth() + ". " + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
            
            // see if msg is a sent mail
            var issent = IsSpecialFolder(header.folder, MSG_FOLDER_FLAG_SENTMAIL, true);
            
            threader_.addMessageDetail(header.subject, header.author, header.messageId, header.messageKey, date, header.folder.URI , header.getStringProperty("references"), issent);
        }
    }
}


/**
 * Add all messages from subfolders
 */
function addMessagesFromSubFolders(folder)
{
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
            addMessagesFromFolder(current_folder);
        
        if (current_folder.hasSubFolders)
            addMessagesFromSubFolders(current_folder);    
        
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
 * initialize extension
 */
function addThreadArcs()
{
    threader_ = new Threader();
    visualisation_ = new Visualisation();
    gMessageListeners.push(doLoad);
}


/**
 * clear visualisation
 */
function clearVisualisation()
{
    if (clear_)
        return;
    
    visualisation_.createStack();
    clear_ = true;
}


/**
 * thread all messages
 */
function doThreading()
{
    if (! threading_ && ! threaded_)
    {
        threading_ = true;
        threaded_ = false;
        threader_.thread();
    }
    if (threading_)
    {
        var done = threader_.getDone();
        if (done)
        {
            threaded_ = true;
            threading_ = false;
            return;
        }
    setTimeout("doThreading()", 100);
    }
}


/**
 * add all messages
 * if not already done
 */
function initMessages()
{
    if (! loaded_ && ! loading_)
    {
        loading_ = true;
        setTimeout("addMessages()", 100);
    }
}


/**
 * Called when a message is selected
 * Call applet with messageid to visualsíse
 */
function setSelectedMessage()
{
    if (! loaded_ || ! threaded_)
    {
        setTimeout("setSelectedMessage()", 100);
        clearVisualisation();
        return;
    }
    clear_ = false;
    
    // get currently loaded message
    var msg_uri = GetLoadedMessage();
    var msg = messenger.messageServiceFromURI(msg_uri).messageURIToMsgHdr(msg_uri);
    
    if (server_ != msg.folder.server)
    {
        // user just switched account
        loaded_ = false;
        threaded_ = false;
        addThreadArcs();
        doLoad.onStartHeaders();
    }
    
    // call threader
    threader_.visualise(msg.messageId);
}


/**
 * Callback function from extension
 * called after mouse click in extension
 * select message in mail view
 */
function threadArcsCallback(msgKey, folder)
{
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
 * wait for all messages to be added
 * then start threading
 */
function waitForThreading()
{
    if (loaded_ && ! threaded_ && ! threading_)
    {
        setTimeout("doThreading()", 100);
    }
    else if (! threaded_ && ! threading_)
    {
        setTimeout("waitForThreading()", 100);
    }
}


/**
 * mouse click event handler
 * display message user clicked on
 */
function ThreadArcs_onMouseClick(event)
{
    var container = event.target.container;
    if (container && ! container.isDummy())
        threadArcsCallback(container.getMessage().getKey(), container.getMessage().getFolder());
}
