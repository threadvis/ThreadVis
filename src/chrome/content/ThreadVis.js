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

var ThreadVis = (function(ThreadVis) {

    ThreadVis.XUL_NAMESPACE = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    // increment this to trigger about dialog
    ThreadVis.ABOUT = 1;

    ThreadVis.clear = false;

    ThreadVis.strings = document.getElementById("ThreadVisStrings");

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

        // re-search message in case its folder has changed
        var folder = MailUtils.getFolderForURI(message.getFolder(), true);
        var msg = ThreadVis.Cache.searchMessageByMsgId(message.getId(),
                folder.rootFolder);

        if (gFolderTreeView) {
            gFolderTreeView.selectFolder(msg.folder);
        }
        gFolderDisplay.show(msg.folder);

        gFolderDisplay.selectMessage(msg);
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
            folder = ThreadVis.getMainWindow().gFolderDisplay.displayedFolder;
        }
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
            folder = ThreadVis.getMainWindow().gFolderDisplay.displayedFolder;
        }
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

        if (ThreadVis.clear) {
            return;
        }

        ThreadVis.visualisation.createStack();
        ThreadVis.clear = true;

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
     * Return main window object
     * 
     * @return The main window
     **************************************************************************/
    ThreadVis.getMainWindow = function() {
        var w = window;

        while (w != null) {
            if (typeof (w.GetThreadTree) == "function") {
                return w;
            }
            w = w.opener;
        }

        return null;
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
                    ThreadVis.Preferences.PREF_TIMESCALING, function(value) {
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
        ThreadVis.setStatus(null, {
            enabled : ThreadVis.checkEnabledThreadVis(),
            accountEnabled : ThreadVis.checkEnabledAccount(),
            folderEnabled : ThreadVis.checkEnabledFolder(),
            glodaEnabled : ThreadVis.checkEnabledGloda()
        });
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
        ThreadVis.getMainWindow().openOptionsDialog('paneThreadVis', null);
    }

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
                enabled : ThreadVis.checkEnabledThreadVis(),
                accountEnabled : ThreadVis.checkEnabledAccount(),
                folderEnabled : ThreadVis.checkEnabledFolder(),
                glodaEnabled : ThreadVis.checkEnabledGloda()
            });
            return;
        }
        if (!ThreadVis.checkEnabledAccountOrFolder()) {
            ThreadVis.visualisation.disabled = true;
            ThreadVis.visualisation.displayDisabled();
            ThreadVis.visualisedMsgId = null;
            ThreadVis.setStatus(null, {
                enabled : ThreadVis.checkEnabledThreadVis(),
                glodaEnabled : ThreadVis.checkEnabledGloda(),
                accountEnabled : ThreadVis.checkEnabledAccount(),
                folderEnabled : ThreadVis.checkEnabledFolder()
            });
            return;
        }
        ThreadVis.setStatus(null, {
            enabled : ThreadVis.checkEnabledThreadVis(),
            glodaEnabled : ThreadVis.checkEnabledGloda(),
            accountEnabled : ThreadVis.checkEnabledAccount(),
            folderEnabled : ThreadVis.checkEnabledFolder()
        });

        ThreadVis.visualisation.disabled = false;

        // get currently loaded message
        var msg = messenger.messageServiceFromURI(ThreadVis.selectedMsgUri)
                .messageURIToMsgHdr(ThreadVis.selectedMsgUri);

        var loadedMsgFolder = msg.folder;
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
        if (!ThreadVis.checkEnabled()
                || !ThreadVis.checkEnabledAccountOrFolder()) {
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

        ThreadVis.clear = false;
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
     * @return void
     **************************************************************************/
    ThreadVis.visualiseMessage = function(message, force) {
        if (ThreadVis.visualisedMsgId == message.messageId && !force) {
            return;
        }

        if (!ThreadVis.checkEnabled()
                || !ThreadVis.checkEnabledAccountOrFolder()) {
            return;
        }

        // try to find in threader
        var container = ThreadVis.Threader.findContainer(message.messageId);

        // if not in threader, try to get from cache
        if (container == null || container.isDummy()) {
            ThreadVis.Cache.getCache(message, function() {
                ThreadVis.visualiseMessage(message, force);
            });
            return;
        }

        // not in threader, not in cache, start caching
        if (container == null || container.isDummy()) {
            alert("NOT IN CACHE");
            return;
        }

        ThreadVis.visualisedMsgId = message.messageId;

        // clear threader
        // this.threader.reset();

        if (container != null && !container.isDummy()) {
            ThreadVis.visualise(container);
        } else {
            // - message id not found, or
            // - container with id was dummy
            // this means we somehow missed to thread this message
            // TODO: check this error
            if (ThreadVis.popupWindow && ThreadVis.popupWindow.ThreadVis) {
                ThreadVis.popupWindow.ThreadVis.clearVisualisation();
            } else {
                ThreadVis.clearVisualisation();
            }
        }
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
     * @param tooltip
     *            Tooltip data to display
     * @return void
     **************************************************************************/
    ThreadVis.setStatus = function(text, tooltip) {
        if (text != null) {
            var elem = document.getElementById("ThreadVisStatusText");
            if (text != "") {
                elem.value = text;
            } else {
                elem.value = elem.getAttribute("defaultvalue");
            }
        }
        var disabled = false;
        var disabledGloda = false;
        var disabledAccount = false;
        var disabledFolder = false;
        if (typeof (tooltip) != "undefined") {
            if (typeof (tooltip.enabled) != "undefined") {
                disabled = !tooltip.enabled;
            }
            if (typeof (tooltip.glodaEnabled) != "undefined") {
                disabledGloda = !tooltip.glodaEnabled;
            }
            if (typeof (tooltip.folderEnabled) != "undefined") {
                disabledFolder = !tooltip.folderEnabled;
            }
            if (typeof (tooltip.accountEnabled) != "undefined") {
                disabledAccount = !tooltip.accountEnabled;
            }
            if (disabled) {
                document.getElementById("ThreadVisStatusTooltipDisabled").hidden = false;
                document.getElementById("ThreadVisStatusMenuEnable")
                        .setAttribute("checked", false);
                document.getElementById("ThreadVisStatusMenuDisable")
                        .setAttribute("checked", true);
            } else {
                document.getElementById("ThreadVisStatusTooltipDisabled").hidden = true;
                document.getElementById("ThreadVisStatusMenuEnable")
                        .setAttribute("checked", true);
                document.getElementById("ThreadVisStatusMenuDisable")
                        .setAttribute("checked", false);
            }
            if (!disabled && disabledGloda) {
                document.getElementById("ThreadVisStatusTooltipGlodaDisabled").hidden = false;
            } else {
                document.getElementById("ThreadVisStatusTooltipGlodaDisabled").hidden = true;
            }
            if (!disabled && !disabledGloda && disabledAccount) {
                document
                        .getElementById("ThreadVisStatusTooltipAccountDisabled").hidden = false;
                document.getElementById("ThreadVisStatusMenuEnableAccount")
                        .setAttribute("checked", false);
                document.getElementById("ThreadVisStatusMenuDisableAccount")
                        .setAttribute("checked", true);
            } else {
                document
                        .getElementById("ThreadVisStatusTooltipAccountDisabled").hidden = true;
                document.getElementById("ThreadVisStatusMenuEnableAccount")
                        .setAttribute("checked", true);
                document.getElementById("ThreadVisStatusMenuDisableAccount")
                        .setAttribute("checked", false);
            }
            if (!disabled && !disabledGloda && !disabledAccount
                    && disabledFolder) {
                document.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = false;
                document.getElementById("ThreadVisStatusMenuEnableFolder")
                        .setAttribute("checked", false);
                document.getElementById("ThreadVisStatusMenuDisableFolder")
                        .setAttribute("checked", true);
            } else {
                document.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = true;
                document.getElementById("ThreadVisStatusMenuEnableFolder")
                        .setAttribute("checked", true);
                document.getElementById("ThreadVisStatusMenuDisableFolder")
                        .setAttribute("checked", false);
            }

            // global disable
            if (!disabledGloda) {
                document.getElementById("ThreadVisStatusMenuEnable").disabled = false;
                document.getElementById("ThreadVisStatusMenuDisable").disabled = false;
            } else {
                document.getElementById("ThreadVisStatusMenuEnable").disabled = true;
                document.getElementById("ThreadVisStatusMenuDisable").disabled = true;
            }

            // account disable
            if (!disabled && !disabledGloda) {
                document.getElementById("ThreadVisStatusMenuEnableAccount").disabled = false;
                document.getElementById("ThreadVisStatusMenuDisableAccount").disabled = false;
            } else {
                document.getElementById("ThreadVisStatusMenuEnableAccount").disabled = true;
                document.getElementById("ThreadVisStatusMenuDisableAccount").disabled = true;
            }

            // folder disable
            if (!disabled && !disabledGloda && !disabledAccount) {
                document.getElementById("ThreadVisStatusMenuEnableFolder").disabled = false;
                document.getElementById("ThreadVisStatusMenuDisableFolder").disabled = false;
            } else {
                document.getElementById("ThreadVisStatusMenuEnableFolder").disabled = true;
                document.getElementById("ThreadVisStatusMenuDisableFolder").disabled = true;
            }

            if (disabled || disabledGloda || disabledAccount || disabledFolder) {
                document.getElementById("ThreadVisStatusBarPanel")
                        .setAttribute(
                                "class",
                                document.getElementById(
                                        "ThreadVisStatusBarPanel")
                                        .getAttribute("class")
                                        + " disabled");
            } else {
                document.getElementById("ThreadVisStatusBarPanel")
                        .setAttribute(
                                "class",
                                document.getElementById(
                                        "ThreadVisStatusBarPanel")
                                        .getAttribute("class").replace(
                                                /disabled/g, ""));
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
        var folder = ThreadVis.getMainWindow().gFolderDisplay.displayedFolder;
        if (folder) {
            var folderSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_FOLDERS);

            folderSetting = folderSetting + " " + folder.URI;

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
        var folder = ThreadVis.getMainWindow().gFolderDisplay.displayedFolder;
        if (folder) {
            var folderSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_FOLDERS);

            var index = folderSetting.indexOf(" " + folder.URI + " ");
            folderSetting = folderSetting.substring(0, index)
                    + folderSetting.substring(index + folder.URI.length);

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
        var folder = ThreadVis.getMainWindow().gFolderDisplay.displayedFolder;
        if (folder) {
            var server = folder.server;
            var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(server);

            var accountSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS);

            var index = accountSetting.indexOf(" " + account.key + " ");
            accountSetting = accountSetting.substring(0, index)
                    + accountSetting.substring(index + account.key.length);

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
        var folder = ThreadVis.getMainWindow().gFolderDisplay.displayedFolder;
        if (folder) {
            var server = folder.server;
            var account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(server);

            var accountSetting = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS);

            accountSetting = accountSetting + " " + account.key;

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
    }

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

    return ThreadVis;
}(ThreadVis || {}));
