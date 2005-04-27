/* *******************************************************
 * About.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file for about dialog
 *
 * Version: $Id$
 ********************************************************/

function displayHomepage()
{
	opener.openTopBrowserWith("http://www.sbox.tugraz.at/home/x/xpert/threadarcs/");
	self.close();
}


function writeEmail()
{
    composeEmail("xpert@sbox.tugraz.at", "[ThreadArcsJS] <insert subject here>", null)
    self.close();
}


function sendLogfiles()
{
    var logfiles = getLogfiles();
    composeEmail("xpert@sbox.tugraz.at", "[ThreadArcsJS] Auto-Email-Logs", null, logfiles);
    self.close();
}


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


function getLogfiles()
{
    var logfiles = new Array();
    // fixxme
    return logfiles;
}


function addAttachments(composeFields, attachments)
{
    //composeFields.addAttachment(attachment);
}