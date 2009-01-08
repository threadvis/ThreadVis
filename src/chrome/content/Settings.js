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
 * JavaScript file for settings dialog
 ******************************************************************************/



var XUL_NAMESPACE = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";



/** ****************************************************************************
 * Init the dialog, read all settings, build the account list, ...
 *
 * @return
 *          void
 ******************************************************************************/
function init() {
    toggleLogging();
    toggleHighlight();
    buildAccountList();
    buildAccountPreference();
    buildCacheList();
}



/** ****************************************************************************
 * Add attachments from file objects
 *
 * @param composeFields
 *          Object to add the attachments to
 * @param attachments
 *          List of files to attach to the message
 * @return
 *          void
 ******************************************************************************/
function addAttachments(composeFields, attachments) {
    for (key in attachments) {
        var file = attachments[key];
        var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"]
            .createInstance(Components.interfaces.nsIMsgAttachment);
        var ios = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
        var fileHandler = ios.getProtocolHandler("file")
            .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
        attachment.url = fileHandler.getURLSpecFromFile(file);
        composeFields.addAttachment(attachment);
    }
}



/** ****************************************************************************
 * Build the account list
 * Get all accounts, display checkbox for each
 *
 * @return
 *          void
 ******************************************************************************/
function buildAccountList() {
    var accountBox = document.getElementById("enableAccounts");
    var pref = document.getElementById("hiddenDisabledAccounts").value;
    var strings = document.getElementById("threadVisStrings");

    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);

    var accounts = accountManager.accounts;
    for (var i = 0; i < accounts.Count(); i++)  {
        var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);

        // get folders
        var rootFolder = account.incomingServer.rootFolder;
        var folders = getAllFolders(rootFolder);

        var checkbox = document.createElementNS(XUL_NAMESPACE, "checkbox");
        checkbox.setAttribute("label", account.incomingServer.prettyName);
        checkbox.setAttribute("oncommand", "buildAccountPreference();");
        checkbox.setAttribute("accountkey", account.key);
        checkbox.setAttribute("checkboxtype", "account");
        if (pref != "" && pref.indexOf(" " + account.key + " ") > -1) {
            checkbox.setAttribute("checked", false);
        } else {
            checkbox.setAttribute("checked", true);
        }

        var buttonAll = document.createElementNS(XUL_NAMESPACE, "button");
        buttonAll.setAttribute("label", strings.getString("enabledaccounts.button.all"));
        buttonAll.setAttribute("accountkey", account.key);
        buttonAll.setAttribute("oncommand", "selectAll(this);");
        var buttonNone = document.createElementNS(XUL_NAMESPACE, "button");
        buttonNone.setAttribute("label", strings.getString("enabledaccounts.button.none"));
        buttonNone.setAttribute("accountkey", account.key);
        buttonNone.setAttribute("oncommand", "selectNone(this);");
        var spacer = document.createElementNS(XUL_NAMESPACE, "spacer");
        spacer.setAttribute("flex", "1");
        var hbox = document.createElementNS(XUL_NAMESPACE, "hbox");

        hbox.appendChild(checkbox);
        hbox.appendChild(spacer);
        hbox.appendChild(buttonAll);
        hbox.appendChild(buttonNone);
        accountBox.appendChild(hbox);

        buildFolderCheckboxes(accountBox, folders, account.key, 1);

        var separator = document.createElementNS(XUL_NAMESPACE, "separator");
        separator.setAttribute("class", "groove");
        accountBox.appendChild(separator);
    }
}



/** ****************************************************************************
 * Create a string preference of all selected accounts
 *
 * @return
 *          void
 ******************************************************************************/
function buildAccountPreference() {
    var accountBox = document.getElementById("enableAccounts");
    var pref = document.getElementById("hiddenDisabledAccounts");

    var prefString = " ";

    var checkboxes = accountBox.getElementsByAttribute("checkboxtype", "account");

    for (var i = 0; i < checkboxes.length; i++) {
        var checkbox = checkboxes.item(i);
        if (! checkbox.checked) {
            prefString += checkbox.getAttribute("accountkey") +  " ";
        }

        var folderCheckboxes = accountBox
            .getElementsByAttribute("checkboxtype", "folder");
        for (var j = 0; j < folderCheckboxes.length; j++) {
            var folderCheckbox = folderCheckboxes.item(j);
            if (folderCheckbox.getAttribute("accountkey") == 
                checkbox.getAttribute("accountkey")) {
                if (checkbox.checked) {
                    folderCheckbox.disabled = false;
                } else {
                    folderCheckbox.disabled = true;
                }
            }
        }
        
    }
    pref.value = prefString;
    // We need to call doCommand(), because otherwise Thunderbird 1.5 doesn't
    // update the underlying preference upon closing the window (i.e. ignores
    // the new value of the textbox).
    pref.doCommand();
}



/** ****************************************************************************
 * Build the cache list
 * Get all accounts
 *
 * @return
 *          void
 ******************************************************************************/
function buildCacheList() {
    var accountBox = document.getElementById("cacheSelectAccountMenuPopup");

    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);

    var accounts = accountManager.accounts;
    for (var i = 0; i < accounts.Count(); i++)  {
        var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);

        var menuitem = document.createElementNS(XUL_NAMESPACE, "menuitem");
        menuitem.setAttribute("label", account.incomingServer.prettyName);
        menuitem.setAttribute("value", account.key);
        accountBox.appendChild(menuitem);
    }

    accountManager = null;
}



/** ****************************************************************************
 * Create checkbox elements for all folders
 *
 * @param box
 *          The box to which to add the checkbox elements to
 * @param folders
 *          All folders for which to create checkboxes
 * @param account
 *          The account for which the checkboxes are created
 * @param indent
 *          The amount of indentation
 * @return
 *          void
 ******************************************************************************/
function buildFolderCheckboxes(box, folders, account, indent) {
    var pref = document.getElementById("hiddenDisabledFolders").value;

    for (var i = 0; i < folders.length; i++) {
        var folder = folders[i];

        if (folder instanceof Array) {
            buildFolderCheckboxes(box, folder, account, indent + 1);
            continue;
        }

        var checkbox = document.createElementNS(XUL_NAMESPACE, "checkbox");
        checkbox.setAttribute("label", folder.name);
        checkbox.setAttribute("oncommand", "buildFolderPreference();");
        checkbox.setAttribute("folderuri", folder.URI);
        checkbox.setAttribute("checkboxtype", "folder");
        checkbox.setAttribute("accountkey", account);
        checkbox.style.paddingLeft = indent + "em";
        if (pref != "" && pref.indexOf(folder.URI + " ") > -1) {
            checkbox.setAttribute("checked", false);
        } else {
            checkbox.setAttribute("checked", true);
        }
        box.appendChild(checkbox);
    }
}



/** ****************************************************************************
 * Create a string preference of all selected folders
 *
 * @return
 *          void
 ******************************************************************************/
function buildFolderPreference() {
    var accountBox = document.getElementById("enableAccounts");
    var pref = document.getElementById("hiddenDisabledFolders");

    var prefString = " ";

    var checkboxes = accountBox.getElementsByAttribute("checkboxtype", "folder");

    for (var i = 0; i < checkboxes.length; i++) {
        var checkbox = checkboxes.item(i);
        if (! checkbox.checked) {
            prefString += checkbox.getAttribute("folderuri") + " ";
        }
    }
    pref.value = prefString;
    // We need to call doCommand(), because otherwise Thunderbird 1.5 doesn't
    // update the underlying preference upon closing the window (i.e. ignores
    // the new value of the textbox).
    pref.doCommand();
}



/** ****************************************************************************
 * Compose an email
 *
 * @param to
 *          The address to which the email should be sent
 * @param subjet
 *          The subject of the email
 * @param body
 *          The body of the email
 * @param attachments
 *          A list of files to attach to the email
 * @return
 *          void
 ******************************************************************************/
function composeEmail(to, subject, body, attachments) {
    var msgComposeType = Components.interfaces.nsIMsgCompType;
    var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
    var msgComposeService = Components
        .classes["@mozilla.org/messengercompose;1"].getService();
    msgComposeService = msgComposeService
        .QueryInterface(Components.interfaces.nsIMsgComposeService);
    
    var params = Components
        .classes["@mozilla.org/messengercompose/composeparams;1"]
        .createInstance(Components.interfaces.nsIMsgComposeParams);
    
    if (params) {
        params.type = msgComposeType.New;
        params.format = msgComposFormat.Default;
        var composeFields = Components
            .classes["@mozilla.org/messengercompose/composefields;1"]
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
                addAttachments(composeFields, attachments)
            }
            params.composeFields = composeFields;
            msgComposeService.OpenComposeWindowWithParams(null, params);
        }
    }
}



/** ****************************************************************************
 * Get all subfolders starting from "folder" as array
 *
 * @param folder
 *          The folder to check
 * @return
 *          An array of all subfolders
 ******************************************************************************/
function getAllFolders(folder) {
    // Seamonkey < 2 and Thunderbird <= 2 use GetSubFolders
    // (which returns a nsIEnumerator)
    // so we have to use .currentItem() and .next()
    // Thunderbird 3 and Seamonkey 2 use subFolders (which returns a nsISimpleEnumerator
    // so we have to use .getNext() and .hasMoreElements()
    var folderEnumerator = null;
    if (folder.GetSubFolders) {
        folderEnumerator = folder.GetSubFolders();
    }
    if (folder.subFolders) {
        folderEnumerator = folder.subFolders;
    }
    var currentFolder = null;
    var folders = new Array();

    while (true) {
        try {
            if (folderEnumerator.currentItem) {
                currentFolder = folderEnumerator.currentItem();
            }
            if (folderEnumerator.getNext) {
                currentFolder = folderEnumerator.getNext();
            }
        } catch (Exception) {
            break;
        }

        if (currentFolder instanceof Components.interfaces.nsIMsgFolder) {
            folders.push(currentFolder);
        }

        if (currentFolder.hasSubFolders) {
            folders.push(this.getAllFolders(currentFolder));
        }

        try {
            if (folderEnumerator.next) {
                folderEnumerator.next();
            }
            if (folderEnumerator.hasMoreElements && 
                ! folderEnumerator.hasMoreElements()) {
                break;
            }
        } catch (e) {
            break;
        }
    }

    return folders;
}



/** ****************************************************************************
 * Return file objects for all logfiles
 *
 * @return
 *          The array of all logfiles
 ******************************************************************************/
function getLogfiles() {
    var logfiles = new Array();
    var logger = getLogger();

    var file = null;
    if (logger) {
        file = logger.getFile();
    }

    if (file) {
        if (file.exists()) {
            logfiles.push(file);
        }
    }

    return logfiles;
}



/** ****************************************************************************
 * Get the logger object
 *
 * @param object
 *          A window object from which to search
 * @return
 *          The logger object
 ******************************************************************************/
function getLogger(object) {
    // if no object given, assume this window
    if (! object) {
        object = window;
    }

    // check for logger object
    if (object.THREADVIS && object.THREADVIS.logger) {
        return object.THREADVIS.logger;
    }

    // go to top parent window
    if (object.parent && object != object.parent) {
        return getLogger(object.parent);
    }

    // go to window opener, until logger found
    if (object.opener && object != object.opener) {
        return getLogger(object.opener);
    }

    // we have no logger, no parent and no opener
    // this shouldn't happen
    return null;
}



/** ****************************************************************************
 * Get the threadvis object
 *
 * @param object
 *          A window object to start searching from
 * @return
 *          The threadvis object
 ******************************************************************************/
function getThreadvis(object) {
    // if no object given, assume this window
    if (! object) {
        object = window;
    }

    // check for logger object
    if (object.THREADVIS) {
        return object.THREADVIS;
    }

    // go to top parent window
    if (object.parent && object != object.parent) {
        return getThreadvis(object.parent);
    }

    // go to window opener, until logger found
    if (object.opener && object != object.opener) {
        return getThreadvis(object.opener);
    }

    // we have no logger, no parent and no opener
    // this shouldn't happen
    return null;
}



/** ****************************************************************************
 * Open a homepage
 *
 * @param url
 *          The URL to open
 * @return
 *          void
 ******************************************************************************/
function openURL(url) {
    var uri = Components.classes["@mozilla.org/network/standard-url;1"]
        .createInstance(Components.interfaces.nsIURI);
    uri.spec = url;
    var protocolSvc = Components
        .classes["@mozilla.org/uriloader/external-protocol-service;1"]
        .getService(Components.interfaces.nsIExternalProtocolService);
    protocolSvc.loadUrl(uri);
}



/** ****************************************************************************
 * Reset the logfiles
 *
 * @return
 *          void
 ******************************************************************************/
function resetLogfiles() {
    var logger = getLogger();

    if (logger) {
        logger.reset(true);
    }
    else {
        alert(document.getElementById("threadVisStrings")
            .getString("logger.couldnotdeletefile"));
    }
}



/** ****************************************************************************
 * Send the logfiles to the author
 *
 * @return
 *          void
 ******************************************************************************/
function sendLogfiles() {
    var logfiles = getLogfiles();
    composeEmail("ahubmann@gmail.com", "[ThreadVis] Auto-Email-Logs",
        null, logfiles);
}



/** ****************************************************************************
 * Enable or disable the cache reset button
 *
 * @return
 *          void
 ******************************************************************************/
function toggleCacheSelect() {
    var menulist = document.getElementById("cacheSelectAccount");
    var button = document.getElementById("resetCache");
    if (menulist.value != "---") {
        button.disabled = false;
    } else {
        button.disabled = true;
    }
}



/** ****************************************************************************
 * Enable or disable the highlight checkbox
 *
 * @return
 *          void
 ******************************************************************************/
function toggleHighlight() {
    var colourRadio = document.getElementById("visualisationColourAuthor");
    var highlightCheckbox = document.getElementById("visualisationHighlight");
    if (colourRadio.selected) {
        highlightCheckbox.disabled = false;
    } else {
        highlightCheckbox.disabled = true;
    }
}



/** ****************************************************************************
 * Enable or disable the debug checkbox
 *
 * @return
 *          void
 ******************************************************************************/
function toggleLogging() {
    var logCheckbox = document.getElementById("doLogging");
    var debugCheckbox = document.getElementById("doLoggingDebug");
    if (logCheckbox.checked) {
        debugCheckbox.disabled = false;
    } else {
        debugCheckbox.disabled = true;
    }
}



/** ****************************************************************************
 * Write an email to the author
 *
 * @return
 *          void
 ******************************************************************************/
function writeEmail() {
    composeEmail("ahubmann@gmail.com", "[ThreadVis] <insert subject here>", null)
}



/** ****************************************************************************
 * Reset cache for selected account
 *
 * @return
 *          void
 ******************************************************************************/
function resetCache() {
    var menulist = document.getElementById("cacheSelectAccount");
    var accountKey = menulist.value;
    getThreadvis().cache.reset(accountKey);
    alert(document.getElementById("threadVisStrings")
        .getString("cache.reset.done"));
}



/** ****************************************************************************
 * Load preferences in about dialog
 *
 * @return
 *          void
 ******************************************************************************/
function loadAboutPreference() {
    var preferences = window.opener.THREADVIS.preferences;
    var disabledAccounts = preferences.getPreference(
        preferences.PREF_DISABLED_ACCOUNTS);
    var disabledFolders = preferences.getPreference(
        preferences.PREF_DISABLED_FOLDERS);
    document.getElementById("hiddenDisabledAccounts").value = disabledAccounts;
    document.getElementById("hiddenDisabledFolders").value = disabledFolders;
}



/** ****************************************************************************
 * Save preferences in about dialog
 *
 * @return
 *          void
 ******************************************************************************/
function saveAboutSettings() {
    var disabledAccounts = document
        .getElementById("hiddenDisabledAccounts").value;
    var disabledFolders = document
        .getElementById("hiddenDisabledFolders").value;
    var notShowAgain = document.getElementById("donotshowagain").checked;

    var preferences = window.opener.THREADVIS.preferences;
    var about = window.opener.THREADVIS.ABOUT;
    preferences.setPreference(
        preferences.PREF_DISABLED_ACCOUNTS, disabledAccounts,
        preferences.PREF_STRING);
    preferences.setPreference(
        preferences.PREF_DISABLED_FOLDERS, disabledFolders,
        preferences.PREF_STRING);
    if (notShowAgain) {
        preferences.setPreference(
            preferences.PREF_ABOUT, about,
            preferences.PREF_INT);
    }
}



/** ****************************************************************************
 * Select all folders for an account
 *
 * @param element
 *          The account element
 * @return
 *          void
 ******************************************************************************/
function selectAll(element) {
    var accountKey = element.getAttribute("accountkey");

    var accountBox = document.getElementById("enableAccounts");
    var folderCheckboxes = accountBox
        .getElementsByAttribute("checkboxtype", "folder");
    for (var j = 0; j < folderCheckboxes.length; j++) {
        var folderCheckbox = folderCheckboxes.item(j);
        if (folderCheckbox.getAttribute("accountkey") == accountKey) {
            folderCheckbox.checked = true;
        }
    }
}



/** ****************************************************************************
 * Deselect all folders for an account
 *
 * @param element
 *          The account element
 * @return
 *          void
 ******************************************************************************/
function selectNone(element) {
    var accountKey = element.getAttribute("accountkey");

    var accountBox = document.getElementById("enableAccounts");
    var folderCheckboxes = accountBox
        .getElementsByAttribute("checkboxtype", "folder");
    for (var j = 0; j < folderCheckboxes.length; j++) {
        var folderCheckbox = folderCheckboxes.item(j);
        if (folderCheckbox.getAttribute("accountkey") == accountKey) {
            folderCheckbox.checked = false;
        }
    }
}
