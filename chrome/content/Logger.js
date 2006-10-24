/* *****************************************************************************
 * Logger.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file to log events
 *
 * Version: $Id$
 ******************************************************************************/



/** ****************************************************************************
 * constructor
 * read preferences
 * open file if necessary
 ******************************************************************************/
function Logger()
{
    this.EXTENSION_PATH_ = "extensions";
    this.EXTENSION_GUID_ = "{A23E4120-431F-4753-AE53-5D028C42CFDC}";
    this.LOGFILENAME_ = "threadvis.log.xml";
    this.STARTTAG_ = '\n<log extensionversion="0.8">';
    this.ENDTAG_ = "\n</log>";

    this.LEVEL_ERROR_ = 0;
    this.LEVEL_INFORM_ = 1;
    this.LEVEL_VIS_ = 2;
    this.LEVEL_EMAIL_ = 3;
    this.LEVEL_ALL_ = 4;

    // init class variables
    this.strings_ = document.getElementById("ThreadVisStrings");

    // try to create file
    this.file_ = Components.classes["@mozilla.org/file/directory_service;1"]
                 .getService(Components.interfaces.nsIProperties)
                 .get("ProfD", Components.interfaces.nsIFile);

    this.file_.append(this.EXTENSION_PATH_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);

    this.file_.append(this.EXTENSION_GUID_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);

    this.file_.append(this.LOGFILENAME_);

    this.ready_ = false;

    // if logging is enabled, open file
    if (this.doLogging())
    {
        this.open();
    }
    else
    {
        this.ready_ = false;
    }
    
    var ref = this;
    THREADVIS.preferences_.registerCallback(THREADVIS.preferences_.PREF_LOGGING_, function(value) { ref.observe(value); });
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
        this.file_output_stream_.write(this.ENDTAG_,
                                       this.ENDTAG_.length);
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
    return THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_LOGGING_);
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
Logger.prototype.logDebug = function(level,
                                     item,
                                     infos)
{
    if (this.ready_ && 
        THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_LOGGING_DEBUG_) &&
        THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_LOGGING_DEBUG_LEVEL_) >= level)
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
Logger.prototype.observe = function(enabled)
{
    // if logging is enabled, but not ready:
    // this means it was just enabled, so open logfile
    if (enabled && ! this.ready_)
    {
        this.open();
    }

    // if logging is disabled, but ready
    // this means it was just disabled, so close logfile
    if (!enabled && this.ready_)
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
        this.file_output_stream_.write(this.STARTTAG_,
                                       this.STARTTAG_.length);
        this.ready_ = true;
    }
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
