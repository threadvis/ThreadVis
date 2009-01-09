/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.mozdev.org/
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with ThreadVis. If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *****************************************************************************
 * JavaScript file to react to preference changing events
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Preference observer
 *
 * @return
 *          A new observer object
 ******************************************************************************/
ThreadVisNS.PreferenceObserver = function() {
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
    this.PREF_VIS_COLOURS_BACKGROUND = "visualisation.colours.background";
    this.PREF_VIS_COLOURS_BORDER = "visualisation.colours.border";
    this.PREF_VIS_COLOURS_RECEIVED = "visualisation.colours.received";
    this.PREF_VIS_COLOURS_SENT = "visualisation.colours.sent";
    this.PREF_VIS_HIGHLIGHT = "visualisation.highlight";
    this.PREF_VIS_MINIMAL_WIDTH = "visualisation.minimalwidth";
    this.PREF_VIS_OPACITY = "visualisation.opacity";
    this.PREF_VIS_SVG = "visualisation.svg";
    this.PREF_VIS_ZOOM = "visualisation.zoom";
    this.PREF_VIS_HIDE_ON_DISABLE = "visualisation.hideondisable";
    this.PREF_CACHE_UPDATE_FOLDERS = "cache.updatefolders";
    this.PREF_CACHE_SKIP_INVALID_FOLDERS = "cache.skipinvalidfolders";

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
 * Do callbacks after preference change
 *
 * @param pref
 *          The pref that changed
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.doCallback = function(pref) {
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
 * Get preference value for given preference
 * @param pref
 *          The preference to get
 * @return
 *          The value of the preference
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.getPreference = function(pref) {
    return this.preferences[pref];
}



/** ****************************************************************************
 * Load a preference from the store
 *
 * @param pref
 *          The preference to load
 * @param typ
 *          The type of the preference (boo, string, int)
 * @param def
 *          The default value
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.loadPreference = function(pref, typ,
    def) {
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
 * Observe preferences changes
 *
 * @param subject
 * @param topic
 * @param data
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.observe = function(subject, topic,
    data) {
    if(topic != "nsPref:changed") {
        return;
    }

    // reload preferences
    this.preferenceReload();
    this.doCallback(data);
}



/** ****************************************************************************
 * Reload preferences
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.preferenceReload = function() {
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
    this.loadPreference(this.PREF_VIS_COLOURS_BACKGROUND,
        this.prefBranch.PREF_STRING, "");
    this.loadPreference(this.PREF_VIS_COLOURS_BORDER,
        this.prefBranch.PREF_STRING, "");
    this.loadPreference(this.PREF_VIS_COLOURS_RECEIVED,
        this.prefBranch.PREF_STRING, "#7FFF00,#00FFFF,#7F00FF,#997200,#009926,#002699,#990072,#990000,#4C9900,#009999,#4C0099,#FFBF00,#00FF3F,#003FFF,#FF00BF");
    this.loadPreference(this.PREF_VIS_COLOURS_SENT,
        this.prefBranch.PREF_STRING, "#ff0000");
    this.loadPreference(this.PREF_VIS_HIGHLIGHT,
        this.prefBranch.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_MINIMAL_WIDTH,
        this.prefBranch.PREF_INT, 0);
    this.loadPreference(this.PREF_VIS_OPACITY,
        this.prefBranch.PREF_INT, 30);
    this.loadPreference(this.PREF_VIS_SVG,
        this.prefBranch.PREF_BOOL, false);
    this.loadPreference(this.PREF_VIS_ZOOM,
        this.prefBranch.PREF_STRING, "full");
    this.loadPreference(this.PREF_VIS_HIDE_ON_DISABLE,
        this.prefBranch.PREF_BOOL, true);
    this.loadPreference(this.PREF_CACHE_UPDATE_FOLDERS,
        this.prefBranch.PREF_BOOL, false);
    this.loadPreference(this.PREF_CACHE_SKIP_INVALID_FOLDERS,
        this.prefBranch.PREF_BOOL, false);
}



/** ****************************************************************************
 * Register as preference changing observer
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.register =  function() {
    var pbi = this.prefBranch
        .QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
}



/** ****************************************************************************
 * Register a callback hook
 *
 * @param preference
 *          The preference
 * @param func
 *          The function that has to be called if the preference value changes
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.registerCallback = function(preference,
    func) {
    if (this.callback[preference]) {
        this.callback[preference].push(func);
    } else {
        this.callback[preference] = new Array(func);
    }
}



/** ****************************************************************************
 * Set preference value for given preference
 *
 * @param pref
 *          The name of the preference
 * @param val
 *          The value of the preference
 * @param typ
 *          The type of the preference
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.setPreference = function(pref, val,
    typ) {
    this.preferences[pref] = val;
    this.storePreference(pref, typ, val);
}



/** ****************************************************************************
 * Store a preference to the store
 *
 * @param pref
 *          The name of the preference
 * @param typ
 *          The type of the preference
 * @param val
 *          The value of the preference
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.storePreference = function(pref, typ,
    val) {
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
 * Unregister observer
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.unregister = function() {
    if(!this.prefBranch) {
        return;
    }

    var pbi = this.prefBranch
        .QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
}
