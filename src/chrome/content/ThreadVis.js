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

// add visualisation at startup
addEventListener("load", function() {
    ThreadVis.init();
}, false);
addEventListener("close", function() {
    if (ThreadVis.hasPopupVisualisation()) {
        ThreadVis.popupWindow.close();
    }
    if (ThreadVis.legendWindow && !ThreadVis.legendWindow.closed) {
        ThreadVis.legendWindow.close();
    }
}, false);

var ThreadVis = (function(ThreadVis) {

    Components.utils.import("resource://app/modules/StringBundle.js");

    ThreadVis.XUL_NAMESPACE = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    // increment this to trigger about dialog
    ThreadVis.ABOUT = 1;

    ThreadVis.strings = new StringBundle(
            "chrome://threadvis/locale/ThreadVis.properties");

    // remember all local accounts, for sent-mail comparison
    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
    var identities = accountManager.allIdentities.QueryInterface(
            Components.interfaces.nsICollection).Enumerate();
    var done = false;
    ThreadVis.sentMailIdentities = {};
    while (!done) {
        try {
            var identity = identities.currentItem().QueryInterface(
                    Components.interfaces.nsIMsgIdentity);
        } catch (e) {
            done = true;
        }
        if (identity) {
            ThreadVis.sentMailIdentities[identity.email] = true;
        }
        try {
            identities.next();
        } catch (e) {
            done = true;
        }
    }

    /***************************************************************************
     * Callback function from extension. Called after mouse click in extension
     * Select message in mail view.
     * 
     * @param message
     *            The message to display
     * @return void
     **************************************************************************/
    ThreadVis.callback = function(message) {
        if (!ThreadVis.checkEnabled()) {
            return;
        }

        // get the original nsIMsgDBHdr from the message. this may be null if it
        // is not found (i.e. index out-of-date or folder index (msf) corrupt).
        var msg = message.getMsgDbHdr();
        if (msg == null) {
            ThreadVis.setStatus(null, {
                error : true,
                errorText : ThreadVis.strings
                        .getString("error.messagenotfound")
            });
            return;
        }

        // for sake of simplicity, assume we are in a folder view, unless told
        // otherwise
        var currentTabMode = "folder";
        var tabmail = document.getElementById("tabmail");
        if (tabmail) {
            currentTabMode = tabmail.selectedTab.mode.name;
        }

        // if in standard 3-pane (folder) view, select new
        // folder, switch to folder and display message
        if (currentTabMode == "folder") {
            if (gFolderTreeView) {
                gFolderTreeView.selectFolder(msg.folder);
            }
            if (gFolderDisplay) {
                gFolderDisplay.show(msg.folder);
                gFolderDisplay.selectMessage(msg);
            }
        } else if (currentTabMode == "message") {
            ThreadVis
                    .log(
                            "message switching",
                            "Currently, switching messages is not possible when viewing a message in a tab.")
        }
    }

    /***************************************************************************
     * Check if extension and all needed other parts (e.g. gloda) are enabled
     * 
     * @return True if the extension is enabled, false if not.
     **************************************************************************/
    ThreadVis.checkEnabled = function() {
        return ThreadVis.checkEnabledThreadVis()
                && ThreadVis.checkEnabledGloda();
    }

    /***************************************************************************
     * Check if extension is disabled
     * 
     * @return True if the extension is enabled, false if not.
     **************************************************************************/
    ThreadVis.checkEnabledThreadVis = function() {
        var threadvisEnabled = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_ENABLED);
        return threadvisEnabled;
    }

    /***************************************************************************
     * Check GloDa is enabled
     * 
     * @return True if the gloda is enabled, false if not.
     **************************************************************************/
    ThreadVis.checkEnabledGloda = function() {
        var glodaEnabled = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_GLODA_ENABLED);
        return glodaEnabled;
    }

    /***************************************************************************
     * Check if current account is enabled in extension
     * 
     * @param folder
     *            The folder to check
     * @return True if the account is enabled, false if not.
     **************************************************************************/
    ThreadVis.checkEnabledAccount = function(folder) {
        if (!folder) {
            return false;
        }

        var server = folder.server;
        var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                .getService(Components.interfaces.nsIMsgAccountManager))
                .FindAccountForServer(server);

        if (ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS) != ""
                && ThreadVis.Preferences.getPreference(
                        ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS).indexOf(
                        " " + account.key + " ") > -1) {
            return false;
        }
        return true;
    }

    /***************************************************************************
     * Check if current folder is enabled in extension
     * 
     * @param folder
     *            The folder to check
     * @return True if the folder is enabled, false if not.
     **************************************************************************/
    ThreadVis.checkEnabledFolder = function(folder) {
        if (!folder) {
            return false;
        }

        if (ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_DISABLED_FOLDERS) != ""
                && ThreadVis.Preferences.getPreference(
                        ThreadVis.Preferences.PREF_DISABLED_FOLDERS).indexOf(
                        " " + folder.URI + " ") > -1) {
            return false;
        }
        return true;
    }

    /***************************************************************************
     * Check if current account is enabled in extension
     * 
     * @param folder
     *            The folder to check
     * @return True if the folder/account is enabled, false if not.
     **************************************************************************/
    ThreadVis.checkEnabledAccountOrFolder = function(folder) {
        return ThreadVis.checkEnabledAccount(folder)
                && ThreadVis.checkEnabledFolder(folder);
    }

    /***************************************************************************
     * Clear visualisation
     * 
     * @return void
     **************************************************************************/
    ThreadVis.clearVisualisation = function() {
        if (!ThreadVis.checkEnabled()) {
            return;
        }

        ThreadVis.visualisation.createStack();

        // also clear popup
        if (ThreadVis.hasPopupVisualisation()) {
            ThreadVis.popupWindow.ThreadVis.clearVisualisation();
        }

        // also clear legend
        if (ThreadVis.legendWindow && !ThreadVis.legendWindow.closed) {
            ThreadVis.legendWindow.clearLegend();
        }

        // also clear legend in opener
        if (opener && opener.ThreadVis && opener.ThreadVis.legendWindow
                && !opener.ThreadVis.legendWindow.closed) {
            opener.ThreadVis.legendWindow.clearLegend();
        }
    }

    /***************************************************************************
     * Create threadvis XUL box
     * 
     * @return void
     **************************************************************************/
    ThreadVis.createBox = function() {
        var elem = document.getElementById("ThreadVis");
        elem.hidden = false;
    }

    /***************************************************************************
     * Delete threadvis XUL box
     * 
     * @return void
     **************************************************************************/
    ThreadVis.deleteBox = function() {
        var elem = document.getElementById("ThreadVis");
        elem.hidden = true;
    }

    /***************************************************************************
     * Display legend popup
     * 
     * @return void
     **************************************************************************/
    ThreadVis.displayLegend = function() {
        if (window.opener && window.opener.ThreadVis) {
            window.opener.ThreadVis.displayLegend();
        }

        if (ThreadVis.legendWindow != null && !ThreadVis.legendWindow.closed) {
            ThreadVis.legendWindow.displayLegend();
        }
    }

    /***************************************************************************
     * Display legend popup
     * 
     * @return void
     **************************************************************************/
    ThreadVis.displayLegendWindow = function() {
        if (ThreadVis.visualisation.disabled) {
            return;
        }

        if (window.opener && window.opener.ThreadVis) {
            window.opener.ThreadVis.displayLegendWindow();
            return;
        }

        if (ThreadVis.legendWindow != null && !ThreadVis.legendWindow.closed) {
            ThreadVis.legendWindow.close();
            return;
        }

        var flags = "chrome=yes,resizable=no,alwaysRaised=yes,dependent=yes,dialog=yes";
        ThreadVis.legendWindow = window.openDialog(
                "chrome://threadvis/content/Legend.xul", "ThreadVisLegend",
                flags);
    }

    /***************************************************************************
     * Display about dialog when first starting ThreadVis
     * 
     * @return void
     **************************************************************************/
    ThreadVis.displayAbout = function() {
        var showedAbout = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_ABOUT);
        if (showedAbout < ThreadVis.ABOUT) {
            window
                    .openDialog("chrome://threadvis/content/About.xul",
                            "ThreadVisAbout",
                            "chrome=yes,resizable=true;alwaysRaised=false,dependent=yes");
        }
    }

    /***************************************************************************
     * Display a popup window for the visualisation
     * 
     * @return void
     **************************************************************************/
    ThreadVis.displayVisualisationWindow = function() {
        if (ThreadVis.visualisation.disabled) {
            return;
        }

        if (ThreadVis.popupWindow != null && !ThreadVis.popupWindow.closed) {
            ThreadVis.popupWindow.focus();
            return;
        }

        ThreadVis.popupWindow = window.openDialog(
                "chrome://threadvis/content/ThreadVisPopup.xul", null,
                "chrome=yes,resizable=yes,alwaysRaised=yes,dependent=yes");
        ThreadVis.popupWindow.addEventListener("close", function() {
            ThreadVis.visualise(
                    ThreadVis.popupWindow.ThreadVis.selectedContainer, true);
        }, false);

        ThreadVis.deleteBox();
        clearInterval(ThreadVis.visualisation.checkResizeInterval);
    }

    /***************************************************************************
     * Get legend object
     * 
     * @return The legend object, null if it doesn't exist
     **************************************************************************/
    ThreadVis.getLegend = function() {
        if (ThreadVis.popupWindow && ThreadVis.popupWindow.ThreadVis) {
            return ThreadVis.popupWindow.ThreadVis.visualisation.legend;
        } else {
            return ThreadVis.visualisation.legend;
        }
    }

    /***************************************************************************
     * Get popup visualisation
     * 
     * @return The popup window, null if no popup exists
     **************************************************************************/
    ThreadVis.getPopupVisualisation = function() {
        if (ThreadVis.popupWindow != null && !ThreadVis.popupWindow.closed) {
            return ThreadVis.popupWindow;
        }
        return null;
    }

    /***************************************************************************
     * Check if a popup visualisation exists
     * 
     * @return True if a popup exists, false if not
     **************************************************************************/
    ThreadVis.hasPopupVisualisation = function() {
        if (ThreadVis.popupWindow != null && !ThreadVis.popupWindow.closed) {
            return true;
        }
        return false;
    }

    /***************************************************************************
     * Init object
     * 
     * @return void
     **************************************************************************/
    ThreadVis.init = function() {
        // visualisation object
        ThreadVis.visualisation = new ThreadVis.Visualisation();

        // create box object
        ThreadVis.createBox();

        ThreadVis.clearVisualisation();

        // init only for new window, not for popup
        if (!ThreadVis.isPopupVisualisation()) {
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_DISABLED_FOLDERS,
                    function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_ENABLED, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_TIMELINE, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_TIMELINE_FONTSIZE, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_TIMESCALING, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_TIMESCALING_METHOD, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_TIMESCALING_MINTIMEDIFF,
                    function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_DOTSIZE, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_ARC_RADIUS, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_ARC_WIDTH, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_SPACING, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_MESSAGE_CIRCLES, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_COLOUR, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_COLOURS_BACKGROUND,
                    function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_COLOURS_BORDER, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_COLOURS_RECEIVED, function(
                            value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_COLOURS_SENT,
                    function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_HIGHLIGHT, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_OPACITY, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_VIS_ZOOM, function(value) {
                        ThreadVis.preferenceChanged();
                    });
            ThreadVis.Preferences.registerCallback(
                    ThreadVis.Preferences.PREF_GLODA_ENABLED, function(value) {
                        ThreadVis.preferenceChanged();
                    });

            // display about dialog and email reminder only once on each startup
            setTimeout(function() {
                ThreadVis.displayAbout();
            }, 5000);

            if (!ThreadVis.checkEnabled()) {
                ThreadVis.deleteBox();
            }

            // remember msgid of visualised message
            ThreadVis.visualisedMsgId = "";

            // remember selected message
            ThreadVis.selectedMsgUri = "";

            // remember container of selected message
            ThreadVis.selectedContainer = null;

            // register for message selection
            var observerService = Components.classes["@mozilla.org/observer-service;1"]
                    .getService(Components.interfaces.nsIObserverService);
            observerService.addObserver( {
                observe : function(subject, topic, data) {
                    // only observe events in the same window, otherwise opening
                    // a second
                    // Thunderbird window would result in both visualisations
                    // changing
                    // since both observers would react to the event
                    // the subject of the call is the msgHeaderSink of the
                    // msgWindow, in
                    // which the notify happened, so we can check that
                    if (subject == msgWindow.msgHeaderSink) {
                        ThreadVis.selectedMsgUri = data;
                        ThreadVis.setSelectedMessage();
                    }
                }
            }, "MsgMsgDisplayed", false);
        }

        // for a popup, draw initial visualisation
        if (ThreadVis.isPopupVisualisation()) {
            ThreadVis.visualise(window.opener.ThreadVis.selectedContainer);
        }

        // set initial status
        ThreadVis.setStatus(null, {});
    }

    /***************************************************************************
     * Check if this window is a popup
     * 
     * @return True if this window is a popup, false if not
     **************************************************************************/
    ThreadVis.isPopupVisualisation = function() {
        return document.documentElement.id == "ThreadVisPopup";
    }

    /***************************************************************************
     * Open the options dialog for this extension
     * 
     * @return void
     **************************************************************************/
    ThreadVis.openThreadVisOptionsDialog = function() {
        // check if popup visualisation
        var w = window;
        if (ThreadVis.isPopupVisualisation()) {
            w = window.opener;
        }
        w.openOptionsDialog('paneThreadVis', null);
    };

    /***************************************************************************
     * Preference changed
     * 
     * @return void
     **************************************************************************/
    ThreadVis.preferenceChanged = function() {
        ThreadVis.visualisation.changed = true;

        if (ThreadVis.popupWindow && ThreadVis.popupWindow.ThreadVis)
            ThreadVis.popupWindow.ThreadVis.visualisation.changed = true;

        ThreadVis.setSelectedMessage(true);
    }

    /***************************************************************************
     * Called after user resized visualisation using splitter
     * 
     * @return void
     **************************************************************************/
    ThreadVis.setMinimalWidth = function() {
        var width = document.getElementById("ThreadVis").boxObject.width;
        ThreadVis.Preferences.setPreference(
                ThreadVis.Preferences.PREF_VIS_MINIMAL_WIDTH, width,
                ThreadVis.Preferences.PREF_INT);
    }

    /***************************************************************************
     * Called when a message is selected Call visualisation with messageid to
     * visualise
     * 
     * @param force
     *            True to force display of message
     * @return void
     **************************************************************************/
    ThreadVis.setSelectedMessage = function(force) {
        if (!ThreadVis.checkEnabled()) {
            ThreadVis.visualisation.disabled = true;
            ThreadVis.visualisation.displayDisabled();
            ThreadVis.visualisedMsgId = null;
            ThreadVis.setStatus(null, {
                enabled: false
            });
            return;
        }
        ThreadVis.setStatus(null, {});

        ThreadVis.visualisation.disabled = false;

        // get currently loaded message
        var msg = messenger.messageServiceFromURI(ThreadVis.selectedMsgUri)
                .messageURIToMsgHdr(ThreadVis.selectedMsgUri);

        var loadedMsgFolder = msg.folder;
        if (!ThreadVis.checkEnabledAccountOrFolder(loadedMsgFolder)) {
            ThreadVis.visualisation.disabled = true;
            ThreadVis.visualisation.displayDisabled();
            ThreadVis.visualisedMsgId = null;
            ThreadVis.setStatus(null, {
                accountEnabled: ThreadVis.checkEnabledAccount(loadedMsgFolder),
                folderEnabled: ThreadVis.checkEnabledFolder(loadedMsgFolder)
            });
            return;
        }

        var server = loadedMsgFolder.server;
        ThreadVis.account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                .getService(Components.interfaces.nsIMsgAccountManager))
                .FindAccountForServer(server);

        // delay display to give UI time to layout
        setTimeout(function() {
            ThreadVis.visualiseMessage(msg, force);
        }, 100);
    }

    /***************************************************************************
     * Visualise a container
     * 
     * @param container
     *            The container to visualise
     * @param forceNoPopup
     *            True to force visualisation in this window, even if popup
     *            still exists
     * @return void
     **************************************************************************/
    ThreadVis.visualise = function(container, forceNoPopup) {
        var msg = container.getMessage().getMsgDbHdr();
        if (!ThreadVis.checkEnabled()
                || !ThreadVis.checkEnabledAccountOrFolder(msg.folder)) {
            return;
        }

        if (ThreadVis.hasPopupVisualisation()
                && !ThreadVis.isPopupVisualisation() && !forceNoPopup) {
            ThreadVis.getPopupVisualisation().ThreadVis.visualise(container);
            return;
        }

        var msgCount = container.getTopContainer().getCountRecursive();

        // if user wants to hide visualisation if it only consists of a single
        // message, do so, but not in popup visualisation
        if (msgCount == 1
                && ThreadVis.Preferences
                        .getPreference(ThreadVis.Preferences.PREF_VIS_HIDE_ON_SINGLE)
                && !ThreadVis.isPopupVisualisation()) {
            ThreadVis.visualisation.disabled = true;
            ThreadVis.visualisation.displayDisabled(true);
            ThreadVis.visualisedMsgId = null;
            ThreadVis.selectedContainer = null;
            return;
        }

        ThreadVis.createBox();
        ThreadVis.visualisation.disabled = false;
        ThreadVis.visualisation.visualise(container);
        ThreadVis.selectedContainer = container;
    }

    /***************************************************************************
     * Visualise a message. Find the container. Call visualise()
     * 
     * @param message
     *            The message to visualise
     * @param force
     *            True to force the display of the visualisation
     * @param lastTry
     *            True if already tried to find message in cache, if still not
     *            in threader, display error
     * @return void
     **************************************************************************/
    ThreadVis.visualiseMessage = function(message, force, lastTry) {
        if (ThreadVis.visualisedMsgId == message.messageId && !force) {
            return;
        }

        if (!ThreadVis.checkEnabled()
                || !ThreadVis.checkEnabledAccountOrFolder(message.folder)) {
            return;
        }

        // try to find in threader
        var container = ThreadVis.Threader.findContainer(message.messageId);

        // if not in threader and already tried to fetch from cache, display
        // error
        if ((container == null || container.isDummy()) && lastTry) {
            // - message id not found, or
            // - container with id was dummy
            // this means the message was not indexed
            if (ThreadVis.popupWindow && ThreadVis.popupWindow.ThreadVis) {
                ThreadVis.popupWindow.ThreadVis.clearVisualisation();
            } else {
                ThreadVis.clearVisualisation();
                ThreadVis.deleteBox();
            }
            ThreadVis.setStatus(null, {
                error : true,
                errorText : ThreadVis.strings
                        .getString("error.messagenotfound")
            });
            return;
        }
        // if not in threader, try to get from cache
        if (container == null || container.isDummy()) {
            // first, clear threader
            ThreadVis.Cache.clearData();
            ThreadVis.Cache.getCache(message, function() {
                ThreadVis.visualiseMessage(message, force, true);
            });
            return;
        }

        ThreadVis.visualisedMsgId = message.messageId;

        ThreadVis.visualise(container);
        container = null;
    }

    /***************************************************************************
     * Zoom function to call from user click
     * 
     * @return void
     **************************************************************************/
    ThreadVis.zoomIn = function() {
        ThreadVis.visualisation.zoomIn();
    }

    /***************************************************************************
     * Zoom function to call from user click
     * 
     * @return void
     **************************************************************************/
    ThreadVis.zoomOut = function() {
        ThreadVis.visualisation.zoomOut();
    }

    /***************************************************************************
     * Set the status text in the statusbar
     * 
     * @param text
     *            The text to display
     * @param info
     *            Data to display
     * @return void
     **************************************************************************/
    ThreadVis.setStatus = function(text, info) {
        var parent = document;
        if (ThreadVis.isPopupVisualisation()) {
            parent = window.opener.document;
        }
        var elem = parent.getElementById("ThreadVisStatusText");
        if (text != null) {
            elem.value = text;
        } else {
            elem.value = elem.getAttribute("defaultvalue");
        }
        var error = false;
        var errorText = null;
        var disabled = !ThreadVis.checkEnabledThreadVis();
        var disabledGloda = !ThreadVis.checkEnabledGloda();
        var disabledAccount = false;
        var disabledFolder = false;
        if (typeof (info) != "undefined") {
            if (typeof (info.error) != "undefined") {
                error = info.error;
            }
            if (typeof (info.errorText) != "undefined") {
                errorText = info.errorText;
            }
            if (typeof (info.enabled) != "undefined") {
                disabled = !info.enabled;
            }
            if (typeof (info.glodaEnabled) != "undefined") {
                disabledGloda = !info.glodaEnabled;
            }
            if (typeof (info.folderEnabled) != "undefined") {
                disabledFolder = !info.folderEnabled;
            }
            if (typeof (info.accountEnabled) != "undefined") {
                disabledAccount = !info.accountEnabled;
            }
            if (disabled) {
                parent.getElementById("ThreadVisStatusTooltipDisabled").hidden = false;
                parent.getElementById("ThreadVisStatusMenuEnable")
                        .setAttribute("checked", false);
                parent.getElementById("ThreadVisStatusMenuDisable")
                        .setAttribute("checked", true);
            } else {
                parent.getElementById("ThreadVisStatusTooltipDisabled").hidden = true;
                parent.getElementById("ThreadVisStatusMenuEnable")
                        .setAttribute("checked", true);
                parent.getElementById("ThreadVisStatusMenuDisable")
                        .setAttribute("checked", false);
            }
            if (error && errorText != null) {
                while (parent.getElementById("ThreadVisStatusTooltipError").firstChild != null) {
                    parent
                            .getElementById("ThreadVisStatusTooltipError")
                            .removeChild(
                                    parent
                                            .getElementById("ThreadVisStatusTooltipError").firstChild);
                }
                parent.getElementById("ThreadVisStatusTooltipError").hidden = false;
                var text = parent.createTextNode(errorText);
                parent.getElementById("ThreadVisStatusTooltipError")
                        .appendChild(text);
            } else {
                parent.getElementById("ThreadVisStatusTooltipError").hidden = true;
            }
            if (!disabled && disabledGloda) {
                parent.getElementById("ThreadVisStatusTooltipGlodaDisabled").hidden = false;
            } else {
                parent.getElementById("ThreadVisStatusTooltipGlodaDisabled").hidden = true;
            }
            if (!disabled && !disabledGloda && disabledAccount) {
                parent.getElementById("ThreadVisStatusTooltipAccountDisabled").hidden = false;
                parent.getElementById("ThreadVisStatusMenuEnableAccount")
                        .setAttribute("checked", false);
                parent.getElementById("ThreadVisStatusMenuDisableAccount")
                        .setAttribute("checked", true);
            } else {
                parent.getElementById("ThreadVisStatusTooltipAccountDisabled").hidden = true;
                parent.getElementById("ThreadVisStatusMenuEnableAccount")
                        .setAttribute("checked", true);
                parent.getElementById("ThreadVisStatusMenuDisableAccount")
                        .setAttribute("checked", false);
            }
            if (!disabled && !disabledGloda && !disabledAccount
                    && disabledFolder) {
                parent.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = false;
                parent.getElementById("ThreadVisStatusMenuEnableFolder")
                        .setAttribute("checked", false);
                parent.getElementById("ThreadVisStatusMenuDisableFolder")
                        .setAttribute("checked", true);
            } else {
                parent.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = true;
                parent.getElementById("ThreadVisStatusMenuEnableFolder")
                        .setAttribute("checked", true);
                parent.getElementById("ThreadVisStatusMenuDisableFolder")
                        .setAttribute("checked", false);
            }

            // global disable
            if (!disabledGloda) {
                parent.getElementById("ThreadVisStatusMenuEnable").disabled = false;
                parent.getElementById("ThreadVisStatusMenuDisable").disabled = false;
            } else {
                parent.getElementById("ThreadVisStatusMenuEnable").disabled = true;
                parent.getElementById("ThreadVisStatusMenuDisable").disabled = true;
            }

            // account disable
            if (!disabled && !disabledGloda) {
                parent.getElementById("ThreadVisStatusMenuEnableAccount").disabled = false;
                parent.getElementById("ThreadVisStatusMenuDisableAccount").disabled = false;
            } else {
                parent.getElementById("ThreadVisStatusMenuEnableAccount").disabled = true;
                parent.getElementById("ThreadVisStatusMenuDisableAccount").disabled = true;
            }

            // folder disable
            if (!disabled && !disabledGloda && !disabledAccount) {
                parent.getElementById("ThreadVisStatusMenuEnableFolder").disabled = false;
                parent.getElementById("ThreadVisStatusMenuDisableFolder").disabled = false;
            } else {
                parent.getElementById("ThreadVisStatusMenuEnableFolder").disabled = true;
                parent.getElementById("ThreadVisStatusMenuDisableFolder").disabled = true;
            }

            if (error) {
                parent.getElementById("ThreadVisStatusBarPanel").setAttribute(
                        "class", "statusbarpanel-menu-iconic error");
            } else if (disabled || disabledGloda || disabledAccount
                    || disabledFolder) {
                parent.getElementById("ThreadVisStatusBarPanel").setAttribute(
                        "class", "statusbarpanel-menu-iconic disabled");
            } else {
                parent.getElementById("ThreadVisStatusBarPanel").setAttribute(
                        "class", "statusbarpanel-menu-iconic");
            }
        }
    }

    /***************************************************************************
     * Disable for current folder
     * 
     * @return void
     **************************************************************************/
    ThreadVis.disableCurrentFolder = function() {
        // get currently displayed folder
        var folder = window.gFolderDisplay.displayedFolder;
        if (folder) {
            var folderSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_FOLDERS);

            folderSetting = folderSetting + " " + folder.URI + " ";

            ThreadVis.Preferences.setPreference(
                    ThreadVis.Preferences.PREF_DISABLED_FOLDERS, folderSetting,
                    ThreadVis.Preferences.PREF_STRING);
        }
    }

    /***************************************************************************
     * Enable for current folder
     * 
     * @return void
     **************************************************************************/
    ThreadVis.enableCurrentFolder = function() {
        // get currently displayed folder
        var folder = window.gFolderDisplay.displayedFolder;
        if (folder) {
            var folderSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_FOLDERS);

            var index = folderSetting.indexOf(" " + folder.URI + " ");
            folderSetting = folderSetting.substring(0, index)
                    + folderSetting.substring(index + folder.URI.length + 2);

            ThreadVis.Preferences.setPreference(
                    ThreadVis.Preferences.PREF_DISABLED_FOLDERS, folderSetting,
                    ThreadVis.Preferences.PREF_STRING);
        }
    }

    /***************************************************************************
     * Enable for current account
     * 
     * @return void
     **************************************************************************/
    ThreadVis.enableCurrentAccount = function() {
        // get currently displayed folder
        var folder = window.gFolderDisplay.displayedFolder;
        if (folder) {
            var server = folder.server;
            var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(server);

            var accountSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS);

            var index = accountSetting.indexOf(" " + account.key + " ");
            accountSetting = accountSetting.substring(0, index)
                    + accountSetting.substring(index + account.key.length + 2);

            ThreadVis.Preferences.setPreference(
                    ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS,
                    accountSetting, ThreadVis.Preferences.PREF_STRING);
        }
    }

    /***************************************************************************
     * Disable for current account
     * 
     * @return void
     **************************************************************************/
    ThreadVis.disableCurrentAccount = function() {
        // get currently displayed folder
        var folder = window.gFolderDisplay.displayedFolder;
        if (folder) {
            var server = folder.server;
            var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(server);

            var accountSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS);

            accountSetting = accountSetting + " " + account.key + " ";

            ThreadVis.Preferences.setPreference(
                    ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS,
                    accountSetting, ThreadVis.Preferences.PREF_STRING);
        }
    }

    /***************************************************************************
     * Enable
     * 
     * @return void
     **************************************************************************/
    ThreadVis.enable = function() {
        ThreadVis.Preferences.setPreference(ThreadVis.Preferences.PREF_ENABLED,
                true, ThreadVis.Preferences.PREF_BOOL);
    };

    /***************************************************************************
     * Disable
     * 
     * @return void
     **************************************************************************/
    ThreadVis.disable = function() {
        ThreadVis.Preferences.setPreference(ThreadVis.Preferences.PREF_ENABLED,
                false, ThreadVis.Preferences.PREF_BOOL);
    }

    /***************************************************************************
     * Log to error console
     * 
     * @param source
     *            The source file.
     * @param message
     *            The log message
     * @return void
     **************************************************************************/
    ThreadVis.log = function(source, message) {
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                .getService(Components.interfaces.nsIConsoleService);
        var scriptError = Components.classes["@mozilla.org/scripterror;1"]
                .createInstance(Components.interfaces.nsIScriptError);
        scriptError.init(message, source, null, null, null,
                Components.interfaces.nsIScriptError.errorFlag, null);
        consoleService.logMessage(scriptError);
    }

    /***************************************************************************
     * Open a message in a new tab or window
     * 
     * @param msg
     *            The message to open
     * @return void
     **************************************************************************/
    ThreadVis.openNewMessage = function(msg) {
        MailUtils.displayMessage(msg, gFolderDisplay.view, null);
    }

    return ThreadVis;
}(ThreadVis || {}));
