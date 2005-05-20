/** ****************************************************************************
 * Settings.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file for settings dialog
 *
 * Version: $Id$
 ******************************************************************************/



/** ****************************************************************************
 * init
 ******************************************************************************/
function init()
{
    var dologging = document.getElementById("dologging");
    if (! dologging.checked)
    {
        var debug = document.getElementById("dologgingdebug");
        debug.disabled = true;
    }
}



/** ****************************************************************************
 * write an email to the author
 ******************************************************************************/
function writeEmail()
{
    composeEmail("xpert@sbox.tugraz.at",
                 "[ThreadArcsJS] <insert subject here>", null)
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
    {
        if (file.exists())
            logfiles.push(file);
    }

    return logfiles;
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
 * reset the logfiles
 ******************************************************************************/
function resetLogfiles()
{
    var logger = getLogger();

    if (logger)
    {
        logger.reset(true);
    }
    else
    {
        alert(parent.getElementById("ThreadArcsJSStrings").getString("logger.couldnotdeletefile"));
    }
}



/** ****************************************************************************
 * Enable or disable the debug checkbox
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