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

var ThreadVis = (function(ThreadVis) {

    /***************************************************************************
     * Preference observer
     * 
     * @return A new observer object
     **************************************************************************/
    ThreadVis.Preferences = {};

    ThreadVis.Preferences.PREF_BRANCH = "extensions.threadvis.";

    ThreadVis.Preferences.PREF_ABOUT = ThreadVis.Preferences.PREF_BRANCH
            + "about";
    ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS = ThreadVis.Preferences.PREF_BRANCH
            + "disabledaccounts";
    ThreadVis.Preferences.PREF_DISABLED_FOLDERS = ThreadVis.Preferences.PREF_BRANCH
            + "disabledfolders";
    ThreadVis.Preferences.PREF_ENABLED = ThreadVis.Preferences.PREF_BRANCH
            + "enabled";
    ThreadVis.Preferences.PREF_SENTMAIL_FOLDERFLAG = ThreadVis.Preferences.PREF_BRANCH
            + "sentmail.folderflag";
    ThreadVis.Preferences.PREF_SENTMAIL_IDENTITY = ThreadVis.Preferences.PREF_BRANCH
            + "sentmail.identity";
    ThreadVis.Preferences.PREF_SVG_HEIGHT = ThreadVis.Preferences.PREF_BRANCH
            + "svg.height";
    ThreadVis.Preferences.PREF_SVG_WIDTH = ThreadVis.Preferences.PREF_BRANCH
            + "svg.width";
    ThreadVis.Preferences.PREF_TIMELINE = ThreadVis.Preferences.PREF_BRANCH
            + "timeline.enabled";
    ThreadVis.Preferences.PREF_TIMESCALING = ThreadVis.Preferences.PREF_BRANCH
            + "timescaling.enabled";
    ThreadVis.Preferences.PREF_VIS_DOTSIZE = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.dotsize";
    ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.arcminheight";
    ThreadVis.Preferences.PREF_VIS_ARC_RADIUS = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.arcradius";
    ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.arcdifference";
    ThreadVis.Preferences.PREF_VIS_ARC_WIDTH = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.arcwidth";
    ThreadVis.Preferences.PREF_VIS_SPACING = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.spacing";
    ThreadVis.Preferences.PREF_VIS_MESSAGE_CIRCLES = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.messagecircles";
    ThreadVis.Preferences.PREF_VIS_COLOUR = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.colour";
    ThreadVis.Preferences.PREF_VIS_COLOURS_BACKGROUND = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.colours.background";
    ThreadVis.Preferences.PREF_VIS_COLOURS_BORDER = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.colours.border";
    ThreadVis.Preferences.PREF_VIS_COLOURS_RECEIVED = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.colours.received";
    ThreadVis.Preferences.PREF_VIS_COLOURS_SENT = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.colours.sent";
    ThreadVis.Preferences.PREF_VIS_HIDE_ON_DISABLE = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.hideondisable";
    ThreadVis.Preferences.PREF_VIS_HIDE_ON_SINGLE = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.hideonsingle";
    ThreadVis.Preferences.PREF_VIS_HIGHLIGHT = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.highlight";
    ThreadVis.Preferences.PREF_VIS_MINIMAL_WIDTH = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.minimalwidth";
    ThreadVis.Preferences.PREF_VIS_OPACITY = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.opacity";
    ThreadVis.Preferences.PREF_VIS_ZOOM = ThreadVis.Preferences.PREF_BRANCH
            + "visualisation.zoom";

    ThreadVis.Preferences.PREF_GLODA_ENABLED = "mailnews.database.global.indexer.enabled";

    ThreadVis.Preferences.prefBranch = null;
    ThreadVis.Preferences.preferences = {};

    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);
    ThreadVis.Preferences.prefBranch = prefService
            .getBranch(ThreadVis.Preferences.PREF_BRANCH);
    ThreadVis.Preferences.glodaPrefBranch = prefService
            .getBranch(ThreadVis.Preferences.PREF_GLODA_ENABLED);

    ThreadVis.Preferences.PREF_BOOL = ThreadVis.Preferences.prefBranch.PREF_BOOL;
    ThreadVis.Preferences.PREF_INT = ThreadVis.Preferences.prefBranch.PREF_INT;
    ThreadVis.Preferences.PREF_STRING = ThreadVis.Preferences.prefBranch.PREF_STRING;

    /***************************************************************************
     * Do callbacks after preference change
     * 
     * @param pref
     *            The pref that changed
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.doCallback = function(pref) {
        var value = ThreadVis.Preferences.getPreference(pref);
        var callbacks = ThreadVis.Preferences.preferences[pref].callbacks;
        for ( var key in callbacks) {
            var func = callbacks[key];
            func(value);
        }
    }

    /***************************************************************************
     * Get preference value for given preference
     * 
     * @param pref
     *            The preference to get
     * @return The value of the preference
     **************************************************************************/
    ThreadVis.Preferences.getPreference = function(pref) {
        return ThreadVis.Preferences.preferences[pref].value;
    }

    /***************************************************************************
     * Load a preference from the store
     * 
     * @param pref
     *            The preference to load
     * @param type
     *            The type of the preference (bool, string, int)
     * @param def
     *            The default value
     * @param prefBranch
     *            The branch to use to read the value
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.loadPreference = function(pref, type, def, prefBranch) {
        if (ThreadVis.Preferences.preferences[pref] == null) {
            ThreadVis.Preferences.preferences[pref] = {};
            ThreadVis.Preferences.preferences[pref].value = def;
            ThreadVis.Preferences.preferences[pref].callbacks = [];
            ThreadVis.Preferences.preferences[pref].type = type;
            if (!prefBranch) {
                prefBranch = ThreadVis.Preferences.prefBranch;
            }
            ThreadVis.Preferences.preferences[pref].branch = prefBranch;
        }

        // remove leading branch from pref name
        var loadPref = pref
                .substring(ThreadVis.Preferences.preferences[pref].branch.root.length);
        if (ThreadVis.Preferences.preferences[pref].branch
                .getPrefType(loadPref) != type) {
            return;
        }

        switch (type) {
            case ThreadVis.Preferences.PREF_BOOL:
                ThreadVis.Preferences.preferences[pref].value = ThreadVis.Preferences.preferences[pref].branch
                        .getBoolPref(loadPref);
                break;
            case ThreadVis.Preferences.PREF_STRING:
                ThreadVis.Preferences.preferences[pref].value = ThreadVis.Preferences.preferences[pref].branch
                        .getCharPref(loadPref);
                break;
            case ThreadVis.Preferences.PREF_INT:
                ThreadVis.Preferences.preferences[pref].value = ThreadVis.Preferences.preferences[pref].branch
                        .getIntPref(loadPref);
                break;
        }
    }

    /***************************************************************************
     * Reload preferences
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.preferenceReload = function() {
        ThreadVis.Preferences.loadPreference(ThreadVis.Preferences.PREF_ABOUT,
                ThreadVis.Preferences.PREF_INT, 0);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_DISABLED_ACCOUNTS,
                ThreadVis.Preferences.PREF_STRING, "");
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_DISABLED_FOLDERS,
                ThreadVis.Preferences.PREF_STRING, "");
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_ENABLED,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_SENTMAIL_FOLDERFLAG,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_SENTMAIL_IDENTITY,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_SVG_HEIGHT,
                ThreadVis.Preferences.PREF_INT, 1000);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_SVG_WIDTH,
                ThreadVis.Preferences.PREF_INT, 1000);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_TIMELINE,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_TIMESCALING,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_DOTSIZE,
                ThreadVis.Preferences.PREF_INT, 12);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT,
                ThreadVis.Preferences.PREF_INT, 12);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_ARC_RADIUS,
                ThreadVis.Preferences.PREF_INT, 32);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE,
                ThreadVis.Preferences.PREF_INT, 6);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_ARC_WIDTH,
                ThreadVis.Preferences.PREF_INT, 2);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_SPACING,
                ThreadVis.Preferences.PREF_INT, 24);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_MESSAGE_CIRCLES,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_COLOUR,
                ThreadVis.Preferences.PREF_STRING, "author");
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_COLOURS_BACKGROUND,
                ThreadVis.Preferences.PREF_STRING, "");
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_COLOURS_BORDER,
                ThreadVis.Preferences.PREF_STRING, "");
        ThreadVis.Preferences
                .loadPreference(
                        ThreadVis.Preferences.PREF_VIS_COLOURS_RECEIVED,
                        ThreadVis.Preferences.PREF_STRING,
                        "#7FFF00,#00FFFF,#7F00FF,#997200,#009926,#002699,#990072,#990000,#4C9900,#009999,#4C0099,#FFBF00,#00FF3F,#003FFF,#FF00BF");
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_COLOURS_SENT,
                ThreadVis.Preferences.PREF_STRING, "#ff0000");
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_HIDE_ON_DISABLE,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_HIDE_ON_SINGLE,
                ThreadVis.Preferences.PREF_BOOL, false);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_HIGHLIGHT,
                ThreadVis.Preferences.PREF_BOOL, true);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_MINIMAL_WIDTH,
                ThreadVis.Preferences.PREF_INT, 0);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_OPACITY,
                ThreadVis.Preferences.PREF_INT, 30);
        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_VIS_ZOOM,
                ThreadVis.Preferences.PREF_STRING, "full");

        ThreadVis.Preferences.loadPreference(
                ThreadVis.Preferences.PREF_GLODA_ENABLED,
                ThreadVis.Preferences.PREF_BOOL, true,
                ThreadVis.Preferences.glodaPrefBranch);

    }

    /***************************************************************************
     * Register as preference changing observer
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.register = function() {
        // add observer for our own branch
        var pbi = ThreadVis.Preferences.prefBranch
                .QueryInterface(Components.interfaces.nsIPrefBranch2);
        pbi.addObserver("", {
            observe : function(subject, topic, data) {
                if (topic != "nsPref:changed") {
                    return;
                }
                // reload preferences
                ThreadVis.Preferences.preferenceReload();
                ThreadVis.Preferences
                        .doCallback(ThreadVis.Preferences.PREF_BRANCH + data);
            }
        }, false);

        // add observer for gloda
        var glodaObserver = ThreadVis.Preferences.glodaPrefBranch
                .QueryInterface(Components.interfaces.nsIPrefBranch2);
        glodaObserver.addObserver("", {
            observe : function(subject, topic, data) {
                if (topic != "nsPref:changed") {
                    return;
                }
                // reload preferences
                ThreadVis.Preferences.preferenceReload();
                ThreadVis.Preferences.doCallback(data);
            }
        }, false);
    }

    /***************************************************************************
     * Register a callback hook
     * 
     * @param preference
     *            The preference
     * @param func
     *            The function that has to be called if the preference value
     *            changes
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.registerCallback = function(preference, func) {
        ThreadVis.Preferences.preferences[preference].callbacks.push(func);
    }

    /***************************************************************************
     * Set preference value for given preference
     * 
     * @param pref
     *            The name of the preference
     * @param val
     *            The value of the preference
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.setPreference = function(pref, val) {
        ThreadVis.Preferences.preferences[pref].value = val;
        ThreadVis.Preferences.storePreference(pref, val);
    }

    /***************************************************************************
     * Store a preference to the store
     * 
     * @param pref
     *            The name of the preference
     * @param val
     *            The value of the preference
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.storePreference = function(pref, val) {
        var branch = ThreadVis.Preferences.preferences[pref].branch;
        var type = ThreadVis.Preferences.preferences[pref].type;
        // remove leading branch from pref name
        pref = pref.substring(branch.root.length);

        switch (type) {
            case ThreadVis.Preferences.PREF_BOOL:
                branch.setBoolPref(pref, val);
                break;
            case ThreadVis.Preferences.PREF_STRING:
                branch.setCharPref(pref, val);
                break;
            case ThreadVis.Preferences.PREF_INT:
                branch.setIntPref(pref, val);
                break;
        }
    }

    /***************************************************************************
     * Unregister observer
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Preferences.unregister = function() {
        if (!ThreadVis.Preferences.prefBranch) {
            return;
        }

        var pbi = ThreadVis.Preferences.prefBranch
                .QueryInterface(Components.interfaces.nsIPrefBranch2);
        pbi.removeObserver("", ThreadVis.Preferences);
    }

    ThreadVis.Preferences.register();
    ThreadVis.Preferences.preferenceReload();

    return ThreadVis;
}(ThreadVis || {}));
