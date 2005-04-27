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

var visualisation_ = null;


// add visualisation at startup
window.setTimeout(addThreadArcs, 1000);

var threader_= null;
var loaded_ = false;

// store server to react to server switch
var server_ = null;

// FIXXME: hack
// add messages when we display first header
var doLoad = {
    onStartHeaders: function()
    {
        if (! loaded_)
            addMessages();
        loaded_ = true;
        setSelectedMessage();
    },
    onEndHeaders: function()
    {
    }
}
gMessageListeners.push(doLoad);


/**
 * Add all messages from current account
 */
function addMessages()
{
    // get root folder
    var folder = GetLoadedMsgFolder();
    var root = folder.rootFolder;
    
    server_ = folder.server;

    addMessagesFromSubFolders(root);
    
    getThreader().thread();
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
            
            getThreader().addMessageDetail(header.subject, header.author, header.messageId, header.messageKey, date, header.folder.URI , header.getStringProperty("references"), issent);
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
}


/**
 * Get DOM object of applet
 */
function getThreader() {

    return threader_;
}


/**
 * Called when a message is selected
 * Call applet with messageid to visualsíse
 */
function setSelectedMessage()
{
    // get currently loaded message
    var msg_uri = GetLoadedMessage();
    var msg = messenger.messageServiceFromURI(msg_uri).messageURIToMsgHdr(msg_uri);
    
    if (server_ != msg.folder.server)
    {
        // user just switched account
        addThreadArcs();
        loaded_ = false;
        doLoad.onStartHeaders();
    }
    
    // call threader
    getThreader().visualise(msg.messageId);
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


function ThreadArcs_onMouseClick(event)
{
    var container = event.target.container;
    if (container && ! container.isDummy())
        threadArcsCallback(container.getMessage().getKey(), container.getMessage().getFolder());
}