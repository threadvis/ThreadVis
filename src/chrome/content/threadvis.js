/* *********************************************************************************************************************
 * This file is part of ThreadVis.
 * https://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis titled
 * "ThreadVis for Thunderbird: A Thread Visualisation Extension for the Mozilla Thunderbird Email Client"
 * at Graz University of Technology, Austria. An electronic version of the thesis is available online at
 * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with ThreadVis.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *********************************************************************************************************************
 * Main JavaScript file.
 **********************************************************************************************************************/

const EXPORTED_SYMBOLS = [ "ThreadVis" ];

const { Cache } = ChromeUtils.import("chrome://threadvis/content/cache.js");
const { Preferences } = ChromeUtils.import("chrome://threadvis/content/preferences.js");
const { Threader } = ChromeUtils.import("chrome://threadvis/content/threader.js");
const { Visualisation } = ChromeUtils.import("chrome://threadvis/content/visualisation.js");

class ThreadVis {

    constructor(window) {

        this.window = window;
        window.addEventListener("close", function() {
            if (this.hasPopupVisualisation()) {
                this.popupWindow.close();
            }
            if (this.legendWindow && !this.legendWindow.closed) {
                this.legendWindow.close();
            }
        }.bind(this), false);

        // visualisation object
        this.visualisation = new Visualisation(this, window);

        // create box object
        this.createBox();

        this.clearVisualisation();

        // init only for new window, not for popup
        if (!this.isPopupVisualisation()) {
            Preferences.callback(Preferences.DISABLED_ACCOUNTS,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.DISABLED_FOLDERS,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.TIMELINE,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.TIMELINE_FONTSIZE,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.TIMESCALING,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.TIMESCALING_METHOD,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.TIMESCALING_MINTIMEDIFF,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_DOTSIZE,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_ARC_MINHEIGHT,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_ARC_RADIUS,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_ARC_DIFFERENCE,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_ARC_WIDTH,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_SPACING,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_MESSAGE_CIRCLES,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_COLOUR,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_COLOURS_BACKGROUND,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_COLOURS_BORDER,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_COLOURS_RECEIVED,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_COLOURS_SENT,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_HIGHLIGHT,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_OPACITY,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.VIS_ZOOM,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));
            Preferences.callback(Preferences.GLODA_ENABLED,
                    function(value) {
                        this.preferenceChanged();
                    }.bind(this));

            if (!this.checkEnabledGloda()) {
                this.deleteBox();
            }

            // remember msgid of visualised message
            this.visualisedMsgId = "";

            // remember selected message
            this.selectedMsgUri = "";

            // remember container of selected message
            this.selectedContainer = null;

            // register for message selection
            let observerService = Components.classes["@mozilla.org/observer-service;1"]
                    .getService(Components.interfaces.nsIObserverService);
            observerService.addObserver(this, "MsgMsgDisplayed", false);
        }

        // for a popup, draw initial visualisation
        if (this.isPopupVisualisation()) {
            this.visualise(this.window.opener.ThreadVis.selectedContainer);
        }

        // set initial status
        this.setStatus(null, {});
    }

    observe(subject, topic, data) {
        // only observe events in the same window, otherwise opening a second Thunderbird window would
        // result in both visualisations changing since both observers would react to the event
        // the subject of the call is the msgHeaderSink of the msgWindow, in
        // which the notify happened, so we can check that
        if (subject == this.window.msgWindow.msgHeaderSink) {
            this.selectedMsgUri = data;
            this.setSelectedMessage();
        }
    }

    /**
     * Callback function from extension. Called after mouse click in extension
     * Select message in mail view.
     * 
     * @param message
     *            The message to display
     */
    callback(message) {
        if (!this.checkEnabledGloda()) {
            return;
        }

        // get the original nsIMsgDBHdr from the message. this may be null if it is not found
        // (i.e. index out-of-date or folder index (msf) corrupt).
        let msg = message.getMsgDbHdr();
        if (msg == null) {
            this.setStatus(null, {
                error : true,
                errorText : Strings.getString("error.messagenotfound")
            });
            return;
        }

        // for sake of simplicity, assume we are in a folder view, unless told otherwise
        let currentTabMode = "folder";
        let tabmail = this.window.document.getElementById("tabmail");
        if (tabmail) {
            currentTabMode = tabmail.selectedTab.mode.name;
        }

        // if in standard 3-pane (folder) view, select new folder, switch to folder and display message
        if (currentTabMode == "folder") {
            if (this.window.gFolderTreeView) {
                this.window.gFolderTreeView.selectFolder(msg.folder);
            }
            if (this.window.gFolderDisplay) {
                this.window.gFolderDisplay.show(msg.folder);
                this.window.gFolderDisplay.selectMessage(msg);
            }
        } else if (currentTabMode == "message") {
            this.log(
                    "message switching",
                    "Currently, switching messages is not possible when viewing a message in a tab.");
        }
    }

    /**
     * Check GloDa is enabled
     * 
     * @return True if the gloda is enabled, false if not.
     */
    checkEnabledGloda() {
        return Preferences.get(Preferences.GLODA_ENABLED);
    }

    /**
     * Check if current account is enabled in extension
     * 
     * @param folder
     *            The folder to check
     * @return True if the account is enabled, false if not.
     */
    checkEnabledAccount(folder) {
        if (!folder) {
            return false;
        }

        let server = folder.server;
        let account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                .getService(Components.interfaces.nsIMsgAccountManager))
                .FindAccountForServer(server);

        if (Preferences.get(Preferences.DISABLED_ACCOUNTS) != ""
                && Preferences.get(Preferences.DISABLED_ACCOUNTS).indexOf(" " + account.key + " ") > -1) {
            return false;
        }
        return true;
    }

    /**
     * Check if current folder is enabled in extension
     * 
     * @param folder
     *            The folder to check
     * @return True if the folder is enabled, false if not.
     */
    checkEnabledFolder(folder) {
        if (!folder) {
            return false;
        }

        if (Preferences.get(Preferences.DISABLED_FOLDERS) != ""
                && Preferences.get(Preferences.DISABLED_FOLDERS).indexOf(" " + folder.URI + " ") > -1) {
            return false;
        }
        return true;
    }

    /**
     * Check if current account is enabled in extension
     * 
     * @param folder
     *            The folder to check
     * @return True if the folder/account is enabled, false if not.
     */
    checkEnabledAccountOrFolder(folder) {
        return this.checkEnabledAccount(folder) && this.checkEnabledFolder(folder);
    }

    /**
     * Clear visualisation
     */
    clearVisualisation() {
        if (!this.checkEnabledGloda()) {
            return;
        }

        this.visualisation.createStack();

        // also clear popup
        if (this.hasPopupVisualisation()) {
            this.popupWindow.ThreadVis.clearVisualisation();
        }

        // also clear legend
        if (this.legendWindow && !this.legendWindow.closed) {
            this.legendWindow.clearLegend();
        }

        // also clear legend in opener
        if (this.window.opener && this.window.opener.ThreadVis && this.window.opener.ThreadVis.legendWindow && !this.window.opener.ThreadVis.legendWindow.closed) {
            this.window.opener.ThreadVis.legendWindow.clearLegend();
        }
    }

    /**
     * Create threadvis XUL box
     */
    createBox() {
        let elem = this.window.document.getElementById("ThreadVis");
        elem.hidden = false;
    }

    /**
     * Delete threadvis XUL box
     */
    deleteBox() {
        let elem = this.window.document.getElementById("ThreadVis");
        elem.hidden = true;
    }

    /**
     * Display legend popup
     */
    displayLegend() {
        if (this.window.opener && this.window.opener.ThreadVis) {
            this.window.opener.ThreadVis.displayLegend();
        }

        if (this.legendWindow != null && !this.legendWindow.closed) {
            this.legendWindow.displayLegend();
        }
    }

    /**
     * Display legend popup
     */
    displayLegendWindow() {
        if (this.window.opener && this.window.opener.ThreadVis) {
            this.window.opener.ThreadVis.displayLegendWindow();
            return;
        }

        if (this.legendWindow != null && !this.legendWindow.closed) {
            this.legendWindow.close();
            return;
        }

        this.legendWindow = this.window.openDialog(
                "chrome://threadvis/content/legend.xhtml",
                "ThreadVisLegend",
                "chrome=yes,resizable=no,alwaysRaised=yes,dependent=yes,dialog=yes");
    }

    /**
     * Display a popup window for the visualisation
     */
    displayVisualisationWindow() {
        if (this.visualisation.disabled) {
            return;
        }

        if (this.popupWindow != null && !this.popupWindow.closed) {
            this.popupWindow.focus();
            return;
        }

        this.popupWindow = this.window.openDialog(
            "chrome://threadvis/content/threadvispopup.xhtml",
            null,
            "chrome=yes,resizable=yes,alwaysRaised=yes,dependent=yes");

        this.popupWindow.addEventListener("close", function() {
            this.visualise(this.popupWindow.ThreadVis.selectedContainer, true);
        }.bind(this), false);

        this.deleteBox();
        //this.window.clearInterval(this.visualisation.checkResizeInterval);
    };

    /**
     * Get legend object
     * 
     * @return The legend object, null if it doesn't exist
     */
    getLegend() {
        if (this.popupWindow && this.popupWindow.ThreadVis) {
            return this.popupWindow.ThreadVis.visualisation.legend;
        } else {
            return this.visualisation.legend;
        }
    }

    /**
     * Get popup visualisation
     * 
     * @return The popup window, null if no popup exists
     */
    getPopupVisualisation() {
        if (this.popupWindow != null && !this.popupWindow.closed) {
            return this.popupWindow;
        }
        return null;
    }

    /**
     * Check if a popup visualisation exists
     * 
     * @return True if a popup exists, false if not
     */
    hasPopupVisualisation() {
        if (this.popupWindow != null && !this.popupWindow.closed) {
            return true;
        }
        return false;
    }

    /**
     * Check if this window is a popup
     * 
     * @return True if this window is a popup, false if not
     */
    isPopupVisualisation() {
        return this.window.document.documentElement.id == "ThreadVisPopup";
    }

    /**
     * Preference changed
     */
    preferenceChanged() {
        this.visualisation.changed = true;

        if (this.popupWindow && this.popupWindow.ThreadVis)
        this.popupWindow.ThreadVis.visualisation.changed = true;

        this.setSelectedMessage(true);
    }

    /**
     * Called when a message is selected Call visualisation with messageid to
     * visualise
     * 
     * @param force
     *            True to force display of message
     */
    setSelectedMessage(force) {
        if (!this.checkEnabledGloda()) {
            this.visualisation.disabled = true;
            this.visualisation.displayDisabled();
            this.visualisedMsgId = null;
            this.setStatus(null, {});
            return;
        }
        this.setStatus(null, {});

        this.visualisation.disabled = false;

        // get currently loaded message
        let messenger = Components.classes["@mozilla.org/messenger;1"]
                       .createInstance(Components.interfaces.nsIMessenger);
        let msg = messenger.messageServiceFromURI(this.selectedMsgUri)
                .messageURIToMsgHdr(this.selectedMsgUri);

        let loadedMsgFolder = msg.folder;
        if (!this.checkEnabledAccountOrFolder(loadedMsgFolder)) {
            this.visualisation.disabled = true;
            this.visualisation.displayDisabled(true);
            this.visualisedMsgId = null;
            this.setStatus(null, {
                accountEnabled: this.checkEnabledAccount(loadedMsgFolder),
                folderEnabled: this.checkEnabledFolder(loadedMsgFolder)
            });
            return;
        }

        let server = loadedMsgFolder.server;
        this.account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                .getService(Components.interfaces.nsIMsgAccountManager))
                .FindAccountForServer(server);

        // delay display to give UI time to layout
        this.window.setTimeout(function() {
            this.visualiseMessage(msg, force);
        }.bind(this), 100);
    }

    /**
     * Visualise a container
     * 
     * @param {ThreadVis.Container} container
     *            The container to visualise
     * @param forceNoPopup
     *            True to force visualisation in this window, even if popup
     *            still exists
     */
    visualise(container, forceNoPopup) {
        let msg = container.getMessage().getMsgDbHdr();
        if (!this.checkEnabledGloda() || !this.checkEnabledAccountOrFolder(msg.folder)) {
            return;
        }

        if (this.hasPopupVisualisation() && !this.isPopupVisualisation() && !forceNoPopup) {
            this.getPopupVisualisation().ThreadVis.visualise(container);
            return;
        }

        let msgCount = container.getTopContainer().getCount();

        // if user wants to hide visualisation if it only consists of a single
        // message, do so, but not in popup visualisation
        if (msgCount == 1
                && Preferences.get(Preferences.VIS_HIDE_ON_SINGLE)
                && !this.isPopupVisualisation()) {
            this.visualisation.disabled = true;
            this.visualisation.displayDisabled(true);
            this.visualisedMsgId = null;
            this.selectedContainer = null;
            return;
        }

        this.createBox();
        this.visualisation.disabled = false;
        this.visualisation.visualise(container);
        this.selectedContainer = container;
    }

    /**
     * Visualise a message. Find the container. Call visualise()
     * 
     * @param message
     *            The message to visualise
     * @param force
     *            True to force the display of the visualisation
     * @param lastTry
     *            True if already tried to find message in cache, if still not
     *            in threader, display error
     */
    visualiseMessage(message, force, lastTry) {
        if (this.visualisedMsgId == message.messageId && !force) {
            return;
        }
        if (!this.checkEnabledGloda() || !this.checkEnabledAccountOrFolder(message.folder)) {
            return;
        }

        // try to find in threader
        let container = Threader.find(message.messageId);

        // if not in threader and already tried to fetch from cache, display
        // error
        if ((container == null || container.isDummy()) && lastTry) {
            // - message id not found, or
            // - container with id was dummy
            // this means the message was not indexed
            if (this.popupWindow && this.popupWindow.ThreadVis) {
                this.popupWindow.ThreadVis.clearVisualisation();
            } else {
                this.clearVisualisation();
                this.deleteBox();
            }
            this.setStatus(null, {
                error : true,
                errorText : Strings.getString("error.messagenotfound")
            });
            return;
        }
        // if not in threader, try to get from cache
        if (container == null || container.isDummy()) {
            // first, clear threader
            Cache.get(message, function() {
                this.visualiseMessage(message, force, true);
            }.bind(this));
            return;
        }

        this.visualisedMsgId = message.messageId;

        this.visualise(container);
    };

    /**
     * Zoom function to call from user click
     */
    zoomIn() {
        this.visualisation.zoomIn();
    };

    /**
     * Zoom function to call from user click
     */
    zoomOut() {
        this.visualisation.zoomOut();
    };

    /**
     * Set the status text in the statusbar
     * 
     * @param text
     *            The text to display
     * @param info
     *            Data to display
     */
    setStatus(text, info) {
        let parent = this.window.document;
        if (this.isPopupVisualisation()) {
            parent = this.window.opener.document;
        }
        let elem = parent.getElementById("ThreadVisStatusText");
        if (text != null) {
            elem.label = text;
        } else {
            elem.label = elem.getAttribute("defaultlabel");
        }
        let error = false;
        let errorText = null;
        let disabledGloda = !this.checkEnabledGloda();
        let disabledAccount = false;
        let disabledFolder = false;
        if (typeof (info) != "undefined") {
            if (typeof (info.error) != "undefined") {
                error = info.error;
            }
            if (typeof (info.errorText) != "undefined") {
                errorText = info.errorText;
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
            parent.getElementById("ThreadVisStatusTooltipDisabled").hidden = true;
            if (error && errorText != null) {
                while (parent.getElementById("ThreadVisStatusTooltipError").firstChild != null) {
                    parent.getElementById("ThreadVisStatusTooltipError")
                            .removeChild(parent.getElementById("ThreadVisStatusTooltipError").firstChild);
                }
                parent.getElementById("ThreadVisStatusTooltipError").hidden = false;
                parent.getElementById("ThreadVisStatusTooltipError").appendChild(parent.createTextNode(errorText));
            } else {
                parent.getElementById("ThreadVisStatusTooltipError").hidden = true;
            }
            if (disabledGloda) {
                parent.getElementById("ThreadVisStatusTooltipGlodaDisabled").hidden = false;
            } else {
                parent.getElementById("ThreadVisStatusTooltipGlodaDisabled").hidden = true;
            }
            if (!disabledGloda && disabledAccount) {
                parent.getElementById("ThreadVisStatusTooltipAccountDisabled").hidden = false;
                parent.getElementById("ThreadVisStatusMenuEnableAccount").setAttribute("checked", false);
                parent.getElementById("ThreadVisStatusMenuDisableAccount").setAttribute("checked", true);
            } else {
                parent.getElementById("ThreadVisStatusTooltipAccountDisabled").hidden = true;
                parent.getElementById("ThreadVisStatusMenuEnableAccount").setAttribute("checked", true);
                parent.getElementById("ThreadVisStatusMenuDisableAccount").setAttribute("checked", false);
            }
            if (!disabledGloda && !disabledAccount && disabledFolder) {
                parent.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = false;
                parent.getElementById("ThreadVisStatusMenuEnableFolder").setAttribute("checked", false);
                parent.getElementById("ThreadVisStatusMenuDisableFolder").setAttribute("checked", true);
            } else {
                parent.getElementById("ThreadVisStatusTooltipFolderDisabled").hidden = true;
                parent.getElementById("ThreadVisStatusMenuEnableFolder").setAttribute("checked", true);
                parent.getElementById("ThreadVisStatusMenuDisableFolder").setAttribute("checked", false);
            }

            // account disable
            if (!disabledGloda) {
                parent.getElementById("ThreadVisStatusMenuEnableAccount").disabled = false;
                parent.getElementById("ThreadVisStatusMenuDisableAccount").disabled = false;
            } else {
                parent.getElementById("ThreadVisStatusMenuEnableAccount").disabled = true;
                parent.getElementById("ThreadVisStatusMenuDisableAccount").disabled = true;
            }

            // folder disable
            if (!disabledGloda && !disabledAccount) {
                parent.getElementById("ThreadVisStatusMenuEnableFolder").disabled = false;
                parent.getElementById("ThreadVisStatusMenuDisableFolder").disabled = false;
            } else {
                parent.getElementById("ThreadVisStatusMenuEnableFolder").disabled = true;
                parent.getElementById("ThreadVisStatusMenuDisableFolder").disabled = true;
            }

            if (error) {
                parent.getElementById("ThreadVisStatusText").setAttribute("image", "chrome://threadvis/content/images/statusbar-error.png");
                parent.getElementById("ThreadVisStatusBarPanel").setAttribute("class", "statusbarpanel");
            } else if (disabledGloda || disabledAccount || disabledFolder) {
                parent.getElementById("ThreadVisStatusBarPanel").setAttribute("class", "statusbarpanel disabled");
                parent.getElementById("ThreadVisStatusText").setAttribute("image", "chrome://threadvis/content/images/statusbar-disabled.png");
            } else {
                parent.getElementById("ThreadVisStatusText").setAttribute("image", "chrome://threadvis/content/images/statusbar.png");
                parent.getElementById("ThreadVisStatusBarPanel").setAttribute("class", "statusbarpanel");
            }
        }
    }

    /**
     * Disable for current folder
     */
    disableCurrentFolder() {
        // get currently displayed folder
        let folder = this.window.gFolderDisplay.displayedFolder;
        if (folder) {
            let folderSetting = Preferences.get(Preferences.DISABLED_FOLDERS);

            folderSetting = folderSetting + " " + folder.URI + " ";

            Preferences.set(
                    Preferences.DISABLED_FOLDERS,
                    folderSetting,
                    Preferences.PREF_STRING);
        }
    }

    /**
     * Enable for current folder
     */
    enableCurrentFolder() {
        // get currently displayed folder
        let folder = this.window.gFolderDisplay.displayedFolder;
        if (folder) {
            let folderSetting = Preferences.get(Preferences.DISABLED_FOLDERS);

            let index = folderSetting.indexOf(" " + folder.URI + " ");
            folderSetting = folderSetting.substring(0, index) + folderSetting.substring(index + folder.URI.length + 2);

            Preferences.set(
                    Preferences.DISABLED_FOLDERS,
                    folderSetting,
                    Preferences.PREF_STRING);
        }
    }

    /**
     * Enable for current account
     */
    enableCurrentAccount() {
        // get currently displayed folder
        let folder = this.window.gFolderDisplay.displayedFolder;
        if (folder) {
            let server = folder.server;
            let account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(server);

            let accountSetting = Preferences.get(Preferences.DISABLED_ACCOUNTS);

            let index = accountSetting.indexOf(" " + account.key + " ");
            accountSetting = accountSetting.substring(0, index) + accountSetting.substring(index + account.key.length + 2);

            Preferences.set(
                    Preferences.DISABLED_ACCOUNTS,
                    accountSetting,
                    Preferences.PREF_STRING);
        }
    }

    /**
     * Disable for current account
     */
    disableCurrentAccount() {
        // get currently displayed folder
        let folder = this.window.gFolderDisplay.displayedFolder;
        if (folder) {
            let server = folder.server;
            let account = (Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager))
                    .FindAccountForServer(server);

            let accountSetting = Preferences.get(Preferences.DISABLED_ACCOUNTS);

            accountSetting = accountSetting + " " + account.key + " ";

            Preferences.set(
                    Preferences.DISABLED_ACCOUNTS,
                    accountSetting,
                    Preferences.PREF_STRING);
        }
    }

    /**
     * Log to error console
     * 
     * @param source
     *            The source file.
     * @param message
     *            The log message
     */
    log(source, message) {
        let consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                .getService(Components.interfaces.nsIConsoleService);
        let scriptError = Components.classes["@mozilla.org/scripterror;1"]
                .createInstance(Components.interfaces.nsIScriptError);
        scriptError.init(message, source, null, null, null, Components.interfaces.nsIScriptError.errorFlag, null);
        consoleService.logMessage(scriptError);
    }

    /**
     * Open a message in a new tab or window
     * 
     * @param msg
     *            The message to open
     */
    openNewMessage(msg) {
        MailUtils.displayMessage(msg, gFolderDisplay.view, null);
    }

    /**
     * Shutdown, unregister all observers
     */
    shutdown() {
        let observerService = Components.classes["@mozilla.org/observer-service;1"]
                .getService(Components.interfaces.nsIObserverService);
        observerService.removeObserver(this, "MsgMsgDisplayed");
    }
}