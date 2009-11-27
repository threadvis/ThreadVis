/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.mozdev.org/
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with ThreadVis. If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *****************************************************************************
 * Main JavaScript file.
 ******************************************************************************/



//Components.utils.import("resource://app/modules/gloda/public.js");

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

    // Set up folder flags
    // Keep backward compatibility. TB2 has the globals MSG_FOLDER_FLAG_*,
    // TB3 uses the Components.interfaces.nsMsgFolderFlags.* objects.
    try {
        this.MSG_FOLDER_FLAG_VIRTUAL = Components.interfaces.nsMsgFolderFlags.Virtual;
    } catch (ex) {
        this.MSG_FOLDER_FLAG_VIRTUAL = MSG_FOLDER_FLAG_VIRTUAL;
    }
    try {
        this.MSG_FOLDER_FLAG_SENTMAIL = Components.interfaces.nsMsgFolderFlags.SentMail;
    } catch (ex) {
        this.MSG_FOLDER_FLAG_SENTMAIL = MSG_FOLDER_FLAG_SENTMAIL;
    }

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

    // check if msg is a sent mail
    var issent = false;
    // it is sent if it is stored in a folder that is marked as sent (if enabled)
    issent |= IsSpecialFolder(header.folder, THREADVIS.MSG_FOLDER_FLAG_SENTMAIL, true) &&
        this.preferences.getPreference(this.preferences.PREF_SENTMAIL_FOLDERFLAG);
    // or it is sent if the sender address is a local identity (if enabled)
    issent |= this.sentMailIdentities[message.getFromEmail()] == true &&
        this.preferences.getPreference(this.preferences.PREF_SENTMAIL_IDENTITY);
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
 * @param message
 *          The message to display
 * @param isMessageWindow
 *          True if standalone window
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.callback = function(message, isMessageWindow) {
    if (! this.preferences.getPreference(this.preferences.PREF_ENABLED)) {
        return;
    }

    this.selectedMsgKey = message.getKey();
    // re-search message in case its folder has changed
    // TODO eventually switch to MailUtils
    var folder = GetMsgFolderFromUri(message.getFolder(), true);
    var msg = this.cache.searchMessageByMsgId(message.getId(), folder.rootFolder);

    if (! isMessageWindow) {
        gFolderTreeView.selectFolder(msg.folder);
    }
    gFolderDisplay.clearSelection();
    gFolderDisplay.show(msg.folder);

    gFolderDisplay.selectMessage(msg);
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
        if (! this.threader) {
            this.threader= new ThreadVisNS.Threader(this.cache);
        }
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

    // remember selected message
    this.selectedMsgUri = "";

    // remember container of selected message
    this.selectedContainer = null;

    // register for message selection
    var ref = this;
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver({
        observe: function(subject, topic, data) {
            ref.selectedMsgUri = data;
            ref.setSelectedMessage();
        }
    }, "MsgMsgDisplayed", false);

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
    var msg = messenger.messageServiceFromURI(this.selectedMsgUri)
        .messageURIToMsgHdr(this.selectedMsgUri);

    /*
     * THIS WILL WORK SOMEDAY WHEN GLODA ACTUALLY INDEXES ALL MESSAGES
    var glodaMessage = Gloda.getMessageCollectionForHeader(msg, {
        onItemsAdded: function(items, collection) {
    }, onQueryCompleted: function(collection) {
    	var found = collection.items.length > 0;
    	if (found) {
    		var message = collection.items[0];
    		message.conversation.getMessagesCollection({
    			onQueryCompleted: function(collection) {
    				alert("conversation: " + collection.items.length);
    				for (var i = 0; i < collection.items.length; i++) {
    					alert(collection.items[i].from);
    				}
    		}
    		}, null);
    	} else {
    		alert("no gloda message for: " + msg);
    	}
    }
    }, null);
    */

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

    // if user wants to hide visualisation if it only consists of a single
    // message, do so, but not in popup visualisation
    if (msgCount == 1 &&
        this.preferences.getPreference(this.preferences.PREF_VIS_HIDE_ON_SINGLE) &&
        ! this.isPopupVisualisation()) {
        this.visualisation.disabled = true;
        this.visualisation.displayDisabled(true);
        this.visualisedMsgId = null;
        this.selectedContainer = null;
        return;
    }

    this.clear = false;
    this.createBox();
    this.visualisation.disabled = false;
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
        var server = message.folder.server;
        var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager))
            .FindAccountForServer(server);
        var accountKey = account.key;
        account = null;
        delete account;
        server = null;
        delete server;

        cache = this.cache.getCache(message);
        this.cache.addToThreaderFromCache(cache, message.folder.rootFolder);
        this.getThreader().thread(accountKey);
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
