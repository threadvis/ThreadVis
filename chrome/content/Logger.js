/* *****************************************************************************
 * Logger.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to log events
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * constructor
 * read preferences
 * open file if necessary
 ******************************************************************************/
function Logger() {
    this.EXTENSION_PATH = "extensions";
    this.EXTENSION_GUID = "{A23E4120-431F-4753-AE53-5D028C42CFDC}";
    this.LOGFILENAME = "threadvis.log.xml";
    this.STARTTAG = '\n<log extensionversion="<<version>>.<<build>>">';
    this.ENDTAG = "\n</log>";

    this.COMPONENT_VISUALISATION = "visualisation";
    this.COMPONENT_CACHE = "cache";
    this.COMPONENT_THREADER = "threader";
    this.COMPONENT_EMAIL = "email";

    this.LEVEL_INFO = "info";
    this.LEVEL_WARNING = "warning";
    this.LEVEL_ERROR = "error";

    // init class variables
    this.strings = document.getElementById("ThreadVisStrings");

    // try to create file
    this.file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsIFile);

    this.file.append(this.EXTENSION_PATH);
    if (! this.file.exists()) {
        this.file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    this.file.append(this.EXTENSION_GUID);
    if (! this.file.exists()) {
        this.file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    this.file.append(this.LOGFILENAME);

    this.ready = false;

    // if logging is enabled, open file
    if (this.doLogging()) {
        this.open();
    } else {
        this.ready = false;
    }

    this.consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);

    var ref = this;
    THREADVIS.preferences.registerCallback(THREADVIS.preferences.PREF_LOGGING,
        function(value) { ref.observe(value); });
}



/** ****************************************************************************
 * close the logfile
 ******************************************************************************/
Logger.prototype.close = function() {
    // if file is open, close it
    // but write end tag to log first
    if (this.ready) {
        this.ready = false;
        this.fileOutputStream.write(this.ENDTAG, this.ENDTAG.length);
        this.fileOutputStream.close();
    }
}



/** ****************************************************************************
 * convert an object to xml
 ******************************************************************************/
Logger.prototype.decode = function(object) {
    var logtext = "";
    for (var key in object) {
        logtext += '<info key="' + key + '">';
        if (typeof(object[key]) == "object") {
            logtext += this.decode(object[key]);
        } else {
            logtext += object[key];
        }
        logtext += "</info>";
    }
    return logtext;
}



/** ****************************************************************************
 * convert an object to xml
 * this method is called in debug mode
 * so use CDATA blocks to escape
 ******************************************************************************/
Logger.prototype.decodeDebug = function(object) {
    var logtext = "";
    for (var key in object) {
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
Logger.prototype.doLogging = function() {
    return THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_LOGGING);
}



/** ****************************************************************************
 * return the logfile file object
 ******************************************************************************/
Logger.prototype.getFile = function() {
    return this.file;
}



/** ****************************************************************************
 * check to see if debug to console is enabled
 ******************************************************************************/
Logger.prototype.isConsole = function() {
    return (THREADVIS.preferences.getPreference(
            THREADVIS.preferences.PREF_LOGGING_CONSOLE));
}



/** ****************************************************************************
 * check to see if debug logging is enabled for this component
 ******************************************************************************/
Logger.prototype.isDebug = function(component) {
    return (THREADVIS.preferences.getPreference(
            THREADVIS.preferences.PREF_LOGGING_DEBUG)
        && THREADVIS.preferences.getPreference(
            THREADVIS.preferences.PREF_LOGGING_DEBUG_COMPONENT).search(component) != -1);
}



/** ****************************************************************************
 * log an info message
 ******************************************************************************/
Logger.prototype.log = function(item, infos) {
    if (this.isConsole()) {
        this.logConsole(this.LEVEL_INFO, item, infos);
    } else {
        if (this.ready) {
            var date = new Date();
            var logtext = "";
            logtext += '\n<logitem date="' + date + '" item="' + item + '">';
            logtext += this.decode(infos);
            logtext += "</logitem>";
            this.fileOutputStream.write(logtext, logtext.length);
        }
    }
}



/** ****************************************************************************
 * write string to error console
 ******************************************************************************/
Logger.prototype.logConsole = function(severity, item, infos) {
    var msg = item;
    for (var i in infos) {
        msg += "\n" + i + ": " + infos[i];
    }

    var flag = 0;
    switch (severity) {
        case this.LEVEL_INFO:
            this.consoleService.logStringMessage(msg);
            return;
        case this.LEVEL_ERROR:
            flag = Components.interfaces.nsIScriptError.errorFlag;
            break;
        case this.LEVEL_WARNING:
            flag = Components.interfaces.nsIScriptError.warningFlag;
            break;
    }
    var scriptError = Components.classes["@mozilla.org/scripterror;1"]
        .createInstance(Components.interfaces.nsIScriptError);
    scriptError.init(msg, null, null, null, 
        null, flag, null);

    this.consoleService.logMessage(scriptError);
}



/** ****************************************************************************
 * write a string to the file in debug mode
 ******************************************************************************/
Logger.prototype.logDebug = function(severity, item, infos) {
    if (this.isConsole()) {
        this.logConsole(severity, item, infos);
    } else {
        if (this.ready) {
            var date = new Date();
            var logtext = "";
            logtext += '\n<logitem date="' + date + '" item="' + item + '">';
            logtext += this.decodeDebug(infos);
            logtext += "</logitem>";
            this.fileOutputStream.write(logtext, logtext.length);
        }
    }
}



/** ****************************************************************************
 * observe preferences changes
 ******************************************************************************/
Logger.prototype.observe = function(enabled) {
    // if logging is enabled, but not ready:
    // this means it was just enabled, so open logfile
    if (enabled && ! this.ready) {
        this.open();
    }

    // if logging is disabled, but ready
    // this means it was just disabled, so close logfile
    if (!enabled && this.ready) {
        this.close();
    }
}



/** ****************************************************************************
 * open the logfile
 ******************************************************************************/
Logger.prototype.open = function() {
    this.ready = false;

    if (! this.file.exists())
        this.file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);

    if (this.file.exists()) {
        this.fileOutputStream = Components
            .classes["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Components.interfaces.nsIFileOutputStream);
        var options = 0x2 | 0x8 | 0x10;
        this.fileOutputStream.init(this.file, options, 0, 0);
        this.fileOutputStream.write(this.STARTTAG, this.STARTTAG.length);
        this.ready = true;
    }
}



/** ****************************************************************************
 * reset the logfile
 ******************************************************************************/
Logger.prototype.reset = function(deleteFile) {
    if (this.ready) {
        this.close();
    }

    try {
        if (deleteFile && this.file) {
            this.file.remove(false);
        }
        alert(this.strings.getString("logger.deletedfile"));
    } catch (ex) {
        alert(this.strings.getString("logger.couldnotdeletefile"));
        alert(ex);
    }

    if (this.doLogging()) {
        this.open();
    }
}
