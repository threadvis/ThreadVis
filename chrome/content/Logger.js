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
var LOGGER_LOGFILENAME_ = "threadarcsjs.log.txt";
var LOGGER_PREF_DOLOGGING_ = "extensions.threadarcsjs.logging.enabled";


/**
 * constructor
 * read preferences
 * open file if necessary
 */
function Logger()
{
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if (prefs.getPrefType(LOGGER_PREF_DOLOGGING_) == prefs.PREF_BOOL)
        this.logging_ = prefs.getBoolPref(LOGGER_PREF_DOLOGGING_);
    else
        this.logging_ = false;
    
    if (this.logging_)
    {
        this.open(false);
    }
    else
    {
        this.ready_ = false;
    }
}


/**
 * close the logfile
 */
Logger.prototype.close = function()
{
    if (this.ready_)
    {
        this.ready_ = false;
        this.file_output_stream_.close();
    }
}


/**
 * return the logfile file object
 */
Logger.prototype.getFile = function()
{
    return this.file_;
}


/**
 * write a string to the file
 */
Logger.prototype.log = function(message)
{
    if (this.ready_)
    {
        var date = new Date();
        var logtext = "\n" + date + ": " + message;
        this.file_output_stream_.write(logtext, logtext.length);
    }
}


/**
 * open the logfile
 */
Logger.prototype.open = function(reset)
{
    this.file_ = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    
    this.file_.append(LOGGER_EXTENSION_PATH_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0644);

    this.file_.append(LOGGER_EXTENSION_GUID_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0644);

    this.ready_ = false;
    if (this.file_.exists())
    {
        this.file_.append(LOGGER_LOGFILENAME_);
        this.file_output_stream_ = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
        var options = 0x2 | 0x8 | 0x10;
        if (reset)
            options = options | 0x20;
        this.file_output_stream_.init(this.file_, options, 0, 0);
        this.ready_ = true;
    }
}


/**
 * reset the logfile
 */
Logger.prototype.reset = function()
{
    this.close();
    this.open(true);
    if (! this.logging_)
        this.close();
}
