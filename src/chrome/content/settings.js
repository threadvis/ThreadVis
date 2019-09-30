/* *****************************************************************************
 * This file is part of ThreadVis.
 * https://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011,
 *               2013, 2018, 2019 Alexander C. Hubmann-Haidvogel
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
 * JavaScript file for settings dialog
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    Preferences.addAll([
        { id: "extensions.threadvis.enabled", type: "bool" },
        { id: "extensions.threadvis.disabledaccounts", type: "string" },
        { id: "extensions.threadvis.disabledfolders", type: "string" },
        { id: "extensions.threadvis.timescaling.enabled", type: "bool" },
        { id: "extensions.threadvis.timescaling.method", type: "string" },
        { id: "extensions.threadvis.timescaling.mintimediff", type: "int" },
        { id: "extensions.threadvis.timeline.enabled", type: "bool" },
        { id: "extensions.threadvis.timeline.fontsize", type: "int" },
        { id: "extensions.threadvis.visualisation.dotsize", type: "int" },
        { id: "extensions.threadvis.visualisation.arcminheight", type: "int" },
        { id: "extensions.threadvis.visualisation.arcradius", type: "int" },
        { id: "extensions.threadvis.visualisation.arcdifference", type: "int" },
        { id: "extensions.threadvis.visualisation.arcwidth", type: "int" },
        { id: "extensions.threadvis.visualisation.spacing", type: "int" },
        { id: "extensions.threadvis.visualisation.messagecircles", type: "bool" },
        { id: "extensions.threadvis.visualisation.zoom", type: "string" },
        { id: "extensions.threadvis.visualisation.colour", type: "string" },
        { id: "extensions.threadvis.visualisation.highlight", type: "bool" },
        { id: "extensions.threadvis.visualisation.opacity", type: "int"}
    ]);

    var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

    var settingsInitialized = false;

    // attach button to select ThreadVis pane to left column
    function onLoad() {
        if (! settingsInitialized) {
            var paneThreadVis = document.getElementById("ThreadVisSettingsPane");
            if (! paneThreadVis) {
                // this is not a settings dialog, skip rest
                settingsInitialized = true;
                ThreadVis.Settings.init();
                window.removeEventListener("load", this, false);
                return;
            }
            var buttonThreadVis = document.createXULElement("radio");
            buttonThreadVis.setAttribute("pane", "ThreadVisSettingsPane");
            buttonThreadVis.setAttribute("value", "ThreadVisSettingsPane");
            buttonThreadVis.setAttribute("label", paneThreadVis.getAttribute("label"));
            buttonThreadVis.setAttribute("oncommand", "showPane('ThreadVisSettingsPane');");
            buttonThreadVis.style.listStyleImage = paneThreadVis.style.listStyleImage;

            // attach button to left column
            var radioGroup = document.getElementById("selector");
            radioGroup.querySelector("radio[pane='paneAdvanced']").after(buttonThreadVis);

            if (document.documentElement.getAttribute("lastSelected") === "ThreadVisSettingsPane") {
                for (var button of radioGroup.getElementsByTagName("radio")) {
                    if (button.getAttribute("pane") === "ThreadVisSettingsPane") {
                        button.setAttribute("selected", "true");
                    } else {
                        if (button.hasAttribute("selected")) {
                            button.removeAttribute("selected");
                        }
                    }
                }
            }

            settingsInitialized = true;
        }
        ThreadVis.Settings.init();
        window.removeEventListener("load", this, false);
    }

    window.addEventListener("load", onLoad, false);

    ThreadVis.Settings = {

        /**
         * Init the dialog, read all settings, build the account list, ...
         */
        init : function() {
            this.toggleHighlight();
            this.toggleTimescaling();
            this.buildAccountList();
            this.buildAccountPreference();
        },

        /**
         * Add attachments from file objects
         * 
         * @param composeFields
         *            Object to add the attachments to
         * @param attachments
         *            List of files to attach to the message
         */
        _addAttachments : function(composeFields, attachments) {
            for (var key in attachments) {
                var file = attachments[key];
                var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"]
                        .createInstance(Components.interfaces.nsIMsgAttachment);
                var ios = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
                var fileHandler = ios.getProtocolHandler("file")
                        .QueryInterface(
                                Components.interfaces.nsIFileProtocolHandler);
                attachment.url = fileHandler.getURLSpecFromFile(file);
                composeFields.addAttachment(attachment);
            }
        },

        /**
         * Build the account list Get all accounts, display checkbox for each
         */
        buildAccountList : function() {
            var accountBox = document.getElementById("ThreadVisEnableAccounts");
            var pref = document.getElementById("ThreadVisHiddenDisabledAccounts").value;

            var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
                    .getService(Components.interfaces.nsIMsgAccountManager);
            for (let account of fixIterator(accountManager.accounts,
                    Components.interfaces.nsIMsgAccount)) {
                // get folders
                var rootFolder = account.incomingServer.rootFolder;
                var folders = this._getAllFolders(rootFolder);

                var checkbox = document.createXULElement("checkbox");
                checkbox.setAttribute("label",
                        account.incomingServer.prettyName);
                checkbox.setAttribute("oncommand",
                        "ThreadVis.Settings.buildAccountPreference();");
                checkbox.setAttribute("accountkey", account.key);
                checkbox.setAttribute("checkboxtype", "account");
                if (pref != "" && pref.indexOf(" " + account.key + " ") > -1) {
                    checkbox.checked = false;
                } else {
                    checkbox.checked = true;
                }

                var buttonAll = document.createXULElement("button");
                buttonAll.setAttribute("label", ThreadVis.strings
                        .getString("enabledaccounts.button.all"));
                buttonAll.setAttribute("accountkey", account.key);
                buttonAll.setAttribute("oncommand",
                        "ThreadVis.Settings.selectAll(this);");
                var buttonNone = document.createXULElement("button");
                buttonNone.setAttribute("label", ThreadVis.strings
                        .getString("enabledaccounts.button.none"));
                buttonNone.setAttribute("accountkey", account.key);
                buttonNone.setAttribute("oncommand",
                        "ThreadVis.Settings.selectNone(this);");
                var spacer = document.createXULElement("spacer");
                spacer.setAttribute("flex", "1");
                var hbox = document.createXULElement("hbox");

                hbox.appendChild(checkbox);
                hbox.appendChild(spacer);
                hbox.appendChild(buttonAll);
                hbox.appendChild(buttonNone);
                accountBox.appendChild(hbox);

                this._buildFolderCheckboxes(accountBox, folders,
                        account.key, 1);

                var separator = document.createXULElement("separator");
                separator.setAttribute("class", "groove");
                accountBox.appendChild(separator);
            }
        },

        /**
         * Create a string preference of all selected accounts
         */
        buildAccountPreference : function() {
            var accountBox = document.getElementById("ThreadVisEnableAccounts");
            var pref = document.getElementById("ThreadVisHiddenDisabledAccounts");

            var prefString = " ";

            var checkboxes = accountBox.getElementsByAttribute("checkboxtype",
                    "account");

            for (var i = 0; i < checkboxes.length; i++) {
                var checkbox = checkboxes.item(i);
                if (!checkbox.checked) {
                    prefString += " " + checkbox.getAttribute("accountkey")
                            + " ";
                }

                var folderCheckboxes = accountBox.getElementsByAttribute(
                        "checkboxtype", "folder");
                for (var j = 0; j < folderCheckboxes.length; j++) {
                    var folderCheckbox = folderCheckboxes.item(j);
                    if (folderCheckbox.getAttribute("accountkey") == checkbox
                            .getAttribute("accountkey")) {
                        if (checkbox.checked) {
                            folderCheckbox.disabled = false;
                        } else {
                            folderCheckbox.disabled = true;
                        }
                    }
                }

            }
            pref.value = prefString;
            // We need to call doCommand(), because otherwise Thunderbird doesn't
            // update the underlying preference upon closing the window (i.e.
            // ignores
            // the new value of the textbox).
            pref.doCommand();
        },

        /**
         * Create checkbox elements for all folders
         * 
         * @param box
         *            The box to which to add the checkbox elements to
         * @param folders
         *            All folders for which to create checkboxes
         * @param account
         *            The account for which the checkboxes are created
         * @param indent
         *            The amount of indentation
         */
        _buildFolderCheckboxes : function(box, folders, account, indent) {
            var pref = document.getElementById("ThreadVisHiddenDisabledFolders").value;

            for (var i = 0; i < folders.length; i++) {
                var folder = folders[i];

                if (folder instanceof Array) {
                    this._buildFolderCheckboxes(box, folder,
                            account, indent + 1);
                    continue;
                }

                var checkbox = document.createXULElement("checkbox");
                checkbox.setAttribute("label", folder.name);
                checkbox.setAttribute("oncommand",
                        "ThreadVis.Settings.buildFolderPreference();");
                checkbox.setAttribute("folderuri", folder.URI);
                checkbox.setAttribute("checkboxtype", "folder");
                checkbox.setAttribute("accountkey", account);
                checkbox.style.paddingLeft = indent + "em";
                if (pref != "" && pref.indexOf(folder.URI + " ") > -1) {
                    checkbox.checked =  false;
                } else {
                    checkbox.checked = true;
                }
                box.appendChild(checkbox);
            }
        },

        /**
         * Create a string preference of all selected folders
         */
        buildFolderPreference : function() {
            var accountBox = document.getElementById("ThreadVisEnableAccounts");
            var pref = document.getElementById("ThreadVisHiddenDisabledFolders");

            var prefString = " ";

            var checkboxes = accountBox.getElementsByAttribute("checkboxtype",
                    "folder");

            for (var i = 0; i < checkboxes.length; i++) {
                var checkbox = checkboxes.item(i);
                if (!checkbox.checked) {
                    prefString += " " + checkbox.getAttribute("folderuri")
                            + " ";
                }
            }
            pref.value = prefString;
            // We need to call doCommand(), because otherwise Thunderbird doesn't
            // update the underlying preference upon closing the window (i.e.
            // ignores the new value of the textbox).
            pref.doCommand();
        },

        /**
         * Compose an email
         * 
         * @param to
         *            The address to which the email should be sent
         * @param subject
         *            The subject of the email
         * @param body
         *            The body of the email
         * @param attachments
         *            A list of files to attach to the email
         */
        _composeEmail : function(to, subject, body, attachments) {
            var msgComposeType = Components.interfaces.nsIMsgCompType;
            var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
            var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"]
                    .getService();
            msgComposeService = msgComposeService
                    .QueryInterface(Components.interfaces.nsIMsgComposeService);

            var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"]
                    .createInstance(Components.interfaces.nsIMsgComposeParams);

            if (params) {
                params.type = msgComposeType.New;
                params.format = msgComposFormat.Default;
                var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
                        .createInstance(Components.interfaces.nsIMsgCompFields);
                if (composeFields) {
                    if (to) {
                        composeFields.to = to;
                    }
                    if (subject) {
                        composeFields.subject = subject;
                    }
                    if (body) {
                        composeFields.body = body;
                    }
                    if (attachments) {
                        this._addAttachments(composeFields,
                                attachments);
                    }
                    params.composeFields = composeFields;
                    msgComposeService.OpenComposeWindowWithParams(null, params);
                }
            }
        },

        /**
         * Get all subfolders starting from "folder" as array
         * 
         * @param folder
         *            The folder to check
         * @return An array of all subfolders
         */
        _getAllFolders : function(folder) {
            var folderEnumerator = folder.subFolders;
            var currentFolder = null;
            var folders = new Array();

            while (true) {
                try {
                    currentFolder = folderEnumerator.getNext();
                } catch (Exception) {
                    break;
                }

                if (currentFolder instanceof Components.interfaces.nsIMsgFolder) {
                    folders.push(currentFolder);
                }

                if (currentFolder.hasSubFolders) {
                    folders.push(this._getAllFolders(currentFolder));
                }

                try {
                    if (!folderEnumerator.hasMoreElements()) {
                        break;
                    }
                } catch (e) {
                    break;
                }
            }

            return folders;
        },

        /**
         * Open a homepage
         * 
         * @param url
         *            The URL to open
         */
        openURL : function(url) {
            var uri = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService)
                    .newURI(url, null, null);
            var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
                    .getService(Components.interfaces.nsIExternalProtocolService);
            protocolSvc.loadURI(uri);
        },

        /**
         * Enable or disable the highlight checkbox
         */
        toggleHighlight : function() {
            var colourRadio = document
                    .getElementById("ThreadVisVisualisationColourAuthor");
            var highlightCheckbox = document
                    .getElementById("ThreadVisVisualisationHighlight");
            if (colourRadio.selected) {
                highlightCheckbox.disabled = false;
            } else {
                highlightCheckbox.disabled = true;
            }
        },

        /**
         * Enable or disable the timescaling settings
         */
        toggleTimescaling : function() {
            var timescalingRadio = document
                    .getElementById("ThreadVisTimeScalingEnabled");
            var timescalingMethod = document
                    .getElementById("ThreadVisTimescalingMethod");
            var timescalingMinTimeDifference = document
                    .getElementById("ThreadVisTimescalingMinTimeDifference");
            if (timescalingRadio.selected) {
                timescalingMethod.disabled = false;
                timescalingMinTimeDifference.disabled = false;
            } else {
                timescalingMethod.disabled = true;
                timescalingMinTimeDifference.disabled = true;
            }
        },

        /**
         * Write an email to the author
         */
        writeEmail : function() {
            this._composeEmail("ahubmann@gmail.com",
                    "[ThreadVis] <insert subject here>", null);
        },

        /**
         * Load preferences in about dialog
         */
        loadAboutPreference : function() {
            var disabledAccounts = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS);
            var disabledFolders = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_DISABLED_FOLDERS);
            var glodaEnabled = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_GLODA_ENABLED);
            document.getElementById("ThreadVisHiddenDisabledAccounts").value = disabledAccounts;
            document.getElementById("ThreadVisHiddenDisabledFolders").value = disabledFolders;
            document.getElementById("ThreadVisEnableGloda").checked = glodaEnabled;
        },

        /**
         * Save preferences in about dialog
         */
        saveAboutSettings : function() {
            var disabledAccounts = document
                    .getElementById("ThreadVisHiddenDisabledAccounts").value;
            var disabledFolders = document
                    .getElementById("ThreadVisHiddenDisabledFolders").value;
            var notShowAgain = document.getElementById("ThreadVisDoNotShowAgain").checked;
            var glodaEnabled = document.getElementById("ThreadVisEnableGloda").checked;

            var about = ThreadVis.ABOUT;
            ThreadVis.Preferences.setPreference(
                    ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS,
                    disabledAccounts);
            ThreadVis.Preferences.setPreference(
                    ThreadVis.Preferences.PREF_DISABLED_FOLDERS,
                    disabledFolders);
            if (notShowAgain) {
                ThreadVis.Preferences.setPreference(
                        ThreadVis.Preferences.PREF_ABOUT, about);
            }
            ThreadVis.Preferences.setPreference(
                    ThreadVis.Preferences.PREF_GLODA_ENABLED,
                    glodaEnabled);
        },

        /**
         * Select all folders for an account
         * 
         * @param element
         *            The account element
         */
        selectAll : function(element) {
            var accountKey = element.getAttribute("accountkey");

            var accountBox = document.getElementById("ThreadVisEnableAccounts");
            var folderCheckboxes = accountBox.getElementsByAttribute(
                    "checkboxtype", "folder");
            for (var j = 0; j < folderCheckboxes.length; j++) {
                var folderCheckbox = folderCheckboxes.item(j);
                if (folderCheckbox.getAttribute("accountkey") == accountKey) {
                    folderCheckbox.checked = true;
                }
            }
            this.buildFolderPreference();
        },

        /**
         * Deselect all folders for an account
         * 
         * @param element
         *            The account element
         */
        selectNone : function(element) {
            var accountKey = element.getAttribute("accountkey");

            var accountBox = document.getElementById("ThreadVisEnableAccounts");
            var folderCheckboxes = accountBox.getElementsByAttribute(
                    "checkboxtype", "folder");
            for (var j = 0; j < folderCheckboxes.length; j++) {
                var folderCheckbox = folderCheckboxes.item(j);
                if (folderCheckbox.getAttribute("accountkey") == accountKey) {
                    folderCheckbox.checked = false;
                }
            }
            this.buildFolderPreference();
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
