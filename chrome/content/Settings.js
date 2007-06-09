/** ****************************************************************************
 * Settings.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file for settings dialog
 *
 * $Id$
 ******************************************************************************/



var XUL_NAMESPACE = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";



/** ****************************************************************************
 * init the dialog, read all settings, build the account list, ...
 ******************************************************************************/
function init() {
    toggleLogging();
    toggleHighlight();
    buildAccountList();
    buildAccountPreference();
    buildCacheList();
}



/** ****************************************************************************
 * add attachments from file objects
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
 * build the account list
 * get all accounts, display checkbox for each
 ******************************************************************************/
function buildAccountList() {
    var accountBox = document.getElementById("enableAccounts");
    var pref = document.getElementById("hiddenDisabledAccounts").value;

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
        var regexp = new RegExp(account.key);
        if (pref != "" && pref.match(regexp)) {
            checkbox.setAttribute("checked", false);
        } else {
            checkbox.setAttribute("checked", true);
        }
        accountBox.appendChild(checkbox);
        buildFolderCheckboxes(accountBox, folders, account.key, 1);

        var separator = document.createElementNS(XUL_NAMESPACE, "separator");
        separator.setAttribute("class", "groove");
        accountBox.appendChild(separator);
    }
}



/** ****************************************************************************
 * create a string preference of all selected accounts
 ******************************************************************************/
function buildAccountPreference() {
    var accountBox = document.getElementById("enableAccounts");
    var pref = document.getElementById("hiddenDisabledAccounts");

    var prefString = "";

    var checkboxes = accountBox.getElementsByAttribute("checkboxtype", "account");

    for (var i = 0; i < checkboxes.length; i++) {
        var checkbox = checkboxes.item(i);
        if (! checkbox.checked) {
            prefString += " " + checkbox.getAttribute("accountkey");
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
 * build the cache list
 * get all accounts
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
 * create checkbox elements for all folders
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
        var regexp = new RegExp(folder.URI + " ");
        if (pref != "" && pref.match(regexp)) {
            checkbox.setAttribute("checked", false);
        } else {
            checkbox.setAttribute("checked", true);
        }
        box.appendChild(checkbox);
    }
}



/** ****************************************************************************
 * create a string preference of all selected folders
 ******************************************************************************/
function buildFolderPreference() {
    var accountBox = document.getElementById("enableAccounts");
    var pref = document.getElementById("hiddenDisabledFolders");

    var prefString = "";

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
 * compose an email
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
 * get all subfolders starting from "folder" as array
 ******************************************************************************/
function getAllFolders(folder) {
    var folderEnumerator = folder.GetSubFolders();
    var currentFolder = null;
    var folders = new Array();

    while (true) {
        try {
            currentFolder = folderEnumerator.currentItem();
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
            folderEnumerator.next();
        } catch (Exception) {
            break;
        }
    }

    return folders;
}



/** ****************************************************************************
 * return file objects for all logfiles
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
 * get the logger object
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
 * get the threadvis object
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
 * open a homepage
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
 * reset the logfiles
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
 * send the logfiles to the author
 ******************************************************************************/
function sendLogfiles() {
    var logfiles = getLogfiles();
    composeEmail("ahubmann@gmail.com", "[ThreadVis] Auto-Email-Logs",
        null, logfiles);
}



/** ****************************************************************************
 * enable or disable the cache reset button
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
 * enable or disable the highlight checkbox
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
 * enable or disable the debug checkbox
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
 * write an email to the author
 ******************************************************************************/
function writeEmail() {
    composeEmail("ahubmann@gmail.com", "[ThreadVis] <insert subject here>", null)
}



/** ****************************************************************************
 * Reset all caches
 ******************************************************************************/
function resetCache() {
    var menulist = document.getElementById("cacheSelectAccount");
    var accountKey = menulist.value;
    getThreadvis().cache.reset(accountKey);
    alert(document.getElementById("threadVisStrings")
        .getString("cache.reset.done"));
}