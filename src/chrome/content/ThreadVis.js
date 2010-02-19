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
 * Copyright (C) 2007, 2008, 2009, 2010 Alexander C. Hubmann-Haidvogel
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

    // increment this to trigger about dialog
    this.ABOUT = 1;

    this.clear = false;

    this.strings = document.getElementById("ThreadVisStrings");

    // store server to react to server switch
    this.server = null;

    // if parent object exists, reuse some of the internal objects
    this.threadvisParent = threadvisParent;

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
    if (! this.checkEnabled()) {
        return;
    }

    // re-search message in case its folder has changed
    var folder = MailUtils.getFolderForURI(message.getFolder(), true);
    var msg = this.cache.searchMessageByMsgId(message.getId(), folder.rootFolder);

    if (! isMessageWindow) {
        gFolderTreeView.selectFolder(msg.folder);
    }
    gFolderDisplay.clearSelection();
    gFolderDisplay.show(msg.folder);

    gFolderDisplay.selectMessage(msg);
}



/** ****************************************************************************
 * Check if extension and all needed other parts (e.g. gloda) are enabled
 *
 * @return
 *          True if the extension is enabled, false if not.
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.checkEnabled = function() {
    var threadvisEnabled =
        this.preferences.getPreference(this.preferences.PREF_ENABLED);
    var glodaEnabled =
        this.preferences.getPreference(this.preferences.PREF_GLODA_ENABLED);
    return threadvisEnabled && glodaEnabled;
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
        folder = this.getMainWindow().gFolderDisplay.displayedFolder;
    }
    if (! folder) {
        return false;
    }

    var server = folder.server;
    var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(server);

    if (this.preferences.getPreference(this.preferences.PREF_DISABLED_ACCOUNTS) != ""
        && this.preferences.getPreference(this.preferences.PREF_DISABLED_ACCOUNTS)
        .indexOf(" " + account.key + " ") > -1) {
        return false;
    } else {
        if (this.preferences.getPreference(this.preferences.PREF_DISABLED_FOLDERS) != ""
            && this.preferences.getPreference(this.preferences.PREF_DISABLED_FOLDERS)
            .indexOf(" " + folder.URI + " ") > -1) {
            return false;
        } else {
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
    if (! this.checkEnabled()) {
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
        this.threader = this.threadvisParent.getThreader();
        this.server = this.threadvisParent.server;
        this.preferences = this.threadvisParent.preferences;
        this.cache = this.threadvisParent.cache;
    } else {
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

        // display about dialog and email reminder only once on each startup
        setTimeout(function() { THREADVIS.displayAbout(); }, 5000);
    }

    if (! this.checkEnabled()) {
        this.deleteBox();
        return;
    }

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
            this.threader= new ThreadVisNS.Threader();
        }
    }

    /* ************************************************************************
     * code below only gets executed if no parent threadvis object was found
     * ***********************************************************************/

    // remember msgid of visualised message
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
 * Called when popup window gets closed
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.onVisualisationWindowClose = function() {
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
    this.getMainWindow().openOptionsDialog('paneThreadVis', null);
}



/** ****************************************************************************
 * Preference changed
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ThreadVis.prototype.preferenceChanged = function() {
    this.visualisation.changed = true;

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
    if (! this.checkEnabled()) {
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

    // get currently loaded message
    var msg = messenger.messageServiceFromURI(this.selectedMsgUri)
        .messageURIToMsgHdr(this.selectedMsgUri);

    var loadedMsgFolder = msg.folder;
    this.rootFolder = loadedMsgFolder.rootFolder;
    this.server = loadedMsgFolder.server;
    this.account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager))
        .FindAccountForServer(this.server);

    // delay display to give UI time to layout
    var ref = this;
    setTimeout(function(){ref.visualiseMessage(msg, force);}, 100);
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
    if (! this.checkEnabled() || ! this.checkEnabledAccountOrFolder()) {
        return;
    }

    var msgCount = container.getTopContainer().getCountRecursive();

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

    if (! this.checkEnabled() || ! this.checkEnabledAccountOrFolder()) {
        return;
    }

    // try to find in threader
    var container = this.getThreader().findContainer(message.messageId);

    // if not in threader, try to get from cache
    if (container == null || container.isDummy()) {
        var ref = this;
        this.cache.getCache(message, function() {
            ref.visualiseMessage(message, force);
        });
        return;
    }

    // not in threader, not in cache, start caching
    if (container == null || container.isDummy()) {
        alert("NOT IN CACHE");
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
