/* *****************************************************************************
 * Logger.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file to log events
 *
 * Version: $Id$
 ******************************************************************************/



var LOGGER_EXTENSION_PATH_ = "extensions";
var LOGGER_EXTENSION_GUID_ = "{A23E4120-431F-4753-AE53-5D028C42CFDC}";
var LOGGER_LOGFILENAME_ = "threadvis.log.xml";
var THREADVIS_PREF_BRANCH_ = "extensions.threadvis.";
var LOGGER_PREF_DOLOGGING_ = "logging.enabled";
var LOGGER_PREF_DOLOGGING_DEBUG_ = "logging.debug";
var LOGGER_STARTTAG_ = '\n<log extensionversion="0.8pre">';
var LOGGER_ENDTAG_ = "\n</log>";



/** ****************************************************************************
 * constructor
 * read preferences
 * open file if necessary
 ******************************************************************************/
function Logger()
{
    // init class variables
    this.pref_enablelogging_ = false;
    this.pref_enablelogging_debug_ = false;
    this.strings_ = document.getElementById("ThreadVisStrings");

    this.preferenceObserverRegister();
    this.preferenceReload();

    // try to create file
    this.file_ = Components.classes["@mozilla.org/file/directory_service;1"]
                 .getService(Components.interfaces.nsIProperties)
                 .get("ProfD", Components.interfaces.nsIFile);

    this.file_.append(LOGGER_EXTENSION_PATH_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);

    this.file_.append(LOGGER_EXTENSION_GUID_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);

    this.file_.append(LOGGER_LOGFILENAME_);

    this.ready_ = false;

    // if logging is enabled, open file
    if (this.pref_enablelogging_)
    {
        this.open();
    }
    else
    {
        this.ready_ = false;
    }
}



/** ****************************************************************************
 * close the logfile
 ******************************************************************************/
Logger.prototype.close = function()
{
    // if file is open, close it
    // but write end tag to log first
    if (this.ready_)
    {
        this.ready_ = false;
        this.file_output_stream_.write(LOGGER_ENDTAG_,
                                       LOGGER_ENDTAG_.length);
        this.file_output_stream_.close();
    }
}



/** ****************************************************************************
 * convert an object to xml
 ******************************************************************************/
Logger.prototype.decode = function(object)
{
    var logtext = "";
    for (var key in object)
    {
        logtext += '<info key="' + key + '">';
        if (typeof(object[key]) == "object")
            logtext += this.decode(object[key]);
        else
            logtext += object[key];
        logtext += "</info>";
    }
    return logtext;
}



/** ****************************************************************************
 * convert an object to xml
 * this method is called in debug mode
 * so use CDATA blocks to escape
 ******************************************************************************/
Logger.prototype.decodeDebug = function(object)
{
    var logtext = "";
    for (var key in object)
    {
        logtext += '<info key="' + key + '">';
        logtext += "<![CDATA[";
        logtext += object[key];
        logtext += "]]>";
        logtext += "</info>";
    }
    return logtext;
}



/** ****************************************************************************
 * Return if we do logging
 ******************************************************************************/
Logger.prototype.doLogging = function()
{
    return this.pref_enablelogging_;
}



/** ****************************************************************************
 * return the logfile file object
 ******************************************************************************/
Logger.prototype.getFile = function()
{
    return this.file_;
}



/** ****************************************************************************
 * write a string to the file
 ******************************************************************************/
Logger.prototype.log = function(item,
                                infos)
{
    if (this.ready_)
    {
        var date = new Date();
        var logtext = "";
        logtext += '\n<logitem date="' + date + '" item="' + item + '">';
        logtext += this.decode(infos);
        logtext += "</logitem>";
        this.file_output_stream_.write(logtext, logtext.length);
    }
}



/** ****************************************************************************
 * write a string to the file in debug mode
 ******************************************************************************/
Logger.prototype.logDebug = function(item,
                                     infos)
{
    if (this.ready_ && 
        this.pref_enablelogging_debug_)
    {
        var date = new Date();
        var logtext = "";
        logtext += '\n<logitem date="' + date + '" item="' + item + '">';
        logtext += this.decodeDebug(infos);
        logtext += "</logitem>";
        this.file_output_stream_.write(logtext, logtext.length);
    }
}



/** ****************************************************************************
 * observe preferences changes
 ******************************************************************************/
Logger.prototype.observe = function(subject, topic, data)
{
    if(topic != "nsPref:changed")
        return;

    // reload preferences
    this.preferenceReload();

    // if logging is enabled, but not ready:
    // this means it was just enabled, so open logfile
    if (this.pref_enablelogging_ && ! this.ready_)
    {
        this.open();
    }

    // if logging is disabled, but ready
    // this means it was just disabled, so close logfile
    if (!this.pref_enablelogging_ && this.ready_)
    {
        this.close();
    }
}



/** ****************************************************************************
 * open the logfile
 ******************************************************************************/
Logger.prototype.open = function()
{
    this.ready_ = false;

    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);

    if (this.file_.exists())
    {
        this.file_output_stream_ = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                   .createInstance(Components.interfaces.nsIFileOutputStream);
        var options = 0x2 | 0x8 | 0x10;
        this.file_output_stream_.init(this.file_, options, 0, 0);
        this.file_output_stream_.write(LOGGER_STARTTAG_,
                                       LOGGER_STARTTAG_.length);
        this.ready_ = true;
    }
}



/** ****************************************************************************
 * Preference changing observer
 ******************************************************************************/
Logger.prototype.preferenceObserverRegister =  function()
{
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);
    this.pref_branch_ = prefService.getBranch(THREADVIS_PREF_BRANCH_);

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
}



/** ****************************************************************************
 * unregister observer
 ******************************************************************************/
Logger.prototype.preferenceObserverUnregister = function()
{
    if(!this.pref_branch_)
        return;

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
}



/** ****************************************************************************
 * reload preferences
 ******************************************************************************/
Logger.prototype.preferenceReload = function()
{
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
    this.pref_enablelogging_ = false;
    if (prefs.getPrefType(THREADVIS_PREF_BRANCH_ + LOGGER_PREF_DOLOGGING_) == prefs.PREF_BOOL)
        this.pref_enablelogging_ = prefs.getBoolPref(THREADVIS_PREF_BRANCH_ + LOGGER_PREF_DOLOGGING_);

    this.pref_enablelogging_debug_ = false;
    if (prefs.getPrefType(THREADVIS_PREF_BRANCH_ + LOGGER_PREF_DOLOGGING_DEBUG_) == prefs.PREF_BOOL)
        this.pref_enablelogging_debug_ = prefs.getBoolPref(THREADVIS_PREF_BRANCH_ + LOGGER_PREF_DOLOGGING_DEBUG_);
}



/** ****************************************************************************
 * reset the logfile
 ******************************************************************************/
Logger.prototype.reset = function(delete_file)
{
    if (this.ready_)
        this.close();

    try
    {
        if (delete_file && this.file_)
            this.file_.remove(false);
        alert(this.strings_.getString("logger.deletedfile"));
    }
    catch (ex)
    {
        alert(this.strings_.getString("logger.couldnotdeletefile"));
        alert(ex);
    }

    if (this.pref_enablelogging_)
        this.open();
}
