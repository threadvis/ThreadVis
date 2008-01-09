/** ****************************************************************************
 * PreferenceObserver.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to react to preference changing events
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Preference observer
 ******************************************************************************/
function PreferenceObserver() {
    this.PREF_BRANCH = "extensions.threadvis.";

    this.PREF_ABOUT = "about";
    this.PREF_DISABLED_ACCOUNTS = "disabledaccounts";
    this.PREF_DISABLED_FOLDERS = "disabledfolders";
    this.PREF_ENABLED = "enabled";
    this.PREF_LOGGING = "logging.enabled";
    this.PREF_LOGGING_DEBUG = "logging.debug";
    this.PREF_LOGGING_DEBUG_COMPONENT = "logging.debug.component";
    this.PREF_LOGGING_CONSOLE = "logging.console";
    this.PREF_LOGGING_EMAIL = "logging.email";
    this.PREF_SVG_HEIGHT = "svg.height";
    this.PREF_SVG_WIDTH = "svg.width";
    this.PREF_TIMELINE = "timeline.enabled";
    this.PREF_TIMESCALING = "timescaling.enabled";
    this.PREF_VIS_DOTSIZE = "visualisation.dotsize";
    this.PREF_VIS_ARC_MINHEIGHT = "visualisation.arcminheight";
    this.PREF_VIS_ARC_RADIUS = "visualisation.arcradius";
    this.PREF_VIS_ARC_DIFFERENCE = "visualisation.arcdifference";
    this.PREF_VIS_ARC_WIDTH = "visualisation.arcwidth";
    this.PREF_VIS_SPACING = "visualisation.spacing";
    this.PREF_VIS_MESSAGE_CIRCLES = "visualisation.messagecircles";
    this.PREF_VIS_COLOUR = "visualisation.colour";
    this.PREF_VIS_HIGHLIGHT = "visualisation.highlight";
    this.PREF_VIS_OPACITY = "visualisation.opacity";
    this.PREF_VIS_SVG = "visualisation.svg";
    this.PREF_ZOOM_HEIGHT = "zoom.height";
    this.PREF_ZOOM_WIDTH = "zoom.width";

    // save cache update timestamps per account
    this.PREF_CACHE_LASTUPDATETIMESTAMP = "cache.updatetimestamp";

    this.prefBranch = null;
    this.preferences = new Object();
    this.callback = new Object();

    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
    this.prefBranch = prefService.getBranch(this.PREF_BRANCH);

    this.PREF_BOOL = this.prefBranch.PREF_BOOL;
    this.PREF_INT = this.prefBranch.PREF_INT;
    this.PREF_STRING = this.prefBranch.PREF_STRING;

    this.register();
    this.preferenceReload();
}



/** ****************************************************************************
 * do callbacks after preference change
 ******************************************************************************/
PreferenceObserver.prototype.doCallback = function(pref) {
    var value = this.preferences[pref];
    var array = this.callback[pref];
    if (array) {
        for (var key in array) {
            var func = array[key];
            func(value);
        }
    }
}



/** ****************************************************************************
 * get preference value for given preference
 ******************************************************************************/
PreferenceObserver.prototype.getPreference = function(pref) {
    return this.preferences[pref];
}



/** ****************************************************************************
 * load preference
 ******************************************************************************/
PreferenceObserver.prototype.loadPreference = function(pref, typ, def) {
    this.preferences[pref]= def;

    if (this.prefBranch.getPrefType(pref) != typ) {
        return;
    }

    switch (typ) {
        case this.prefBranch.PREF_BOOL:
            this.preferences[pref] = this.prefBranch.getBoolPref(pref);
            break;
        case this.prefBranch.PREF_STRING:
            this.preferences[pref] = this.prefBranch.getCharPref(pref);
            break;
        case this.prefBranch.PREF_INT:
            this.preferences[pref] = this.prefBranch.getIntPref(pref);
            break;
    }
}



/** ****************************************************************************
 * observe preferences changes
 ******************************************************************************/
PreferenceObserver.prototype.observe = function(subject, topic, data) {
    if(topic != "nsPref:changed") {
        return;
    }

    // reload preferences
    this.preferenceReload();
    this.doCallback(data);
}



/** ****************************************************************************
 * reload preferences
 ******************************************************************************/
PreferenceObserver.prototype.preferenceReload = function() {
    this.loadPreference(this.PREF_ABOUT,
        this.prefBranch.PREF_INT, 0);
    this.loadPreference(this.PREF_DISABLED_ACCOUNTS,
        this.prefBranch.PREF_STRING, "");
    this.loadPreference(this.PREF_DISABLED_FOLDERS,
        this.prefBranch.PREF_STRING, "");
    this.loadPreference(this.PREF_ENABLED,
        this.prefBranch.PREF_BOOL, true);
    this.loadPreference(this.PREF_LOGGING,
        this.prefBranch.PREF_BOOL, false);
    this.loadPreference(this.PREF_LOGGING_DEBUG,
        this.prefBranch.PREF_BOOL, false);
    this.loadPreference(this.PREF_LOGGING_DEBUG_COMPONENT,
        this.prefBranch.PREF_STRING, "");
    this.loadPreference(this.PREF_LOGGING_CONSOLE,
        this.prefBranch.PREF_BOOL, false);
    this.loadPreference(this.PREF_LOGGING_EMAIL,
        this.prefBranch.PREF_STRING, "0");
    this.loadPreference(this.PREF_SVG_HEIGHT,
        this.prefBranch.PREF_INT, 1000);
    this.loadPreference(this.PREF_SVG_WIDTH,
        this.prefBranch.PREF_INT, 1000);
    this.loadPreference(this.PREF_TIMELINE,
        this.prefBranch.PREF_BOOL, true);
    this.loadPreference(this.PREF_TIMESCALING,
        this.prefBranch.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_DOTSIZE,
        this.prefBranch.PREF_INT, 12);
    this.loadPreference(this.PREF_VIS_ARC_MINHEIGHT,
        this.prefBranch.PREF_INT, 12);
    this.loadPreference(this.PREF_VIS_ARC_RADIUS,
        this.prefBranch.PREF_INT, 32);
    this.loadPreference(this.PREF_VIS_ARC_DIFFERENCE,
        this.prefBranch.PREF_INT, 6);
    this.loadPreference(this.PREF_VIS_ARC_WIDTH,
        this.prefBranch.PREF_INT, 2);
    this.loadPreference(this.PREF_VIS_SPACING,
        this.prefBranch.PREF_INT, 24);
    this.loadPreference(this.PREF_VIS_MESSAGE_CIRCLES,
        this.prefBranch.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_COLOUR,
        this.prefBranch.PREF_STRING, "author");
    this.loadPreference(this.PREF_VIS_HIGHLIGHT,
        this.prefBranch.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_OPACITY,
        this.prefBranch.PREF_INT, 30);
    this.loadPreference(this.PREF_VIS_SVG,
        this.prefBranch.PREF_BOOL, false);
    this.loadPreference(this.PREF_ZOOM_HEIGHT,
        this.prefBranch.PREF_INT, 1);
    this.loadPreference(this.PREF_ZOOM_WIDTH,
        this.prefBranch.PREF_INT, 1);
    this.loadPreference(this.PREF_CACHE_LASTUPDATETIMESTAMP,
        this.prefBranch.PREF_STRING, "");
}



/** ****************************************************************************
 * Preference changing observer
 ******************************************************************************/
PreferenceObserver.prototype.register =  function() {
    var pbi = this.prefBranch
        .QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
}



/** ****************************************************************************
 * register a callback hook
 ******************************************************************************/
PreferenceObserver.prototype.registerCallback = function(preference, func) {
    if (this.callback[preference]) {
        this.callback[preference].push(func);
    } else {
        this.callback[preference] = new Array(func);
    }
}



/** ****************************************************************************
 * set preference value for given preference
 ******************************************************************************/
PreferenceObserver.prototype.setPreference = function(pref, val, typ) {
    this.preferences[pref] = val;
    this.storePreference(pref, typ, val);
}



/** ****************************************************************************
 * load preferences
 ******************************************************************************/
PreferenceObserver.prototype.storePreference = function(pref, typ, val) {
    this.preferences[pref]= val;

    switch (typ) {
        case this.prefBranch.PREF_BOOL:
            this.prefBranch.setBoolPref(pref, val);
            break;
        case this.prefBranch.PREF_STRING:
            this.prefBranch.setCharPref(pref, val);
            break;
        case this.prefBranch.PREF_INT:
            this.prefBranch.setIntPref(pref, val);
            break;
    }
}



/** ****************************************************************************
 * unregister observer
 ******************************************************************************/
PreferenceObserver.prototype.unregister = function() {
    if(!this.prefBranch) {
        return;
    }

    var pbi = this.prefBranch
        .QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
}
