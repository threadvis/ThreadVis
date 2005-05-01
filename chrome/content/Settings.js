/* *******************************************************
 * Settings.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file for settings dialog
 *
 * Version: $Id$
 ********************************************************/


/**
 * init
 */
function init()
{
    initPrefs();
    var dologging = document.getElementById("dologging");
    if (! dologging.checked)
    {
        var sendlog = document.getElementById("sendlog");
        sendlog.disabled = true;
        var resetlog = document.getElementById("resetlog");
        resetlog.disabled = true;
    }
}


/**
 * Init preferences (read in)
 */
function initPrefs()
{
    var prefElements = document.getElementsByAttribute("prefstring", "*");
    for (var i=0; i<prefElements.length; i++ )
    {
        var prefstring    = prefElements[i].getAttribute("prefstring");
        var prefid        = prefElements[i].getAttribute("id");
        var preftype      = prefElements[i].getAttribute("preftype");
        var prefdefval    = prefElements[i].getAttribute("prefdefval");
        var prefattribute = prefElements[i].getAttribute("prefattribute");
        var elt           = prefElements[i].localName;

        if (!preftype)
            preftype = getPreftype(elt);
        if (preftype == "int")
            prefdefval = parseInt(prefdefval, 10);
        if (!prefattribute)
            prefattribute = getPrefattribute(elt);

        var prefvalue;
        switch (preftype)
        {
            case "bool":
                prefvalue = nsPreferences.getBoolPref(prefstring, prefdefval);
                break;
            case "int":
                prefvalue = nsPreferences.getIntPref(prefstring, prefdefval);
                break;
            default:
                prefvalue = nsPreferences.copyUnicharPref(prefstring, prefdefval);
                break;
        }
        if (elt == "radiogroup")
            document.getElementById(prefid).selectedIndex = prefvalue
        else
            prefElements[i].setAttribute(prefattribute, prefvalue);
    }
}


/**
 * save preferences
 */
function savePrefs()
{
    var prefElements = document.getElementsByAttribute("prefstring", "*");
    for (var i=0; i<prefElements.length; i++ )  
    {
        var prefstring    = prefElements[i].getAttribute("prefstring");
        var prefid        = prefElements[i].getAttribute("id");
        var preftype      = prefElements[i].getAttribute("preftype");
        var prefattribute = prefElements[i].getAttribute("prefattribute");
        var elt           = prefElements[i].localName;

        if (!preftype)
            preftype = getPreftype(elt);
        if (!prefattribute)
            prefattribute = getPrefattribute(elt);

        if (elt == "radiogroup")
            var prefvalue = document.getElementById(prefid).selectedIndex;
        else if (elt == "textbox")
            var prefvalue = document.getElementById(prefid).value;
        else
            var prefvalue = prefElements[i].getAttribute(prefattribute);

        if (preftype == "bool")
        prefvalue = prefvalue == "true" ? true : false;

        switch (preftype)
        {
            case "bool":
                nsPreferences.setBoolPref(prefstring, prefvalue);
                break;
            case "int":
                nsPreferences.setIntPref(prefstring, prefvalue);
                break;
            default:
                nsPreferences.setUnicharPref(prefstring, prefvalue);
                break;
        }
    }
}


/**
 * get preference type
 */
function getPreftype(elem)
{
    var result = "";

    if (elem == "textbox")
        result = "string";
    else if (elem == "checkbox" || elem == "listitem" || elem == "button")
        result = "bool";
    else if (elem == "radiogroup" || elem == "menulist")
        result = "int";
    return result;
}


/**
 * get preference attribute
 */
function getPrefattribute(elem)
{
    var result = "";

    if (elem == "radiogroup")
        result = "selectedIndex";
    else if (elem == "textbox" || elem == "menulist")
        result = "value";
    else if (elem == "checkbox" || elem == "listitem")
        result = "checked";
    else if (elem == "button")
        result = "disabled";
    return result;
}


/**
 * write an email to the author
 */
function writeEmail()
{
    composeEmail("xpert@sbox.tugraz.at", "[ThreadArcsJS] <insert subject here>", null)
}


/**
 * send the logfiles to the author
 */
function sendLogfiles()
{
    var logfiles = getLogfiles();
    composeEmail("xpert@sbox.tugraz.at", "[ThreadArcsJS] Auto-Email-Logs", null, logfiles);
}


/**
 * compose an email
 */
function composeEmail(to, subject, body, attachments)
{
    var msgComposeType = Components.interfaces.nsIMsgCompType;
    var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
    var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"].getService();
    msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);
    
    var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
    if (params)
    {
        params.type = msgComposeType.New;
        params.format = msgComposFormat.Default;
        var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
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


/**
 * return file objects for all logfiles
 */
function getLogfiles()
{
    var logfiles = new Array();
    var logger = window.opener.opener ? window.opener.opener.LOGGER_ : window.opener.LOGGER_;

    var file = null;
    if (logger)
        file = logger.getFile();

    if (file)
    {
        if (file.exists())
            logfiles.push(file);
    }
    
    return logfiles;
}


/**
 * add attachments from file objects
 */
function addAttachments(composeFields, attachments)
{
    for (key in attachments)
    {
        var file = attachments[key];
        var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"].createInstance(Components.interfaces.nsIMsgAttachment);
        var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var fileHandler = ios.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
        attachment.url = fileHandler.getURLSpecFromFile(file);
        composeFields.addAttachment(attachment);
    }
}


/**
 * reset the logfiles
 */
function resetLogfiles()
{
    var logger = window.opener.opener ? window.opener.opener.LOGGER_ : window.opener.LOGGER_;
    if (logger)
    {
        logger.reset();
        alert("Logfiles reset");
    }
    else
    {
        alert("Could not reset logfiles");
    }
}