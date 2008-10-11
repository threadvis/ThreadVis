/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2005-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Main JavaScript file.
 *
 * $Id$
 ******************************************************************************/

if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}

var THREADVIS = null;

// add visualisation at startup
addEventListener("load", function() {
    ThreadVisNS.createThreadVis();
}, false);



/** ****************************************************************************
 * Create one and only one threadvis object
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.createThreadVis = function() {
    var threadvisParent = ThreadVisNS.checkForThreadVis(window);
    if (THREADVIS == null) {
        THREADVIS = new ThreadVisNS.ThreadVis(threadvisParent);
        THREADVIS.init();
        window.onerror = THREADVIS.logJavaScriptErrors;
    }
}



/** ****************************************************************************
 * Check all openers for threadvis
 *
 * @param win
 *          The window object to check
 * @return
 *          A found threadvis object
 ******************************************************************************/
ThreadVisNS.checkForThreadVis = function(win) {
    if (! win) {
        return null;
    }

    if (win.THREADVIS) {
        return win.THREADVIS;
    }

    if (win.parent && win != win.parent) {
        return ThreadVisNS.checkForThreadVis(win.parent);
    }

    if (win.opener) {
        return ThreadVisNS.checkForThreadVis(win.opener);
    }

    return null;
}



/** ****************************************************************************
 * Constructor
 *
 * @param threadvisparent
 *          Link to parent object (if it exists)
 * @return
 *          A new ThreadVis object
 ******************************************************************************/
ThreadVisNS.ThreadVis = function(threadvisParent) {
    this.XUL_NAMESPACE =
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    this.SVG_NAMESPACE =
        "http://www.w3.org/2000/svg";

    // increment this to trigger about dialog
    this.ABOUT = 1;

    // store SVG enabled
    this.SVG = false;

    this.clear = false;

    this.strings = document.getElementById("ThreadVisStrings");

    // store server to react to server switch
    this.server = null;

    // if parent object exists, reuse some of the internal objects
    this.threadvisParent = threadvisParent;

    // cache enabled account/folder
    this.cacheKeyCheckEnabledAccountOrFolder = null;
    this.cacheValueCheckEnabledAccountOrFolder = null;

    // remember all local accounts, for sent-mail comparison
    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var identities = accountManager.allIdentities.QueryInterface(
        Components.interfaces.nsICollection).Enumerate();
    var done = false;
    this.sentMailIdentities = new Object();
    while (! done) {
        try {
            var identity = identities.currentItem().QueryInterface(
                Components.interfaces.nsIMsgIdentity);
        } catch (e) {
            done = true;
        }
        if (identity) {
            this.sentMailIdentities[identity.email] = true;
        }
        try {
            identities.next();
        } catch (e) {
            done = true;
        }
    }
}



/** ****************************************************************************
 * Add a message to the threader
 *
 * @param header
 *          The message to add
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.addMessage = function(header) {
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

    var message = new ThreadVisNS.Message(header.mime2DecodedSubject,
        header.mime2DecodedAuthor, header.messageId, header.messageKey, date,
        header.folder.URI, header.getStringProperty("references"), false);

    // see if msg is a sent mail
    var issent = IsSpecialFolder(header.folder, MSG_FOLDER_FLAG_SENTMAIL, true)
        || this.sentMailIdentities[message.getFromEmail()] == true;

    message.setSent(issent);
    this.getThreader().addMessage(message);

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_EMAIL)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "addMessageToThreader", {"message" : message});
    }
}



/** ****************************************************************************
 * Callback function from extension. Called after mouse click in extension
 * Select message in mail view.
 *
 * @param msgKey
 *          The message key of the selected message
 * @param folder
 *          The folder of the message
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.callback = function(msgKey, folder) {
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
 *
 * @param folder
 *          The folder to check
 * @return
 *          True if the folder/account is enabled, false if not.
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.checkEnabledAccountOrFolder = function(folder) {
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

    if (this.preferences.getPreference(this.preferences.PREF_DISABLED_ACCOUNTS) != ""
        && this.preferences.getPreference(this.preferences.PREF_DISABLED_ACCOUNTS)
        .indexOf(" " + account.key + " ") > -1) {
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
        if (this.preferences.getPreference(this.preferences.PREF_DISABLED_FOLDERS) != ""
            && this.preferences.getPreference(this.preferences.PREF_DISABLED_FOLDERS)
            .indexOf(" " + folder.URI + " ") > -1) {
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
 * Clear visualisation
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.clearVisualisation = function() {
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
 * Create threadvis XUL box
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.createBox = function() {
    var elem = document.getElementById("ThreadVis");
    elem.hidden = false;
}



/** ****************************************************************************
 * Delete threadvis XUL box
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.deleteBox = function() {
    var elem = document.getElementById("ThreadVis");
    elem.hidden = true;
}



/** ****************************************************************************
 * Display legend popup
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.displayLegend = function() {
    if (window.opener && window.opener.THREADVIS) {
        window.opener.THREADVIS.displayLegend();
    }

    if (this.legendWindow != null && ! this.legendWindow.closed) {
        this.legendWindow.displayLegend();
    }
}



/** ****************************************************************************
 * Display legend popup
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.displayLegendWindow = function() {
    if (this.visualisation.disabled) {
        return;
    }

    if (window.opener && window.opener.THREADVIS) {
        window.opener.THREADVIS.displayLegendWindow();
        return;
    }

    this.logger.log("legend", {"action" : "open"});

    if (this.legendWindow != null && ! this.legendWindow.closed) {
        this.legendWindow.close();
        return;
    }

    var flags = "chrome=yes,resizable=no,alwaysRaised=yes,dependent=yes,dialog=yes";
    this.legendWindow =
        window.openDialog("chrome://threadvis/content/Legend.xul", "ThreadVisLegend", flags);
}



/** ****************************************************************************
 * Display about dialog when first starting ThreadVis
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.displayAbout = function() {
    var showedAbout = this.preferences
        .getPreference(this.preferences.PREF_ABOUT);
    if (showedAbout < this.ABOUT) {
        window.openDialog("chrome://threadvis/content/About.xul",
            "ThreadVisAbout", "chrome=yes,resizable=true;alwaysRaised=false,dependent=yes");
    }
}



/** ****************************************************************************
 * Display a popup window for the visualisation
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.displayVisualisationWindow = function() {
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
    clearInterval(this.visualisation.checkResizeInterval);
    this.visualisedMsgId = null;
}



/** ****************************************************************************
 * Get legend object
 *
 * @return
 *          The legend object, null if it doesn't exist
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.getLegend = function() {
    if (this.popupWindow && this.popupWindow.THREADVIS) {
        return this.popupWindow.THREADVIS.visualisation.legend;
    } else {
        return this.visualisation.legend;
    }
}



/** ****************************************************************************
 * Return main window object
 *
 * @return
 *          The main window
******************************************************************************/
ThreadVisNS.ThreadVis.prototype.getMainWindow = function() {
    var w = window;

    while (w != null) {
        if (typeof(w.GetThreadTree) == "function") {
            return w;
        }
        w = w.opener;
    }

    return null;
}



/** ****************************************************************************
 * Get popup visualisation
 *
 * @return
 *          The popup window, null if no popup exists
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.getPopupVisualisation = function() {
    if (this.popupWindow != null && ! this.popupWindow.closed) {
        return this.popupWindow;
    }
    if (this.threadvisParent) {
        return this.threadvisParent.getPopupVisualisation();
    }
    return null;
}



/** ****************************************************************************
 * Check if a popup visualisation exists
 *
 * @return
 *          True if a popup exists, false if not
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.hasPopupVisualisation = function() {
    if (this.popupWindow != null && ! this.popupWindow.closed) {
        return true;
    }
    if (this.threadvisParent) {
        return this.threadvisParent.hasPopupVisualisation();
    }
    return false;
}



/** ****************************************************************************
 * Init object
 *
 * @return
 *          void
******************************************************************************/
ThreadVisNS.ThreadVis.prototype.init = function() {
    if (this.threadvisParent) {
        this.logger = this.threadvisParent.logger;
        this.threader = this.threadvisParent.getThreader();
        this.server = this.threadvisParent.server;
        this.preferences = this.threadvisParent.preferences;
        this.cache = this.threadvisParent.cache;
    }
    else {
        var ref = this;
        this.preferences = new ThreadVisNS.PreferenceObserver();
        this.preferences.registerCallback(this.preferences.PREF_DISABLED_ACCOUNTS,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_DISABLED_FOLDERS,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_ENABLED,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_TIMELINE,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_TIMESCALING,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_DOTSIZE,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_MINHEIGHT,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_RADIUS,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_DIFFERENCE,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ARC_WIDTH,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_SPACING,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_MESSAGE_CIRCLES,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_COLOUR,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_COLOURS_BACKGROUND,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_COLOURS_BORDER,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_COLOURS_RECEIVED,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_COLOURS_SENT,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_HIGHLIGHT,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_OPACITY,
            function(value) {ref.preferenceChanged();});
        this.preferences.registerCallback(this.preferences.PREF_VIS_ZOOM,
            function(value) {ref.preferenceChanged();});

        this.cache = new ThreadVisNS.Cache(this);
        // only create logger object if extension is enabled
        if (this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
            this.logger = new ThreadVisNS.Logger();
        }
    }

    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        this.deleteBox();
        return;
    }

    this.logger.log("threadvis", {"action": "startup"});

    // visualisation object
    if (! this.visualisation) {
        this.visualisation = new ThreadVisNS.Visualisation();
    }

    // create box object
    this.createBox();

    this.clearVisualisation();

    // check to see if parent threadvis object exists
    if (this.threadvisParent) {
        // visualise selected message
        // delay drawing until size of box is known
        this.delayDrawing();
        return;
    } else {
        if (! this.threader)
            this.threader= new ThreadVisNS.Threader();
    }

    /* ************************************************************************
     * code below only gets executed if no parent threadvis object was found
     * ***********************************************************************/

    // display about dialog and email reminder only once on each startup
    setTimeout(function() { THREADVIS.displayAbout(); }, 5000);

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
 * Delay drawing of visualisation until size of box is known
 *
 * @return
 *          void
******************************************************************************/
ThreadVisNS.ThreadVis.prototype.delayDrawing = function() {
    var boxSize = this.visualisation.getBoxSize();
    if (boxSize.width > 0) {
        this.visualise(this.threadvisParent.selectedContainer);
    } else {
        var ref = this;
        setTimeout(function() {
            ref.delayDrawing();
        }, 100);
    }
}



/** ****************************************************************************
 * Check if the current window is a message window
 *
 * @return
 *          True if the current window is a message window, false if not
******************************************************************************/
ThreadVisNS.ThreadVis.prototype.isMessageWindow = function() {
    if (this.threadvisParent &&
        document.getElementById("expandedHeaderView") != null) {
        return true;
    } else {
        return false;
    }
}



/** ****************************************************************************
 * Check if this window is a popup
 *
 * @return
 *          True if this window is a popup, false if not
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.isPopupVisualisation = function() {
    return document.documentElement.id == "ThreadVisPopup";
}



/** ****************************************************************************
 * Log all JavaScript errors to logfile
 *
 * @param message
 *          The message to log
 * @param file
 *          The file in which the error occured
 * @param line
 *          The line in which the error occured
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.logJavaScriptErrors = function(message, file,
    line) {
    THREADVIS.logger.log("threadvis-jserror", {"message": message,
        "file" : file, "line" : line});
}



/** ****************************************************************************
 * Called when a new message is saved to a folder
 *
 * @param parentItem
 *          The parent item of the message which has been added
 * @param item
 *          The item which has been added
 * @param view
 *          The view
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.onItemAdded = function(parentItem, item, view) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "onItemAdded", {item: item});
    }

    var ref = this;
    clearTimeout(this.timeoutItemAdded);
    if (item instanceof Components.interfaces.nsIMsgDBHdr) {
        // check if added to folder or account that is disabled
        if (this.checkEnabledAccountOrFolder(item.folder)) {
            /*this.timeoutItemAdded = setTimeout(function() {
                ref.cache.updateNewMessages(item, false);
            }, 1000);*/
            // TODO recheck account!
        } else {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "onItemAdded", {"stopped": "account or folder disabled"});
            }
        }
    }
}



/** ****************************************************************************
 * Called when popup window gets closed
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.onVisualisationWindowClose = function() {
    this.logger.log("popupvisualisation", {"action" : "close"});
    this.visualisedMsgId = null;
    this.threadvisParent.visualisedMsgId = null;
    this.threadvisParent.setSelectedMessage();
}



/** ****************************************************************************
 * Open the options dialog for this extension
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.openThreadVisOptionsDialog = function() {
    if (typeof(this.getMainWindow().openOptionsDialog) == "undefined") {
        // Mozilla doesn't know about openOptionsDialog, so we use goPreferences.
        // Although Thunderbird also knows goPreferences, Thunderbird 1.5
        // has some problems with it, so we use it only for Mozilla and use
        // openOptionsDialog for Thunderbird. For details see comments below.
        this.getMainWindow().goPreferences('threadvis',
            'chrome://threadvis/content/Settings.xul', 'threadvis');
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
        this.getMainWindow().openOptionsDialog('paneThreadVis',
            'chrome://threadvis/content/Settings.xul');
    }
}



/** ****************************************************************************
 * Preference changed
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.preferenceChanged = function() {
    this.visualisation.changed = true;
    this.cacheKeyCheckEnabledAccountOrFolder = null;
    this.cacheValueCheckEnabledAccountOrFolder = null;

    if (this.popupWindow && this.popupWindow.THREADVIS)
        this.popupWindow.THREADVIS.visualisation.changed = true;

    this.setSelectedMessage(true);
}



/** ****************************************************************************
 * Called after user resized visualisation using splitter
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.setMinimalWidth = function() {
    var width = document.getElementById("ThreadVis").boxObject.width;
    this.preferences.setPreference(this.preferences.PREF_VIS_MINIMAL_WIDTH,
        width, this.preferences.PREF_INT);
}



/** ****************************************************************************
 * Called when a message is selected
 * Call visualisation with messageid to visualise
 *
 * @param force
 *          True to force display of message
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.setSelectedMessage = function(force) {
    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        this.visualisation.disabled = true;
        this.visualisation.displayDisabled();
        this.visualisedMsgId = null;
        this.setStatus(null, {enabled: false});
        return;
    }
    if (! this.checkEnabledAccountOrFolder()) {
        this.visualisation.disabled = true;
        this.visualisation.displayDisabled();
        this.visualisedMsgId = null;
        this.setStatus(null, {folderEnabled: false});
        return;
    }
    this.setStatus(null, {enabled: true, folderEnabled: true});

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
    setTimeout(function(){ref.visualiseMessage(msg, force);}, 100);
}



/** ****************************************************************************
 * Close log file on unload, cancel any cache updates and close databases
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.unloadHandler = function() {
    this.logger.log("threadvis", {"action": "unload"});
    this.logger.close();
    this.threader.closeCopyCut();
    this.cache.cancel();
}



/** ****************************************************************************
 * Visualise a container
 *
 * @param container
 *          The container to visualise
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.visualise = function(container) {
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

    if (this.hasPopupVisualisation() && ! this.isPopupVisualisation()) {
        this.getPopupVisualisation().THREADVIS.visualise(container);
        return;
    }

    this.clear = false;
    this.createBox();
    this.visualisation.visualise(container);
    this.selectedContainer = container;
}



/** ****************************************************************************
 * Visualise a message. Find the container. Call visualise()
 *
 * @param message
 *          The message to visualise
 * @param force
 *          True to force the display of the visualisation
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.visualiseMessage = function(message, force) {
    if (this.visualisedMsgId == message.messageId && ! force) {
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
            "ThreadVis.visualiseMessage()", {"message-id" : message.messageId});
    }

    // try to find in threader
    var container = this.getThreader().findContainer(message.messageId);

    // if not in threader, try to get from cache
    if (container == null || container.isDummy()) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_CACHE)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                "visualise", {"action" : "message not in threader, getting from cache"});
        }
        cache = this.cache.getCache(message);
        this.cache.addToThreaderFromCache(cache, message.folder.rootFolder);
        this.getThreader().thread();
        container = this.getThreader().findContainer(message.messageId);
    }

    // not in threader, not in cache, start caching
    if (container == null || container.isDummy()) {
        var server = message.folder.server;
        var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager))
            .FindAccountForServer(server);
        var accountKey = account.key;
        account = null;
        delete account;
        server = null;
        delete server;

        this.cache.checkAccount(accountKey);
        this.clearVisualisation();
        // register for event
        var ref = this;
        this.cache.register("onCacheDone", function() {
            // check if message is now in cache
            if (! ref.cache.isCached(message.messageId, accountKey)) {
                ref.cache.cacheMessage(message, accountKey);
                if (! ref.cache.isCached(message.messageId, accountKey)) {
                    this.setStatus("Cache error");
                    return;
                }
            }
            ref.setSelectedMessage(force);
        });
        return;
    }

    this.visualisedMsgId = message.messageId;

    // clear threader
    //this.threader.reset();

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
        // TODO: check this error
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
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.zoomIn = function() {
    this.visualisation.zoomIn();
}



/** ****************************************************************************
 * Zoom function to call from user click
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.zoomOut = function() {
    this.visualisation.zoomOut();
}



/** ****************************************************************************
 * Get the threader object
 *
 * @return
 *          The shared threader
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.getThreader = function() {
    return this.threader;
}



/** ****************************************************************************
 * Set the status text in the statusbar
 *
 * @param text
 *          The text to display
 * @param tooltip
 *          Tooltip data to display
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.setStatus = function(text, tooltip) {
    if (text != null) {
        var elem = document.getElementById("ThreadVisStatusText");
        if (text != "") {
            elem.value = text;
        } else {
            elem.value = elem.getAttribute("defaultvalue");
        }
    }
    if (typeof(tooltip) != "undefined") {
        if (typeof(tooltip.enabled) != "undefined") {
            if (tooltip.enabled) {
                document.getElementById("ThreadVisStatusTooltipDisabled").hidden = true;
            } else {
                document.getElementById("ThreadVisStatusTooltipDisabled").hidden = false;
                document.getElementById("ThreadVisStatusMenuEnableFolder").setAttribute("disabled", true);
                document.getElementById("ThreadVisStatusMenuDisableFolder").setAttribute("disabled", true);
            }
        }
        if (typeof(tooltip.folderEnabled) != "undefined") {
            if (tooltip.folderEnabled) {
                document.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = true;
                document.getElementById("ThreadVisStatusTooltipFolderEnabled").hidden = false;
                document.getElementById("ThreadVisStatusMenuEnableFolder").setAttribute("disabled", true);
                document.getElementById("ThreadVisStatusMenuDisableFolder").setAttribute("disabled", false);
            } else {
                document.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = false;
                document.getElementById("ThreadVisStatusTooltipFolderEnabled").hidden = true;
                document.getElementById("ThreadVisStatusMenuEnableFolder").setAttribute("disabled", false);
                document.getElementById("ThreadVisStatusMenuDisableFolder").setAttribute("disabled", true);
            }
        }
        if (typeof(tooltip.updateCache) != "undefined") {
            if (tooltip.updateCache == null) {
                document.getElementById("ThreadVisStatusTooltipCache").hidden = true;
                document.getElementById("ThreadVisStatusTooltipCacheRethread").hidden = true;
            } else {
                document.getElementById("ThreadVisStatusTooltipCache").hidden = false;
                if (tooltip.updateCache.message) {
                    document.getElementById("ThreadVisStatusTooltipCacheMessage").value =
                        tooltip.updateCache.message.mime2DecodedSubject + " / " +
                        tooltip.updateCache.message.mime2DecodedAuthor;
                }
                if (tooltip.updateCache.accountKey) {
                    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                        .getService(Components.interfaces.nsIMsgAccountManager))
                        .getAccount(tooltip.updateCache.accountKey);
                    document.getElementById("ThreadVisStatusTooltipCacheAccountName").value =
                        account.incomingServer.prettyName;
                }
                if (tooltip.updateCache.rethread) {
                    document.getElementById("ThreadVisStatusTooltipCacheRethread").hidden = false;
                }
            }
        }
    }
}



/** ****************************************************************************
 * Disable for current folder
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.disableCurrentFolder = function() {
    // get currently displayed folder
    var folder = this.getMainWindow().GetLoadedMsgFolder();
    if (folder) {
        var folderSetting = this.preferences.getPreference(
            this.preferences.PREF_DISABLED_FOLDERS);

        folderSetting = folderSetting + " " + folder.URI;

        this.preferences.setPreference(
            this.preferences.PREF_DISABLED_FOLDERS,
            folderSetting,
            this.preferences.PREF_STRING);
    }
}



/** ****************************************************************************
 * Enable for current folder
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.enableCurrentFolder = function() {
    // get currently displayed folder
    var folder = this.getMainWindow().GetLoadedMsgFolder();
    if (folder) {
        var folderSetting = this.preferences.getPreference(
            this.preferences.PREF_DISABLED_FOLDERS);

        var index = folderSetting.indexOf(" " + folder.URI + " ");
        folderSetting = folderSetting.substring(0, index)
            + folderSetting.substring(index + folder.URI.length);
 
        this.preferences.setPreference(
            this.preferences.PREF_DISABLED_FOLDERS,
            folderSetting,
            this.preferences.PREF_STRING);
    }
}
