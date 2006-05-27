/** ****************************************************************************
 * Settings.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file for settings dialog
 *
 * Version: $Id$
 ******************************************************************************/



var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// preference branch for this extension
var THREADARCSJS_PREF_BRANCH_ = "extensions.threadarcsjs.";
// name of preference for enabled accounts and folders
var THREADARCSJS_PREF_ENABLEDACCOUNTS_ = "enabledaccounts";



/** ****************************************************************************
 * init the dialog, read all settings, build the account list, ...
 ******************************************************************************/
function init()
{
    toggleLogging();
    toggleHighlight();
    buildAccountList();
    buildAccountPreference();
}



/** ****************************************************************************
 * add attachments from file objects
 ******************************************************************************/
function addAttachments(composeFields, attachments)
{
    for (key in attachments)
    {
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
function buildAccountList()
{
    var account_box = document.getElementById("enableaccounts");
    var pref = document.getElementById("hidden_disabledaccounts").value;
    
    var account_manager = Components.classes["@mozilla.org/messenger/account-manager;1"]
                         .getService(Components.interfaces.nsIMsgAccountManager);
    
    var accounts = account_manager.accounts;
    for (var i = 0; i < accounts.Count(); i++) 
    {
        var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
        
        // get folders
        var root_folder = account.incomingServer.rootFolder;
        var folders = getAllFolders(root_folder);
        
        var checkbox = document.createElementNS(XUL_NAMESPACE_, "checkbox");
        checkbox.setAttribute("label", account.incomingServer.prettyName);
        checkbox.setAttribute("oncommand", "buildAccountPreference();");
        checkbox.setAttribute("accountkey", account.key);
        checkbox.setAttribute("checkboxtype", "account");
        var regexp = new RegExp(account.key);
        if (pref != "" && pref.match(regexp))
        {
            checkbox.setAttribute("checked", false);
        }
        else
        {
            checkbox.setAttribute("checked", true);
        }
        account_box.appendChild(checkbox);
        buildFolderCheckboxes(account_box, folders, account.key, 1);
        
        var separator = document.createElementNS(XUL_NAMESPACE_, "separator");
        separator.setAttribute("class", "groove");
        account_box.appendChild(separator);
    }
}



/** ****************************************************************************
 * create a string preference of all selected accounts
 ******************************************************************************/
function buildAccountPreference()
{
    var account_box = document.getElementById("enableaccounts");
    var pref = document.getElementById("hidden_disabledaccounts");
    
    var prefstring = "";
    
    var checkboxes = account_box.getElementsByAttribute("checkboxtype", "account");
    
    for (var i = 0; i < checkboxes.length; i++)
    {
        var checkbox = checkboxes.item(i);
        if (! checkbox.checked)
        {
            prefstring += " " + checkbox.getAttribute("accountkey");
        }
        
        var folder_checkboxes = account_box.getElementsByAttribute("checkboxtype", "folder");
        for (var j = 0; j < folder_checkboxes.length; j++)
        {
            var folder_checkbox = folder_checkboxes.item(j);
            if (folder_checkbox.getAttribute("accountkey") == checkbox.getAttribute("accountkey"))
            {
                if (checkbox.checked)
                {
                    folder_checkbox.disabled = false;
                }
                else
                {
                    folder_checkbox.disabled = true;
                }
            }
        }
        
    }
    pref.value = prefstring;
    // We need to call doCommand(), because otherwise Thunderbird 1.5 doesn't update
    // the underlying preference upon closing the window (i.e. ignores the new
    // value of the textbox).
    pref.doCommand();
}



/** ****************************************************************************
 * create checkbox elements for all folders
 ******************************************************************************/
function buildFolderCheckboxes(box, folders, account, indent)
{
    var pref = document.getElementById("hidden_disabledfolders").value;
    
    for (var i = 0; i < folders.length; i++)
    {
        var folder = folders[i];
        
        if (folder instanceof Array)
        {
            buildFolderCheckboxes(box, folder, account, indent + 1);
            continue;
        }
        
        var checkbox = document.createElementNS(XUL_NAMESPACE_, "checkbox");
        checkbox.setAttribute("label", folder.name);
        checkbox.setAttribute("oncommand", "buildFolderPreference();");
        checkbox.setAttribute("folderuri", folder.URI);
        checkbox.setAttribute("checkboxtype", "folder");
        checkbox.setAttribute("accountkey", account);
        checkbox.style.paddingLeft = indent + "em";
        var regexp = new RegExp(folder.URI + " ");
        if (pref != "" && pref.match(regexp))
        {
            checkbox.setAttribute("checked", false);
        }
        else
        {
            checkbox.setAttribute("checked", true);
        }
        box.appendChild(checkbox);
    }
}



/** ****************************************************************************
 * create a string preference of all selected folders
 ******************************************************************************/
function buildFolderPreference()
{
    var account_box = document.getElementById("enableaccounts");
    var pref = document.getElementById("hidden_disabledfolders");
    
    var prefstring = "";
    
    var checkboxes = account_box.getElementsByAttribute("checkboxtype", "folder");
    
    for (var i = 0; i < checkboxes.length; i++)
    {
        var checkbox = checkboxes.item(i);
        if (! checkbox.checked)
        {
            prefstring += checkbox.getAttribute("folderuri") + " ";
        }
    }
    pref.value = prefstring;
    // We need to call doCommand(), because otherwise Thunderbird 1.5 doesn't update
    // the underlying preference upon closing the window (i.e. ignores the new
    // value of the textbox).
    pref.doCommand();
}



/** ****************************************************************************
 * compose an email
 ******************************************************************************/
function composeEmail(to,
                      subject,
                      body,
                      attachments)
{
    var msgComposeType = Components.interfaces.nsIMsgCompType;
    var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
    var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"]
                            .getService();
    msgComposeService = msgComposeService
                        .QueryInterface(Components.interfaces.nsIMsgComposeService);

    var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"]
                 .createInstance(Components.interfaces.nsIMsgComposeParams);

    if (params)
    {
        params.type = msgComposeType.New;
        params.format = msgComposFormat.Default;
        var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
                            .createInstance(Components.interfaces.nsIMsgCompFields);
        if (composeFields)
        {
            if (to)
                composeFields.to = to;
            if (subject)
                composeFields.subject = subject;
            if (body)
                composeFields.body = body;
            if (attachments)
                addAttachments(composeFields, attachments)
            params.composeFields = composeFields;
            msgComposeService.OpenComposeWindowWithParams(null, params);
        }
    }
}



/** ****************************************************************************
 * get all subfolders starting from "folder" as array
 ******************************************************************************/
function getAllFolders(folder)
{
    var folder_enumerator = folder.GetSubFolders();
    var current_folder = null;
    var folders = new Array();
    
    while (true)
    {
        try
        {
            current_folder = folder_enumerator.currentItem();
        }
        catch (Exception)
        {
            break;
        }

        if (current_folder instanceof Components.interfaces.nsIMsgFolder)
            folders.push(current_folder);

        if (current_folder.hasSubFolders)
            folders.push(this.getAllFolders(current_folder));

        try
        {
            folder_enumerator.next();
        }
        catch (Exception)
        {
            break;
        }
    }
    
    return folders;
}



/** ****************************************************************************
 * return file objects for all logfiles
 ******************************************************************************/
function getLogfiles()
{
    var logfiles = new Array();
    var logger = getLogger();

    var file = null;
    if (logger)
        file = logger.getFile();

    if (file)
        if (file.exists())
            logfiles.push(file);

    return logfiles;
}



/** ****************************************************************************
 * get the logger object
 ******************************************************************************/
function getLogger(object)
{
    // if no object given, assume this window
    if (! object)
        object = window;

    // check for logger object
    if (object.LOGGER_)
        return object.LOGGER_;

    // go to top parent window
    if (object.parent && object != object.parent)
        return getLogger(object.parent);

    // go to window opener, until logger found
    if (object.opener && object != object.opener)
        return getLogger(object.opener);

    // we have no logger, no parent and no opener
    // this shouldn't happen
    return null;
}



/** ****************************************************************************
 * open a homepage
 ******************************************************************************/
function openURL(url)
{
    var uri = Components.classes["@mozilla.org/network/standard-url;1"]
              .createInstance(Components.interfaces.nsIURI);
    uri.spec = url;
    var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
                      .getService(Components.interfaces.nsIExternalProtocolService);
    protocolSvc.loadUrl(uri);
}



/** ****************************************************************************
 * reset the logfiles
 ******************************************************************************/
function resetLogfiles()
{
    var logger = getLogger();

    if (logger)
        logger.reset(true);
    else
        alert(parent.getElementById("ThreadArcsJSStrings").getString("logger.couldnotdeletefile"));
}



/** ****************************************************************************
 * send the logfiles to the author
 ******************************************************************************/
function sendLogfiles()
{
    var logfiles = getLogfiles();
    composeEmail("xpert@sbox.tugraz.at",
                 "[ThreadArcsJS] Auto-Email-Logs",
                 null,
                 logfiles);
}



/** ****************************************************************************
 * enable or disable the highlight checkbox
 ******************************************************************************/
function toggleHighlight()
{
    var colourradio = document.getElementById("visualisationcolourauthor");
    var highlightcheckbox = document.getElementById("visualisationhighlight");
    if (colourradio.selected)
        highlightcheckbox.disabled = false;
    else
        highlightcheckbox.disabled = true;
}



/** ****************************************************************************
 * enable or disable the debug checkbox
 ******************************************************************************/
function toggleLogging()
{
    var logcheckbox = document.getElementById("dologging");
    var debugcheckbox = document.getElementById("dologgingdebug");
    if (logcheckbox.checked)
        debugcheckbox.disabled = false;
    else
        debugcheckbox.disabled = true;
}



/** ****************************************************************************
 * write an email to the author
 ******************************************************************************/
function writeEmail()
{
    composeEmail("xpert@sbox.tugraz.at",
                 "[ThreadArcsJS] <insert subject here>", null)
}
