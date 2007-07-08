/** ****************************************************************************
 * Debug.js
 *
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file providing debug information
 *
 * $Id$
 ******************************************************************************/



var DEBUG = null;



var DEBUG_ENABLED = true;



/** ****************************************************************************
 * constructor
 ******************************************************************************/
function Debug() {
    this.consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
}



/** ****************************************************************************
 * Log
 ******************************************************************************/
Debug.prototype.log = function(msg) {
    this.consoleService.logStringMessage(msg);
}



DEBUG = new Debug();