/* *******************************************************
 * Logger.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file to log events
 *
 * Version: $Id$
 ********************************************************/

var LOGGER_EXTENSION_PATH_ = "extensions";
var LOGGER_EXTENSION_GUID_ = "{A23E4120-431F-4753-AE53-5D028C42CFDC}";
var LOGGER_LOGFILENAME_ = "log.txt";


function Logger()
{
    this.file_ = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    this.file_.append(LOGGER_EXTENSION_PATH_);
    this.file_.append(LOGGER_EXTENSION_GUID_);
    
    this.ready_ = false;
    if (this.file_.exists())
    {
        this.file_.append(LOGGER_LOGFILENAME_);
        this.file_output_stream_ = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
        this.file_output_stream_.init(this.file_, 0x2 | 0x8 | 0x10, 0, 0);
        this.ready_ = true;
    }
    
}


Logger.prototype.log = function(message)
{
    if (this.ready_)
    {
        var date = new Date();
        var logtext = "\n" + date + ": " + message;
        this.file_output_stream_.write(logtext, logtext.length);
    }
}


Logger.prototype.close = function()
{
    if (this.ready_)
    {
        this.file_output_stream_.close();
    }
}

