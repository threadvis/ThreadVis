/** ****************************************************************************
 * ThreadVis.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file for Mozilla part of ThreadVis Extension
 *
 * Version: $Id$
 ******************************************************************************/



var THREADVIS = null;

// add visualisation at startup
addEventListener("load", createThreadVis, false);



/** ****************************************************************************
 * create one and only one threadvis object
 ******************************************************************************/
function createThreadVis()
{
    var threadvis_parent = checkForThreadVis(window);
    if (THREADVIS == null)
    {
        THREADVIS = new ThreadVis(threadvis_parent);
        THREADVIS.init();
        window.onerror = THREADVIS.logJavaScriptErrors;
    }
}



/** ****************************************************************************
 * Check all openers for threadvis
 ******************************************************************************/
function checkForThreadVis(win)
{
    if (! win)
        return null;

    if (win.THREADVIS)
        return win.THREADVIS;

    if (win.parent && win != win.parent)
        return checkForThreadVis(win.parent);

    if (win.opener)
        return checkForThreadVis(win.opener);

    return null;
}



/** ****************************************************************************
 * constructor
 * threadvis_parent is link to parent object (if it exists)
 ******************************************************************************/
function ThreadVis(threadvis_parent)
{
    this.XUL_NAMESPACE_ = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    
    // synchronization variables
    this.loaded_ = false;
    this.loading_ = false;
    this.threaded_ = false;
    this.threading_ = false;
    this.clear_ = false;

    // store server to react to server switch
    this.server_ = null;

    // if parent object exists, reuse some of the internal objects
    this.threadvis_parent_ = threadvis_parent;

}



/** ****************************************************************************
 * Add a message to the threader
 ******************************************************************************/
ThreadVis.prototype.addMessage = function(header)
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return


    this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                          "ThreadVis.addMessage()",
                          {});
    var date = new Date();
    // PRTime is in microseconds, Javascript time is in milliseconds
    // so divide by 1000 when converting
    date.setTime(header.date / 1000);

    var message = new Message(header.mime2DecodedSubject,
                              header.mime2DecodedAuthor,
                              header.messageId,
                              header.messageKey,
                              date,
                              header.folder.URI,
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
 * Add all messages from current account
 ******************************************************************************/
ThreadVis.prototype.addMessages = function()
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return;

    this.logger_.log("addmessages",
                     {"action" : "start"});
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
 * Add all messages in this folder
 ******************************************************************************/
ThreadVis.prototype.addMessagesFromFolder = function(folder)
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;

    if (! this.checkEnabledAccountOrFolder(folder))
    {
        this.add_messages_from_folder_done_ = true;
        this.add_messages_from_folder_doing_ = false;
        return;
    }

    if (this.add_messages_from_folder_done_)
    {
        this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                              "ThreadVis.addMessagesFromFolder()",
                              {"folder" : folder.URI,
                               "action" : "end"});
        return;
    }

    this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                          "ThreadVis.addMessagesFromFolder()",
                          {"folder" : folder.URI,
                           "action" : "start"});

    // get messages from current folder
    try
    {
        var msg_enumerator = folder.getMessages(null);
    }
    catch (exception)
    {
        this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                              "ThreadVis.addMessagesFromFolder()",
                              {"folder" : folder.URI,
                               "action" : "caught exception " + exception});
        this.add_messages_from_folder_done_ = true;
        this.add_messages_from_folder_doing_ = false;
        return;
    }
    
    this.add_messages_from_folder_doing_ = true;
    var ref = this;
    this.add_messages_from_folder_enumerator_counter_ = 0;
    setTimeout(function(){ref.addMessagesFromFolderEnumerator(msg_enumerator);}, 10);
}



/** ****************************************************************************
 * Add all messages from this enumerator
 * do a setTimeout call every this.add_messages_from_folder_enumerator_maxcounter_ messages
 * to give ui time to do its thing
 ******************************************************************************/
ThreadVis.prototype.addMessagesFromFolderEnumerator = function(enumerator)
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return


    this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                          "ThreadVis.addMessagesFromFolderEnumerator()",
                          {"action" : "start"});
    var header = null;
    while (enumerator.hasMoreElements())
    {
        this.add_messages_from_folder_enumerator_counter_++;
        if (this.add_messages_from_folder_enumerator_counter_ >= this.add_messages_from_folder_enumerator_maxcounter_)
        {
            this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                                  "ThreadVis.addMessagesFromFolderEnumerator()",
                                  {"action" : "pause"});
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

    this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                          "ThreadVis.addMessagesFromFolderEnumerator()",
                          {"action" : "end"});
    this.add_messages_from_folder_done_ = true;
    this.add_messages_from_folder_doing_ = false;
}



/** ****************************************************************************
 * Callback function from extension
 * called after mouse click in extension
 * select message in mail view
 ******************************************************************************/
ThreadVis.prototype.callback = function(msg_key,
                                         folder)
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return


    this.logger_.log("msgselect",
                     {"from" : "extension",
                      "key" : msg_key});

    this.selected_msgkey_ = msg_key;

    // get folder for message
    this.getMainWindow().SelectFolder(folder);

    // clear current selection
    var tree = this.getMainWindow().GetThreadTree();
    
    var treeBoxObj = tree.treeBoxObject;
    // this is necessary because Thunderbird >= 1.5 uses
    // tree.view.selection
    // and
    // tree.treeBoxObject.selection
    // doesn't work anymore
    var treeSelection = null;
    if (tree.view)
        treeSelection = tree.view.selection;
    else
        treeSelection = treeBoxObj.selection;

    treeSelection.clearSelection();

    // select message
    this.getMainWindow().gDBView.selectMsgByKey(msg_key);

    treeBoxObj.ensureRowIsVisible(treeSelection.currentIndex);
}



/** ****************************************************************************
 * Check if current account is enabled in extension
 ******************************************************************************/
ThreadVis.prototype.checkEnabledAccountOrFolder = function(folder)
{
    if (! folder)
        folder = this.getMainWindow().GetLoadedMsgFolder();

    if (! folder)
        return false;

    var server = folder.server;
    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                   .getService(Components.interfaces.nsIMsgAccountManager))
                   .FindAccountForServer(server);

    var regexp_account = new RegExp(account.key);

    if (this.preferences_.getPreference(this.preferences_.PREF_DISABLED_ACCOUNTS_) != "" && 
        this.preferences_.getPreference(this.preferences_.PREF_DISABLED_ACCOUNTS_).match(regexp_account))
    {
        this.logger_.logDebug(this.logger_.LEVEL_INFORM_,
                              "accountdisabled",
                              {"total_regexp" : this.preferences_.getPreference(this.preferences_.PREF_DISABLED_ACCOUNTS_),
                               "this_account" : account.key});
        return false;
    }
    else
    {
        var regexp_folder = new RegExp(folder.URI + " ");
        if (this.preferences_.getPreference(this.preferences_.PREF_DISABLED_FOLDERS_) != "" && 
            this.preferences_.getPreference(this.preferences_.PREF_DISABLED_FOLDERS_).match(regexp_folder))
        {
            this.logger_.logDebug(this.logger_.LEVEL_INFORM_,
                                  "folderdisabled",
                                  {"total_regexp" : this.preferences_.getPreference(this.preferences_.PREF_DISABLED_FOLDERS_),
                                   "this_folder" : folder.URI});
            return false;
        }
        else
        {
            return true;
        }
    }
}



/** ****************************************************************************
 * clear visualisation
 ******************************************************************************/
ThreadVis.prototype.clearVisualisation = function()
{
    this.logger_.logDebug(this.logger_.LEVEL_VIS_,
                          "ThreadVis.clearVisualisation()",
                          {"clear" : this.clear_});

    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_) )
    {
        return;
    }

    if (this.clear_)
        return;

    this.visualisation_.createStack();
    this.clear_ = true;

    // also clear legend
    if (this.legend_window_ && ! this.legend_window_.closed)
        this.legend_window_.clearLegend();
}



/** ****************************************************************************
 * create threadvis xul box
 ******************************************************************************/
ThreadVis.prototype.createBox = function()
{
    var elem = document.getElementById("ThreadVis");
    elem.hidden = false;
}



/** ****************************************************************************
 * delete threadvis xul box
 ******************************************************************************/
ThreadVis.prototype.deleteBox = function()
{
    var elem = document.getElementById("ThreadVis");
    elem.hidden = true;
}



/** ****************************************************************************
 * Display legend popup
 ******************************************************************************/
ThreadVis.prototype.displayLegend = function()
{
    if (window.opener && window.opener.THREADVIS)
        window.opener.THREADVIS.displayLegend();

    if (this.legend_window_ != null && ! this.legend_window_.closed)
    {
        this.legend_window_.displayLegend();
    }
}



/** ****************************************************************************
 * Display legend popup
 ******************************************************************************/
ThreadVis.prototype.displayLegendWindow = function()
{
    if (window.opener && window.opener.THREADVIS)
    {
        window.opener.THREADVIS.displayLegendWindow();
        return;
    }

    this.logger_.log("legend", {"action" : "open"});

    if (this.legend_window_ != null && ! this.legend_window_.closed)
    {
        this.legend_window_.focus();
        return;
    }

    var flags = "chrome=yes,resizable=no,alwaysRaised=yes,dependent=yes,dialog=yes";
    this.legend_window_ = window.openDialog("chrome://threadvis/content/Legend.xul", "ThreadVisLegend", flags);
}



/** ****************************************************************************
 * display a popup window for the visualisation
 ******************************************************************************/
ThreadVis.prototype.displayVisualisationWindow = function()
{
    this.logger_.log("popupvisualisation", {"action" : "open"});

    if (this.popup_window_ != null && ! this.popup_window_.closed)
    {
        this.popup_window_.focus();
        return;
    }

    var flags = "chrome=yes,resizable=yes,alwaysRaised=yes,dependent=yes";
    this.popup_window_ = window.openDialog("chrome://threadvis/content/ThreadVisPopup.xul", "ThreadVisPopup", flags);
    this.deleteBox();
}



/** ****************************************************************************
 * thread all messages
 ******************************************************************************/
ThreadVis.prototype.doThreading = function()
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return


    this.logger_.logDebug(this.logger_.LEVEL_INFORM_,
                          "ThreadVis.doThreading()",
                          {});
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
 * Build a list of all folders to add messages from
 ******************************************************************************/
ThreadVis.prototype.getAllFolders = function(folder)
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return


    this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                          "ThreadVis.getAllFolders()",
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
 * Get legend object
 ******************************************************************************/
ThreadVis.prototype.getLegend = function()
{
    if (this.popup_window_ && this.popup_window_.THREADVIS)
        return this.popup_window_.THREADVIS.visualisation_.legend_;
    else
        return this.visualisation_.legend_;

}



/** ****************************************************************************
 * Return main window object
******************************************************************************/
ThreadVis.prototype.getMainWindow = function()
{
    var w = window;
    
    while (w != null)
    {
        if (typeof(w.GetThreadTree) == "function")
            return w;
        
        w = window.opener;
    }
}



/** ****************************************************************************
 * init object
******************************************************************************/
ThreadVis.prototype.init = function()
{
    if (this.threadvis_parent_)
    {
        this.logger_ = this.threadvis_parent_.logger_;
        this.threader_ = this.threadvis_parent_.threader_;
        this.loaded_ = this.threadvis_parent_.loaded_;
        this.threaded_ = this.threadvis_parent_.threaded_;
        this.server_ = this.threadvis_parent_.server_;
        this.preferences_ = this.threadvis_parent_.preferences_;
    }
    else
    {
        var ref = this;
        this.preferences_ = new PreferenceObserver();
        this.preferences_.registerCallback(this.preferences_.PREF_DISABLED_ACCOUNTS_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_DISABLED_FOLDERS_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_ENABLED_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_TIMELINE_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_TIMESCALING_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_VIS_DOTSIZE_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_VIS_ARC_MINHEIGHT_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_VIS_ARC_RADIUS_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_VIS_ARC_DIFFERENCE_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_VIS_ARC_WIDTH_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_VIS_SPACING_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_VIS_COLOUR_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_ZOOM_HEIGHT_, function(value) { ref.preferenceChanged(value); });
        this.preferences_.registerCallback(this.preferences_.PREF_ZOOM_WIDTH_, function(value) { ref.preferenceChanged(value); });
        
        // only create logger object if extension is enabled
        if (this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        {
            this.logger_ = new Logger();
        }
    }
    
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
    {
        this.deleteBox();
        return;
    }

    this.logger_.log("threadvis",
                     {"action": "startup"});

    // create box object
    this.createBox();

    // visualisation object
    if (! this.visualisation_)
        this.visualisation_ = new Visualisation();
    
    this.clearVisualisation();

    // check to see if parent threadvis object exists
    if (this.threadvis_parent_)
    {
        // visualise selected message
        this.visualise(this.threadvis_parent_.selected_container_);
        return;
    }
    else
    {
        if (! this.threader_)
            this.threader_= new Threader();
    }

    /* ************************************************************************
     * code below only gets executed if no parent threadvis object was found
     * ***********************************************************************/

    // remember msgkey of selected message
    this.selected_msgkey_ = "";

    // remember container of selected message
    this.selected_container_ = null;

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

    // add folder listener, so that we can add newly received
    // messages
    this.folderListener =
    {
        OnItemAdded: function(parentItem, item, view)
        {
            // this is called
            // POP:  - when new msgs arrive
            //       - when moving messages from one folder to another
            // IMAP: - only when new msgs arrive
            //       - NOT when moving messages!!
            ref.onItemAdded(parentItem, item, view);
        },

        OnItemRemoved: function(parentItem, item, view)
        {
            // removed item from folder
            //ref.onItemRemoved(parentItem, item, view);
        },

        OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {},
        OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
        OnItemEvent: function(folder, event) {}
    }
    
    if (! this.gMailSession)
        this.gMailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
    
    var notifyFlags = Components.interfaces.nsIFolderListener.all;
    this.gMailSession.AddFolderListener(this.folderListener, notifyFlags);

    addEventListener("unload",
                     function() {ref.unloadHandler()},
                     false);
}



/** ****************************************************************************
 * add all messages
 * if not already done
 ******************************************************************************/
ThreadVis.prototype.initMessages = function()
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return


    this.logger_.logDebug(this.logger_.LEVEL_INFORM_,
                          "ThreadVis.initMessages()",
                          {});
    if (! this.loaded_ && ! this.loading_)
    {
        this.loading_ = true;
        var ref = this;
        setTimeout(function(){ref.addMessages();}, 100);
    }
}



/** ****************************************************************************
 * log all JavaScript errors to logfile
 ******************************************************************************/
ThreadVis.prototype.logJavaScriptErrors = function(message, file, line)
{
    THREADVIS.logger_.log("threadvis-jserror",
                          {"message": message,
                           "file" : file,
                           "line" : line});
}



/** ****************************************************************************
 * called when new folder added
 ******************************************************************************/
ThreadVis.prototype.onFolderAdded = function(folder)
{
    if (! this.checkEnabledAccountOrFolder(folder))
        return
    
    if (! this.loaded_)
        return;
    
    if (this.add_messages_from_folder_doing_)
        return;
    
    var start = new Date();
    this.logger_.log("addadditionalmessagesfolder", {"action" : "start"});
    // added new message to folder
    if (folder instanceof Components.interfaces.nsIMsgFolder)
    {
        this.add_messages_from_folder_done_ = false;
        this.add_messages_from_folder_doing_ = false;
        this.addMessagesFromFolder(folder);
        this.onFolderAddedWaitForThreading();
    }
    var end = new Date();
    var duration = end - start;
    this.logger_.log("addadditionalmessagesfolder", {"action" : "end", "time" : duration});
}



/** ****************************************************************************
 * called to wait to thread new folder
 ******************************************************************************/
ThreadVis.prototype.onFolderAddedWaitForThreading = function()
{
    if (this.add_messages_from_folder_done_)
    {
        this.threader_.thread();
        this.onFolderAddedWaitForVisualisation();
        return;
    }
    else
    {
        var ref = this;
        setTimeout(function(){ref.onFolderAddedWaitForThreading();}, 10);
    }
}



/** ****************************************************************************
 * called to wait to thread new folder
 ******************************************************************************/
ThreadVis.prototype.onFolderAddedWaitForVisualisation = function()
{
    if (this.threader_.getDone())
    {
        this.setSelectedMessage()
        return;
    }
    else
    {
        var ref = this;
        setTimeout(function(){ref.onFolderAddedWaitForVisualisation();}, 10);
    }
}



/** ****************************************************************************
 * called when new messages arrive
 * either from server or moved from one folder to the other (only POP!!)
 ******************************************************************************/
ThreadVis.prototype.onItemAdded = function(parentItem, item, view)
{
    var start = new Date();
    this.logger_.log("addadditionalmessages", {"action" : "start"});
    // added new message to folder
    if (item instanceof Components.interfaces.nsIMsgDBHdr)
    {
        this.addMessage(item);
        this.threader_.thread();
    }
    var end = new Date();
    var duration = end - start;
    this.logger_.log("addadditionalmessages", {"action" : "end", "time" : duration});
}



/** ****************************************************************************
 * called when messages are deleted
 * not called at the moment
 ******************************************************************************/
ThreadVis.prototype.onItemRemoved = function(parentItem, item, view)
{
    var start = new Date();
    this.logger_.log("deletemessage", {"action" : "start"});
    // added new message to folder
    if (item instanceof Components.interfaces.nsIMsgDBHdr)
    {
        var container = this.threader_.findContainer(item.messageId);
        if (container)
        {
            container.setMessage(null);
        }
    }
    var end = new Date();
    var duration = end - start;
    this.logger_.log("deletemessage", {"action" : "end", "time" : duration});
}



/** ****************************************************************************
 * called when popup window gets closed
 ******************************************************************************/
ThreadVis.prototype.onVisualisationWindowClose = function()
{
    this.logger_.log("popupvisualisation", {"action" : "close"});
    this.threadvis_parent_.setSelectedMessage();
}



/** ****************************************************************************
 * Open the options dialog for this extension
 ******************************************************************************/
ThreadVis.prototype.openThreadVisOptionsDialog = function()
{
    if (typeof(openOptionsDialog) == "undefined")
    {
        // Mozilla doesn't know about openOptionsDialog, so we use goPreferences.
        // Although Thunderbird also knows goPreferences, Thunderbird 1.5
        // has some problems with it, so we use it only for Mozilla and use
        // openOptionsDialog for Thunderbird. For details see comments below.
        goPreferences('threadvis', 'chrome://threadvis/content/Settings.xul','threadvis');
    }
    else
    {
        // Thunderbird knows both goPreferences and openOptionsDialog
        // but Thunderbird 1.5 (Beta) doesn't do well with goPreferences.
        // It opens a window, but it has no content.
        // 
        // Also almost all calls to open the preferences window use
        // openOptionsDialog in 1.5, so we might as well use it too.
        //
        // One problem remains:
        //
        // # In Thunderbird < 1.5, the function is defined as
        //     function openOptionsDialog(containerID, paneURL, itemID)
        // # whereas in Thunderbird 1.5, it is defined as
        //     function openOptionsDialog(aPaneID, aTabID)
        //
        // And I don't know how to distinguish between those two.
        // So let's do a bad hack and pass the aPaneID as the first
        // parameter (which seems to do no harm to Thunderbird < 1.5) and
        // pass the paneURL as the second parameter (which in turn seems to
        // do no harm to Thunderbird 1.5).
        //
        // NOTE:
        // Additionally, Thunderbird 1.5 uses a completely new layout and API 
        // for the preferences window, which leads to the problem that we need to
        // have two separate XUL files to edit the preferences for this extension.
        //
        // So we have Settings15.xul which gets used in Thunderbird 1.5 (and 
        // which defines the paneThreadVis component which gets passed as
        // aPaneID), and we have Settings.xul which gets used in Thunderbird < 1.5
        // and Mozilla (which URL gets passed as paneURL).
        openOptionsDialog('paneThreadVis', 'chrome://threadvis/content/Settings.xul');
    }
}



/** ****************************************************************************
 * preference changed
 ******************************************************************************/
ThreadVis.prototype.preferenceChanged = function(enabled)
{
    this.visualisation_.changed_ = true;

    if (this.popup_window_ && this.popup_window_.THREADVIS)
        this.popup_window_.THREADVIS.visualisation_.changed_ = true;

    this.doLoad.onStartHeaders();
}



/** ****************************************************************************
 * Called when a message is selected
 * Call visualisation with messageid to visualise
 ******************************************************************************/
ThreadVis.prototype.setSelectedMessage = function()
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
    {
        this.deleteBox();
        return;
    }
    if (! this.checkEnabledAccountOrFolder())
    {
        this.deleteBox();
        return;
    }
    
    this.logger_.logDebug(this.logger_.LEVEL_INFORM_,
                          "ThreadVis.setSelectedMessage()",
                          {});
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

    // only log as a "user" select if this message was not already
    // selected by the extension
    if (this.selected_msgkey_ != msg.messageKey)
    {
        this.logger_.log("msgselect",
                         {"from" : "user",
                          "key" : msg.messageKey});
    }

    if (this.server_.key != msg.folder.server.key)
    {
        this.logger_.log("switchaccount", {});
        // user just switched account
        this.clearVisualisation();
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
ThreadVis.prototype.unloadHandler = function()
{
    this.logger_.log("threadvis",
                     {"action": "unload"});
    this.logger_.close();
    this.threader_.closeCopyCut();
}



/** ****************************************************************************
 * Visualise a container
 ******************************************************************************/
ThreadVis.prototype.visualise = function(container)
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return

    this.logger_.logDebug(this.logger_.LEVEL_INFORM_,
                          "ThreadVis.visualise()",
                          {"container" : container});

    var msgkey = container.isDummy() ? 
                    "DUMMY" : 
                    container.getMessage().getKey();
    var topcontainer_msgKey = container.getTopContainer().isDummy() ? 
                                    "DUMMY" : 
                                    container.getTopContainer().getMessage().getKey();
    var msgcount = container.getTopContainer().getCountRecursive();

    this.logger_.log("visualise",
                     {"msgkey" : msgkey,
                      "top container" : topcontainer_msgKey,
                      "msgcount" : msgcount});

    this.createBox();
    this.visualisation_.visualise(container);
    this.selected_container_ = container;
}



/** ****************************************************************************
 * visualise a message id
 * find the container
 * call method visualise(container)
 ******************************************************************************/
ThreadVis.prototype.visualiseMsgId = function(message_id)
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return;

    this.logger_.logDebug(this.logger_.LEVEL_INFORM_,
                          "ThreadVis.visualiseMsgId()",
                          {"message-id" : message_id});

    var container = this.threader_.findContainer(message_id);

    if (container != null && ! container.isDummy())
    {
        // visualise any popup windows that might exist
        if (this.popup_window_ && this.popup_window_.THREADVIS)
            this.popup_window_.THREADVIS.visualise(container);
        else
            this.visualise(container);
    }
    else
    {
        // - message id not found, or
        // - container with id was dummy
        // this means we somehow missed to thread this message
        // thus, thread the whole folder we are in
        if (this.popup_window_ && this.popup_window_.THREADVIS)
            this.popup_window_.THREADVIS.clearVisualisation();
        else
            this.clearVisualisation();
        this.onFolderAdded(GetLoadedMsgFolder());
    }
    container = null;
}



/** ****************************************************************************
 * Wait until all messages are added
 ******************************************************************************/
ThreadVis.prototype.waitForAddMessages = function()
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    
    if (! this.checkEnabledAccountOrFolder())
        return;

    if (this.add_messages_done_)
    {
        this.loaded_ = true;
        this.loading_ = false;
        this.add_messages_end_time = new Date();
        var duration = this.add_messages_end_time - this.add_messages_start_time;
        this.logger_.log("addmessages", {"action" : "end", "time" : duration});
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
    this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                          "ThreadVis.waitForAddMessages()",
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
 * wait for all messages to be added
 * then start threading
 ******************************************************************************/
ThreadVis.prototype.waitForThreading = function()
{
    if (! this.preferences_.getPreference(this.preferences_.PREF_ENABLED_))
        return;
    if (! this.checkEnabledAccountOrFolder())
        return


    this.logger_.logDebug(this.logger_.LEVEL_EMAIL_,
                          "ThreadVis.waitForThreading()",
                          {});

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



/** ****************************************************************************
 * Zoom function to call from user click
 ******************************************************************************/
ThreadVis.prototype.zoomIn = function()
{
    this.visualisation_.zoomIn();
}



/** ****************************************************************************
 * Zoom function to call from user click
 ******************************************************************************/
ThreadVis.prototype.zoomOut = function()
{
    this.visualisation_.zoomOut();
}
