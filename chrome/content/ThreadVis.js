/** ****************************************************************************
 * ThreadVis.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file for Mozilla part of ThreadVis Extension
 *
 * $Id$
 ******************************************************************************/



var THREADVIS = null;

// add visualisation at startup
addEventListener("load", createThreadVis, false);



/** ****************************************************************************
 * create one and only one threadvis object
 ******************************************************************************/
function createThreadVis() {
    var threadvisParent = checkForThreadVis(window);
    if (THREADVIS == null) {
        THREADVIS = new ThreadVis(threadvisParent);
        THREADVIS.init();
        window.onerror = THREADVIS.logJavaScriptErrors;
        setTimeout(function() { THREADVIS.displayNotes(); }, 5000);
    }
}



/** ****************************************************************************
 * Check all openers for threadvis
 ******************************************************************************/
function checkForThreadVis(win) {
    if (! win) {
        return null;
    }

    if (win.THREADVIS) {
        return win.THREADVIS;
    }

    if (win.parent && win != win.parent) {
        return checkForThreadVis(win.parent);
    }

    if (win.opener) {
        return checkForThreadVis(win.opener);
    }

    return null;
}



/** ****************************************************************************
 * constructor
 * threadvisparent is link to parent object (if it exists)
 ******************************************************************************/
function ThreadVis(threadvisParent) {
    this.XUL_NAMESPACE =
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    this.NOTES = 3;

    this.clear = false;

    this.strings = document.getElementById("ThreadVisStrings");

    // store server to react to server switch
    this.server = null;

    // if parent object exists, reuse some of the internal objects
    this.threadvisParent = threadvisParent;

    // cache enabled account/folder
    this.cacheKeyCheckEnabledAccountOrFolder = null;
    this.cacheValueCheckEnabledAccountOrFolder = null;
}



/** ****************************************************************************
 * Add a message to the threader
 ******************************************************************************/
ThreadVis.prototype.addMessage = function(header) {
    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        return;
    }
    if (! this.checkEnabledAccountOrFolder(header.folder)) {
        return;
    }

    if (this.logger.isDebug(this.logger.COMPONENT_EMAIL)) {
        this.logger.logDebug(this.logger.LEVEL_INFO,
            "ThreadVis.addMessage()", {});
    }

    if (this.getThreader().hasMessage(header.messageId)) {
        return;
    }

    var date = new Date();
    // PRTime is in microseconds, Javascript time is in milliseconds
    // so divide by 1000 when converting
    date.setTime(header.date / 1000);

    var message = new Message(header.mime2DecodedSubject,
        header.mime2DecodedAuthor, header.messageId, header.messageKey, date,
        header.folder.URI, header.getStringProperty("references"), false);

    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(header.folder.server);

    // see if msg is a sent mail
    var issent = IsSpecialFolder(header.folder, MSG_FOLDER_FLAG_SENTMAIL, true)
        || account.defaultIdentity.email == message.getFromEmail();

    message.setSent(issent);
    this.getThreader().addMessage(message);

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_EMAIL)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addMessageToThreader", {"message" : message});
    }
}



/** ****************************************************************************
 * Callback function from extension
 * called after mouse click in extension
 * select message in mail view
 ******************************************************************************/
ThreadVis.prototype.callback = function(msgKey, folder) {
    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        return;
    }

    this.logger.log("msgselect", {"from" : "extension", "key" : msgKey});

    this.selectedMsgKey = msgKey;

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
    if (tree.view) {
        treeSelection = tree.view.selection;
    } else {
        treeSelection = treeBoxObj.selection;
    }

    treeSelection.clearSelection();

    // select message
    this.getMainWindow().gDBView.selectMsgByKey(msgKey);

    treeBoxObj.ensureRowIsVisible(treeSelection.currentIndex);
}



/** ****************************************************************************
 * Check if current account is enabled in extension
 ******************************************************************************/
ThreadVis.prototype.checkEnabledAccountOrFolder = function(folder) {
    if (! folder) {
        folder = this.getMainWindow().GetLoadedMsgFolder();
    }
    if (! folder) {
        return false;
    }

    // get from cache
    if (this.cacheKeyCheckEnabledAccountOrFolder == folder) {
        return this.cacheValueCheckEnabledAccountOrFolder;
    }

    var server = folder.server;
    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(server);
    var regexpAccount = new RegExp(account.key);

    if (this.preferences.getPreference(this.preferences.PREF_DISABLED_ACCOUNTS) != ""
        && this.preferences.getPreference(this.preferences.PREF_DISABLED_ACCOUNTS)
        .match(regexpAccount)) {
        if (this.logger.isDebug(this.logger.COMPONENT_EMAIL)) {
            this.logger.logDebug(this.logger.LEVEL_INFO, "accountdisabled",
                {"total_regexp" : this.preferences.getPreference(
                    this.preferences.PREF_DISABLED_ACCOUNTS),
                "this_account" : account.key});
        }
        this.cacheKeyCheckEnabledAccountOrFolder = folder;
        this.cacheValueCheckEnabledAccountOrFolder = false;
        return false;
    } else {
        var regexpFolder = new RegExp(folder.URI + " ");
        if (this.preferences.getPreference(this.preferences.PREF_DISABLED_FOLDERS) != ""
            && this.preferences.getPreference(this.preferences.PREF_DISABLED_FOLDERS)
            .match(regexpFolder)) {
            if (this.logger.isDebug(this.logger.COMPONENT_EMAIL)) {
                this.logger.logDebug(this.logger.LEVEL_INFO, "folderdisabled",
                    {"total_regexp" : this.preferences
                        .getPreference(this.preferences.PREF_DISABLED_FOLDERS),
                    "this_folder" : folder.URI});
            }
            this.cacheKeyCheckEnabledAccountOrFolder = folder;
            this.cacheValueCheckEnabledAccountOrFolder = false;
            return false;
        } else {
            this.cacheKeyCheckEnabledAccountOrFolder = folder;
            this.cacheValueCheckEnabledAccountOrFolder = true;
            return true;
        }
    }
}



/** ****************************************************************************
 * clear visualisation
 ******************************************************************************/
ThreadVis.prototype.clearVisualisation = function() {
    if (this.logger.isDebug(this.logger.COMPONENT_VISUALISATION)) {
        this.logger.logDebug(this.logger.LEVEL_INFO,
            "ThreadVis.clearVisualisation()", {"clear" : this.clear});
    }

    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED) ) {
        return;
    }

    if (this.clear) {
        return;
    }

    this.visualisation.createStack();
    this.clear = true;

    // also clear popup
    if (this.popupWindow && ! this.popupWindow.closed) {
        this.popupWindow.THREADVIS.clearVisualisation();
    }

    // also clear legend
    if (this.legendWindow && ! this.legendWindow.closed) {
        this.legendWindow.clearLegend();
    }

    // also clear legend in opener
    if (opener && opener.THREADVIS && opener.THREADVIS.legendWindow
        && ! opener.THREADVIS.legendWindow.closed) {
        opener.THREADVIS.legendWindow.clearLegend();
    }
}



/** ****************************************************************************
 * create threadvis xul box
 ******************************************************************************/
ThreadVis.prototype.createBox = function() {
    var elem = document.getElementById("ThreadVis");
    elem.hidden = false;
}



/** ****************************************************************************
 * delete threadvis xul box
 ******************************************************************************/
ThreadVis.prototype.deleteBox = function() {
    var elem = document.getElementById("ThreadVis");
    elem.hidden = true;
}



/** ****************************************************************************
 * Display legend popup
 ******************************************************************************/
ThreadVis.prototype.displayLegend = function() {
    if (window.opener && window.opener.THREADVIS) {
        window.opener.THREADVIS.displayLegend();
    }

    if (this.legendWindow != null && ! this.legendWindow.closed) {
        this.legendWindow.displayLegend();
    }
}



/** ****************************************************************************
 * Display legend popup
 ******************************************************************************/
ThreadVis.prototype.displayLegendWindow = function() {

    if (this.visualisation.disabled) {
        return;
    }

    if (window.opener && window.opener.THREADVIS) {
        window.opener.THREADVIS.displayLegendWindow();
        return;
    }

    this.logger.log("legend", {"action" : "open"});

    if (this.legendWindow != null && ! this.legendWindow.closed) {
        this.legendWindow.focus();
        return;
    }

    var flags = "chrome=yes,resizable=no,alwaysRaised=yes,dependent=yes,dialog=yes";
    this.legendWindow =
        window.openDialog("chrome://threadvis/content/Legend.xul", "ThreadVisLegend", flags);
}



/** ****************************************************************************
 * Display notes
 ******************************************************************************/
ThreadVis.prototype.displayNotes = function() {
    var showedNotes = this.preferences
        .getPreference(this.preferences.PREF_NOTES);
    for (var i = showedNotes + 1; i <= this.NOTES; i++) {
        this.strings = document.getElementById("ThreadVisStrings");
        var note = this.strings.getString("notes." + i);
        alert(note);
    }
    this.preferences.setPreference(this.preferences.PREF_NOTES,
        this.NOTES, this.preferences.PREF_INT);
}



/** ****************************************************************************
 * display a popup window for the visualisation
 ******************************************************************************/
ThreadVis.prototype.displayVisualisationWindow = function() {

    if (this.visualisation.disabled) {
        return;
    }

    this.logger.log("popupvisualisation", {"action" : "open"});

    if (this.popupWindow != null && ! this.popupWindow.closed) {
        this.popupWindow.focus();
        return;
    }

    var flags = "chrome=yes,resizable=yes,alwaysRaised=yes,dependent=yes";
    this.popupWindow = window.openDialog("chrome://threadvis/content/ThreadVisPopup.xul",
        "ThreadVisPopup", flags);
    this.deleteBox();
    this.visualisedMsgId = null;
}



/** ****************************************************************************
 * Get legend object
 ******************************************************************************/
ThreadVis.prototype.getLegend = function() {
    if (this.popupWindow && this.popupWindow.THREADVIS) {
        return this.popupWindow.THREADVIS.visualisation.legend;
    } else {
        return this.visualisation.legend;
    }
}



/** ****************************************************************************
 * Return main window object
******************************************************************************/
ThreadVis.prototype.getMainWindow = function() {
    var w = window;

    while (w != null) {
        if (typeof(w.GetThreadTree) == "function") {
            return w;
        }
        w = window.opener;
    }

    return null;
}



/** ****************************************************************************
 * init object
******************************************************************************/
ThreadVis.prototype.init = function() {
    if (this.threadvisParent) {
        this.logger = this.threadvisParent.logger;
        this.threader = this.threadvisParent.getThreader();
        this.server = this.threadvisParent.server;
        this.preferences = this.threadvisParent.preferences;
        this.cache = this.threadvisParent.cache;
    }
    else {
        var ref = this;
        this.preferences = new PreferenceObserver();
        this.preferences.registerCallback(this.preferences.PREF_DISABLED_ACCOUNTS,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_DISABLED_FOLDERS,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_ENABLED,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_TIMELINE,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_TIMESCALING,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_DOTSIZE,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_MINHEIGHT,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_RADIUS,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_DIFFERENCE,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_WIDTH,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_SPACING,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_COLOUR,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_VIS_OPACITY,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_ZOOM_HEIGHT,
            function(value) {ref.preferenceChanged(value);});
        this.preferences.registerCallback(this.preferences.PREF_ZOOM_WIDTH,
            function(value) {ref.preferenceChanged(value);});

        this.cache = new Cache(this);
        // only create logger object if extension is enabled
        if (this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
            this.logger = new Logger();
        }
    }

    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        this.deleteBox();
        return;
    }

    this.logger.log("threadvis", {"action": "startup"});

    // create box object
    this.createBox();

    // visualisation object
    if (! this.visualisation) {
        this.visualisation = new Visualisation();
    }

    this.clearVisualisation();

    // check to see if parent threadvis object exists
    if (this.threadvisParent) {
        // visualise selected message
        this.visualise(this.threadvisParent.selectedContainer);
        return;
    } else {
        if (! this.threader)
            this.threader= new Threader();
    }

    /* ************************************************************************
     * code below only gets executed if no parent threadvis object was found
     * ***********************************************************************/

    // remember msgkey of selected message
    this.selectedMsgKey = "";

    // remember msgkey of visualised message
    this.visualisedMsgId = "";

    // remember container of selected message
    this.selectedContainer = null;

    // add messages when we display first header
    // register this as event handler later
    var ref = this;
    this.doLoad = {
        onStartHeaders: function() {ref.setSelectedMessage();},
        onEndHeaders: function() {}
    };
    gMessageListeners.push(this.doLoad);

    // add folder listener, so that we can add newly received
    // messages
    this.folderListener = {
        OnItemAdded: function(parentItem, item, view) {
            // this is called
            // POP:  - when new msgs arrive
            //       - when moving messages from one folder to another
            // IMAP: - only when new msgs arrive
            //       - NOT when moving messages!!
            ref.onItemAdded(parentItem, item, view);
        },
        OnItemRemoved: function(parentItem, item, view) {
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

    if (! this.gMailSession) {
        this.gMailSession = Components.classes["@mozilla.org/messenger/services/session;1"]
            .getService(Components.interfaces.nsIMsgMailSession);
    }

    var notifyFlags = Components.interfaces.nsIFolderListener.all;
    this.gMailSession.AddFolderListener(this.folderListener, notifyFlags);

    addEventListener("unload", function() {ref.unloadHandler()}, false);
}



/** ****************************************************************************
 * log all JavaScript errors to logfile
 ******************************************************************************/
ThreadVis.prototype.logJavaScriptErrors = function(message, file, line) {
    THREADVIS.logger.log("threadvis-jserror", {"message": message,
        "file" : file, "line" : line});
}



/** ****************************************************************************
 * called when a new message is saved to a folder
 ******************************************************************************/
ThreadVis.prototype.onItemAdded = function(parentItem, item, view) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "onItemAdded", {});
    }

    var ref = this;
    clearTimeout(this.timeoutItemAdded);
    if (item instanceof Components.interfaces.nsIMsgDBHdr) {
        this.timeoutItemAdded = setTimeout(function() {
            this.cache.updateNewMessages(item, false);
        }, 1000);
    }
}



/** ****************************************************************************
 * called when popup window gets closed
 ******************************************************************************/
ThreadVis.prototype.onVisualisationWindowClose = function() {
    this.logger.log("popupvisualisation", {"action" : "close"});
    this.threadvisParent.setSelectedMessage();
}



/** ****************************************************************************
 * Open the options dialog for this extension
 ******************************************************************************/
ThreadVis.prototype.openThreadVisOptionsDialog = function() {
    if (typeof(openOptionsDialog) == "undefined") {
        // Mozilla doesn't know about openOptionsDialog, so we use goPreferences.
        // Although Thunderbird also knows goPreferences, Thunderbird 1.5
        // has some problems with it, so we use it only for Mozilla and use
        // openOptionsDialog for Thunderbird. For details see comments below.
        goPreferences('threadvis', 'chrome://threadvis/content/Settings.xul',
            'threadvis');
    } else {
        // Thunderbird knows both goPreferences and openOptionsDialog
        // but Thunderbird 1.5 doesn't do well with goPreferences.
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
        // for the preferences window, which leads to the problem that we need
        // to have two separate XUL files to edit the preferences for this
        // extension.
        //
        // So we have Settings15.xul which gets used in Thunderbird 1.5 (and 
        // which defines the paneThreadVis component which gets passed as
        // aPaneID), and we have Settings.xul which gets used in
        // Thunderbird < 1.5 and Mozilla (which URL gets passed as paneURL).
        openOptionsDialog('paneThreadVis',
            'chrome://threadvis/content/Settings.xul');
    }
}



/** ****************************************************************************
 * preference changed
 ******************************************************************************/
ThreadVis.prototype.preferenceChanged = function(enabled) {
    this.visualisation.changed = true;

    if (this.popupWindow && this.popupWindow.THREADVIS)
        this.popupWindow.THREADVIS.visualisation.changed = true;

    this.doLoad.onStartHeaders();
}



/** ****************************************************************************
 * Called when a message is selected
 * Call visualisation with messageid to visualise
 ******************************************************************************/
ThreadVis.prototype.setSelectedMessage = function() {
    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        this.visualisation.disabled = true;
        this.visualisation.displayDisabled();
        this.visualisedMsgId = null;
        return;
    }
    if (! this.checkEnabledAccountOrFolder()) {
        this.visualisation.disabled = true;
        this.visualisation.displayDisabled();
        this.visualisedMsgId = null;
        return;
    }

    this.visualisation.disabled = false;

    if (this.logger.isDebug(this.logger.COMPONENT_EMAIL)) {
        this.logger.logDebug(this.logger.LEVEL_INFO,
            "ThreadVis.setSelectedMessage()", {});
    }

    // get currently loaded message
    var msgUri = GetLoadedMessage();
    var msg = messenger.messageServiceFromURI(msgUri).messageURIToMsgHdr(msgUri);

    var loadedMsgFolder = msg.folder;
    this.rootFolder = loadedMsgFolder.rootFolder;
    this.server = loadedMsgFolder.server;
    this.account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(this.server);

    // only log as a "user" select if this message was not already
    // selected by the extension
    if (this.selectedMsgKey != msg.messageKey) {
        this.logger.log("msgselect", {"from" : "user", "key" : msg.messageKey});
    }

    if (this.server.key != msg.folder.server.key) {
        // user just switched account
        this.logger.log("switchaccount", {});
    }

    // delay display to give UI time to layout
    var ref = this;
    setTimeout(function(){ref.visualiseMessage(msg);}, 100);
}



/** ****************************************************************************
 * close log file on unload
 ******************************************************************************/
ThreadVis.prototype.unloadHandler = function() {
    this.logger.log("threadvis", {"action": "unload"});
    this.logger.close();
    this.threader.closeCopyCut();
}



/** ****************************************************************************
 * Visualise a container
 ******************************************************************************/
ThreadVis.prototype.visualise = function(container) {
    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        return;
    }
    if (! this.checkEnabledAccountOrFolder()) {
        return;
    }

    if (this.logger.isDebug(this.logger.COMPONENT_VISUALISATION)) {
        this.logger.logDebug(this.logger.LEVEL_INFO,
            "ThreadVis.visualise()", {"container" : container});
    }
    
    var msgKey = container.isDummy() ? "DUMMY" : container.getMessage().getKey();
    var topContainerMsgKey = container.getTopContainer().isDummy() ? "DUMMY" :
        container.getTopContainer().getMessage().getKey();
    var msgCount = container.getTopContainer().getCountRecursive();

    this.logger.log("visualise", {"msgkey" : msgKey, "top container" : 
        topContainerMsgKey, "msgcount" : msgCount});

    this.clear = false;
    this.createBox();
    this.visualisation.visualise(container);
    this.selectedContainer = container;
}



/** ****************************************************************************
 * visualise a message id
 * find the container
 * call method visualise(container)
 ******************************************************************************/
ThreadVis.prototype.visualiseMessage = function(message) {
    if (this.visualisedMsgId == message.messageId) {
        return;
    }

    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        return;
    }
    if (! this.checkEnabledAccountOrFolder()) {
        return;
    }

    if (this.logger.isDebug(this.logger.COMPONENT_VISUALISATION)) {
        this.logger.logDebug(this.logger.LEVEL_INFO,
            "ThreadVis.visualiseMsgId()", {"message-id" : message.messageId});
    }

    // try to find in threader
    var container = this.getThreader().findContainer(message.messageId);
    var cache = "";

    if (container != null && ! container.isDummy()) {
        cache = "[" + container.getTopContainer().getCache() + "]";
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "visualise", {"action" : "container already in threader",
                    "cache" : cache});
        }
    }

    // if not in threader, try to get from cache
    if (container == null || container.isDummy()) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                "visualise", {"action" : "message not in threader, getting from cache"});
        }
        cache = this.cache.getCache(message);
        container = this.getThreader().findContainer(message.messageId);
    }

    // not in threader, not in cache. add to threader
    if (container == null || container.isDummy()) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                "visualise", {"action" : "message not in cache, update new messages"});
        }
        this.cache.updateNewMessages(message, true);
        return;
    }

    var newCache = "[" + container.getTopContainer().getCache() + "]";
    if (cache != newCache) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                "visualise", {"action" : "cache changed, writing new",
                    "old" : cache,
                    "new" : newCache});
        }
        this.cache.updateCache(container, message.folder.rootFolder);
    }

    this.visualisedMsgId = message.messageId;

    if (container != null && ! container.isDummy()) {
        // visualise any popup windows that might exist
        if (this.popupWindow && this.popupWindow.THREADVIS) {
            this.popupWindow.THREADVIS.visualise(container);
        } else {
            this.visualise(container);
        }
    } else {
        // - message id not found, or
        // - container with id was dummy
        // this means we somehow missed to thread this message
        // thus, thread the whole folder we are in
        if (this.popupWindow && this.popupWindow.THREADVIS) {
            this.popupWindow.THREADVIS.clearVisualisation();
        } else {
            this.clearVisualisation();
        }
    }
    container = null;
}



/** ****************************************************************************
 * Zoom function to call from user click
 ******************************************************************************/
ThreadVis.prototype.zoomIn = function() {
    this.visualisation.zoomIn();
}



/** ****************************************************************************
 * Zoom function to call from user click
 ******************************************************************************/
ThreadVis.prototype.zoomOut = function() {
    this.visualisation.zoomOut();
}



/** ****************************************************************************
 * Get the threader object
 ******************************************************************************/
ThreadVis.prototype.getThreader = function() {
    return this.threader;
}



/** ****************************************************************************
 * Set the status text in the statusbar
 ******************************************************************************/
ThreadVis.prototype.setStatus = function(text) {
    var elem = document.getElementById("ThreadVisStatusText");
    elem.label = text;
}
