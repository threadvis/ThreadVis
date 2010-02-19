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
 * Copyright (C) 2007, 2008, 2009, 2010 Alexander C. Hubmann-Haidvogel
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

    this.PREF_ABOUT = this.PREF_BRANCH + "about";
    this.PREF_DISABLED_ACCOUNTS = this.PREF_BRANCH + "disabledaccounts";
    this.PREF_DISABLED_FOLDERS = this.PREF_BRANCH + "disabledfolders";
    this.PREF_ENABLED = this.PREF_BRANCH + "enabled";
    this.PREF_SENTMAIL_FOLDERFLAG = this.PREF_BRANCH + "sentmail.folderflag";
    this.PREF_SENTMAIL_IDENTITY = this.PREF_BRANCH + "sentmail.identity";
    this.PREF_SVG_HEIGHT = this.PREF_BRANCH + "svg.height";
    this.PREF_SVG_WIDTH = this.PREF_BRANCH + "svg.width";
    this.PREF_TIMELINE = this.PREF_BRANCH + "timeline.enabled";
    this.PREF_TIMESCALING = this.PREF_BRANCH + "timescaling.enabled";
    this.PREF_VIS_DOTSIZE = this.PREF_BRANCH + "visualisation.dotsize";
    this.PREF_VIS_ARC_MINHEIGHT = this.PREF_BRANCH + "visualisation.arcminheight";
    this.PREF_VIS_ARC_RADIUS = this.PREF_BRANCH + "visualisation.arcradius";
    this.PREF_VIS_ARC_DIFFERENCE = this.PREF_BRANCH + "visualisation.arcdifference";
    this.PREF_VIS_ARC_WIDTH = this.PREF_BRANCH + "visualisation.arcwidth";
    this.PREF_VIS_SPACING = this.PREF_BRANCH + "visualisation.spacing";
    this.PREF_VIS_MESSAGE_CIRCLES = this.PREF_BRANCH + "visualisation.messagecircles";
    this.PREF_VIS_COLOUR = this.PREF_BRANCH + "visualisation.colour";
    this.PREF_VIS_COLOURS_BACKGROUND = this.PREF_BRANCH + "visualisation.colours.background";
    this.PREF_VIS_COLOURS_BORDER = this.PREF_BRANCH + "visualisation.colours.border";
    this.PREF_VIS_COLOURS_RECEIVED = this.PREF_BRANCH + "visualisation.colours.received";
    this.PREF_VIS_COLOURS_SENT = this.PREF_BRANCH + "visualisation.colours.sent";
    this.PREF_VIS_HIDE_ON_DISABLE = this.PREF_BRANCH + "visualisation.hideondisable";
    this.PREF_VIS_HIDE_ON_SINGLE = this.PREF_BRANCH + "visualisation.hideonsingle"
    this.PREF_VIS_HIGHLIGHT = this.PREF_BRANCH + "visualisation.highlight";
    this.PREF_VIS_MINIMAL_WIDTH = this.PREF_BRANCH + "visualisation.minimalwidth";
    this.PREF_VIS_OPACITY = this.PREF_BRANCH + "visualisation.opacity";
    this.PREF_VIS_ZOOM = this.PREF_BRANCH + "visualisation.zoom";

    this.PREF_GLODA_ENABLED = "mailnews.database.global.indexer.enabled";

    this.prefBranch = null;
    this.preferences = new Object();

    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
    this.prefBranch = prefService.getBranch(this.PREF_BRANCH);
    this.glodaPrefBranch = prefService.getBranch(this.PREF_GLODA_ENABLED);

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
    var value = this.preferences[pref].value;
    var callbacks = this.preferences[pref].callbacks;
    for (var key in callbacks) {
        var func = callbacks[key];
        func(value);
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
    return this.preferences[pref].value;
}



/** ****************************************************************************
 * Load a preference from the store
 *
 * @param pref
 *          The preference to load
 * @param type
 *          The type of the preference (bool, string, int)
 * @param def
 *          The default value
 * @param prefBranch
 *          The branch to use to read the value
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.loadPreference = function(pref, type,
    def, prefBranch) {
    this.preferences[pref] = {};
    this.preferences[pref].value = def;
    this.preferences[pref].callbacks = [];
    this.preferences[pref].type = type;

    if (! prefBranch) {
        prefBranch = this.prefBranch;
    }
    this.preferences[pref].branch = prefBranch;

    // remove leading branch from pref name
    var loadPref = pref.substring(prefBranch.root.length);

    if (prefBranch.getPrefType(loadPref) != type) {
        return;
    }

    switch (type) {
        case this.PREF_BOOL:
            this.preferences[pref].value = prefBranch.getBoolPref(loadPref);
            break;
        case this.PREF_STRING:
            this.preferences[pref].value = prefBranch.getCharPref(loadPref);
            break;
        case this.PREF_INT:
            this.preferences[pref].value = prefBranch.getIntPref(loadPref);
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
        this.PREF_INT, 0);
    this.loadPreference(this.PREF_DISABLED_ACCOUNTS,
        this.PREF_STRING, "");
    this.loadPreference(this.PREF_DISABLED_FOLDERS,
        this.PREF_STRING, "");
    this.loadPreference(this.PREF_ENABLED,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_SENTMAIL_FOLDERFLAG,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_SENTMAIL_IDENTITY,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_SVG_HEIGHT,
        this.PREF_INT, 1000);
    this.loadPreference(this.PREF_SVG_WIDTH,
        this.PREF_INT, 1000);
    this.loadPreference(this.PREF_TIMELINE,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_TIMESCALING,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_DOTSIZE,
        this.PREF_INT, 12);
    this.loadPreference(this.PREF_VIS_ARC_MINHEIGHT,
        this.PREF_INT, 12);
    this.loadPreference(this.PREF_VIS_ARC_RADIUS,
        this.PREF_INT, 32);
    this.loadPreference(this.PREF_VIS_ARC_DIFFERENCE,
        this.PREF_INT, 6);
    this.loadPreference(this.PREF_VIS_ARC_WIDTH,
        this.PREF_INT, 2);
    this.loadPreference(this.PREF_VIS_SPACING,
        this.PREF_INT, 24);
    this.loadPreference(this.PREF_VIS_MESSAGE_CIRCLES,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_COLOUR,
        this.PREF_STRING, "author");
    this.loadPreference(this.PREF_VIS_COLOURS_BACKGROUND,
        this.PREF_STRING, "");
    this.loadPreference(this.PREF_VIS_COLOURS_BORDER,
        this.PREF_STRING, "");
    this.loadPreference(this.PREF_VIS_COLOURS_RECEIVED,
        this.PREF_STRING, "#7FFF00,#00FFFF,#7F00FF,#997200,#009926,#002699,#990072,#990000,#4C9900,#009999,#4C0099,#FFBF00,#00FF3F,#003FFF,#FF00BF");
    this.loadPreference(this.PREF_VIS_COLOURS_SENT,
        this.PREF_STRING, "#ff0000");
    this.loadPreference(this.PREF_VIS_HIDE_ON_DISABLE,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_HIDE_ON_SINGLE,
        this.PREF_BOOL, false);
    this.loadPreference(this.PREF_VIS_HIGHLIGHT,
        this.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_MINIMAL_WIDTH,
        this.PREF_INT, 0);
    this.loadPreference(this.PREF_VIS_OPACITY,
        this.PREF_INT, 30);
    this.loadPreference(this.PREF_VIS_ZOOM,
        this.PREF_STRING, "full");

    this.loadPreference(this.PREF_GLODA_ENABLED,
            this.PREF_BOOL, true, this.glodaPrefBranch);

}



/** ****************************************************************************
 * Register as preference changing observer
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.register =  function() {
    // add observer for our own branch
    var pbi = this.prefBranch
        .QueryInterface(Components.interfaces.nsIPrefBranch2);
    pbi.addObserver("", this, false);

    // add observer for gloda
    var glodaObserver = this.glodaPrefBranch
        .QueryInterface(Components.interfaces.nsIPrefBranch2);
    glodaObserver.addObserver("", this, false);
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
    this.preferences[preference].callbacks.push(func);
}



/** ****************************************************************************
 * Set preference value for given preference
 *
 * @param pref
 *          The name of the preference
 * @param val
 *          The value of the preference
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.setPreference = function(pref, val) {
    this.preferences[pref].value = val;
    this.storePreference(pref, val);
}



/** ****************************************************************************
 * Store a preference to the store
 *
 * @param pref
 *          The name of the preference
 * @param val
 *          The value of the preference
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.PreferenceObserver.prototype.storePreference = function(pref, val) {
    var branch = this.preferences[pref].branch;
    var type = this.preferences[pref].type;
    // remove leading branch from pref name
    pref = pref.substring(branch.root.length);

    switch (type) {
        case this.PREF_BOOL:
            branch.setBoolPref(pref, val);
            break;
        case this.PREF_STRING:
            branch.setCharPref(pref, val);
            break;
        case this.PREF_INT:
            branch.setIntPref(pref, val);
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
        .QueryInterface(Components.interfaces.nsIPrefBranch2);
    pbi.removeObserver("", this);
}
