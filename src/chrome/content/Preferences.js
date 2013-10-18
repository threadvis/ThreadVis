/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011,
 *               2013 Alexander C. Hubmann-Haidvogel
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

    /**
     * Preference observer
     */
    ThreadVis.Preferences = {
        _PREF_BRANCH : "extensions.threadvis.",

        PREF_ABOUT :
            "extensions.threadvis.about",
        PREF_DISABLED_ACCOUNTS :
            "extensions.threadvis.disabledaccounts",
        PREF_DISABLED_FOLDERS :
            "extensions.threadvis.disabledfolders",
        PREF_ENABLED :
            "extensions.threadvis.enabled",
        PREF_SENTMAIL_FOLDERFLAG :
            "extensions.threadvis.sentmail.folderflag",
        PREF_SENTMAIL_IDENTITY :
            "extensions.threadvis.sentmail.identity",
        PREF_SVG_HEIGHT :
            "extensions.threadvis.svg.height",
        PREF_SVG_WIDTH :
            "extensions.threadvis.svg.width",
        PREF_TIMELINE :
            "extensions.threadvis.timeline.enabled",
        PREF_TIMELINE_FONTSIZE :
            "extensions.threadvis.timeline.fontsize",
        PREF_TIMESCALING :
            "extensions.threadvis.timescaling.enabled",
        PREF_TIMESCALING_METHOD :
            "extensions.threadvis.timescaling.method",
        PREF_TIMESCALING_MINTIMEDIFF :
            "extensions.threadvis.timescaling.mintimediff",
        PREF_VIS_DOTSIZE :
            "extensions.threadvis.visualisation.dotsize",
        PREF_VIS_ARC_MINHEIGHT :
            "extensions.threadvis.visualisation.arcminheight",
        PREF_VIS_ARC_RADIUS :
            "extensions.threadvis.visualisation.arcradius",
        PREF_VIS_ARC_DIFFERENCE :
            "extensions.threadvis.visualisation.arcdifference",
        PREF_VIS_ARC_WIDTH :
            "extensions.threadvis.visualisation.arcwidth",
        PREF_VIS_SPACING :
            "extensions.threadvis.visualisation.spacing",
        PREF_VIS_MESSAGE_CIRCLES :
            "extensions.threadvis.visualisation.messagecircles",
        PREF_VIS_COLOUR :
            "extensions.threadvis.visualisation.colour",
        PREF_VIS_COLOURS_BACKGROUND :
            "extensions.threadvis.visualisation.colours.background",
        PREF_VIS_COLOURS_BORDER :
            "extensions.threadvis.visualisation.colours.border",
        PREF_VIS_COLOURS_RECEIVED :
            "extensions.threadvis.visualisation.colours.received",
        PREF_VIS_COLOURS_SENT :
            "extensions.threadvis.visualisation.colours.sent",
        PREF_VIS_HIDE_ON_DISABLE :
            "extensions.threadvis.visualisation.hideondisable",
        PREF_VIS_HIDE_ON_SINGLE :
            "extensions.threadvis.visualisation.hideonsingle",
        PREF_VIS_HIGHLIGHT :
            "extensions.threadvis.visualisation.highlight",
        PREF_VIS_MINIMAL_WIDTH :
            "extensions.threadvis.visualisation.minimalwidth",
        PREF_VIS_OPACITY :
            "extensions.threadvis.visualisation.opacity",
        PREF_VIS_ZOOM :
            "extensions.threadvis.visualisation.zoom",
        PREF_GLODA_ENABLED :
            "mailnews.database.global.indexer.enabled",

        _preferences : {},
        _prefBranch : Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService).getBranch(
                        "extensions.threadvis."),
        _glodaPrefBranch : Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService).getBranch(
                        "mailnews.database.global.indexer.enabled"),

        PREF_BOOL : Components.interfaces.nsIPrefBranch.PREF_BOOL,
        PREF_INT : Components.interfaces.nsIPrefBranch.PREF_INT,
        PREF_STRING : Components.interfaces.nsIPrefBranch.PREF_STRING,

        /**
         * Do callbacks after preference change
         * 
         * @param {String}
         *            pref The pref that changed
         */
        _doCallback : function(pref) {
            var value = this._preferences[pref].value;
            var callbacks = this._preferences[pref].callbacks;
            for (var key in callbacks) {
                var func = callbacks[key];
                func(value);
            }
        },

        /**
         * Get preference value for given preference
         * 
         * @param {String}
         *            pref The preference to get
         * @return {String} The value of the preference
         * @type String
         */
        getPreference : function(pref) {
            return this._preferences[pref].value;
        },

        /**
         * Load a preference from the store
         * 
         * @param {String}
         *            pref The preference to load
         * @param {PrefType}
         *            type The type of the preference (bool, string, int)
         * @param {String}
         *            def The default value
         * @param {nsIPrefBranch}
         *            prefBranch The branch to use to read the value
         */
        _loadPreference : function(pref, type, def, prefBranch) {
            if (this._preferences[pref] == null) {
                this._preferences[pref] = {
                    value : def,
                    callbacks : [],
                    type : type,
                    branch : prefBranch
                };
            }

            // remove leading branch from pref name
            var loadPref = pref
                    .substring(this._preferences[pref].branch.root.length);

            // check if we are loading right pref type
            if (this._preferences[pref].branch.getPrefType(loadPref) != type) {
                return;
            }

            switch (type) {
                case this.PREF_BOOL:
                    this._preferences[pref].value = this._preferences[pref].branch
                            .getBoolPref(loadPref);
                    break;
                case this.PREF_STRING:
                    this._preferences[pref].value = this._preferences[pref].branch
                            .getCharPref(loadPref);
                    break;
                case this.PREF_INT:
                    this._preferences[pref].value = this._preferences[pref].branch
                            .getIntPref(loadPref);
                    break;
            }
        },

        /**
         * Reload preferences
         */
        _preferenceReload : function() {
            this._loadPreference(this.PREF_ABOUT,
                    this.PREF_INT, 0, this._prefBranch);
            this._loadPreference(this.PREF_DISABLED_ACCOUNTS,
                    this.PREF_STRING, "", this._prefBranch);
            this._loadPreference(this.PREF_DISABLED_FOLDERS,
                    this.PREF_STRING, "", this._prefBranch);
            this._loadPreference(this.PREF_ENABLED,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_SENTMAIL_FOLDERFLAG,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_SENTMAIL_IDENTITY,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_SVG_HEIGHT,
                    this.PREF_INT, 1000, this._prefBranch);
            this._loadPreference(this.PREF_SVG_WIDTH,
                    this.PREF_INT, 1000, this._prefBranch);
            this._loadPreference(this.PREF_TIMELINE,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_TIMELINE_FONTSIZE,
                    this.PREF_INT, 9, this._prefBranch);
            this._loadPreference(this.PREF_TIMESCALING,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_TIMESCALING_METHOD,
                    this.PREF_STRING, "linear", this._prefBranch);
            this._loadPreference(this.PREF_TIMESCALING_MINTIMEDIFF,
                    this.PREF_INT, 0, this._prefBranch);
            this._loadPreference(this.PREF_VIS_DOTSIZE,
                    this.PREF_INT, 12, this._prefBranch);
            this._loadPreference(this.PREF_VIS_ARC_MINHEIGHT,
                    this.PREF_INT, 12, this._prefBranch);
            this._loadPreference(this.PREF_VIS_ARC_RADIUS,
                    this.PREF_INT, 32, this._prefBranch);
            this._loadPreference(this.PREF_VIS_ARC_DIFFERENCE,
                    this.PREF_INT, 6, this._prefBranch);
            this._loadPreference(this.PREF_VIS_ARC_WIDTH,
                    this.PREF_INT, 2, this._prefBranch);
            this._loadPreference(this.PREF_VIS_SPACING,
                    this.PREF_INT, 24, this._prefBranch);
            this._loadPreference(this.PREF_VIS_MESSAGE_CIRCLES,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_VIS_COLOUR,
                    this.PREF_STRING, "author", this._prefBranch);
            this._loadPreference(this.PREF_VIS_COLOURS_BACKGROUND,
                    this.PREF_STRING, "", this._prefBranch);
            this._loadPreference(this.PREF_VIS_COLOURS_BORDER,
                    this.PREF_STRING, "", this._prefBranch);
            this._loadPreference(this.PREF_VIS_COLOURS_RECEIVED,
                    this.PREF_STRING,
                    "#7FFF00,#00FFFF,#7F00FF,#997200,#009926,#002699,#990072,#990000,#4C9900,#009999,#4C0099,#FFBF00,#00FF3F,#003FFF,#FF00BF",
                    this._prefBranch);
            this._loadPreference(this.PREF_VIS_COLOURS_SENT,
                    this.PREF_STRING, "#ff0000", this._prefBranch);
            this._loadPreference(this.PREF_VIS_HIDE_ON_DISABLE,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_VIS_HIDE_ON_SINGLE,
                    this.PREF_BOOL, false, this._prefBranch);
            this._loadPreference(this.PREF_VIS_HIGHLIGHT,
                    this.PREF_BOOL, true, this._prefBranch);
            this._loadPreference(this.PREF_VIS_MINIMAL_WIDTH,
                    this.PREF_INT, 0, this._prefBranch);
            this._loadPreference(this.PREF_VIS_OPACITY,
                    this.PREF_INT, 30, this._prefBranch);
            this._loadPreference(this.PREF_VIS_ZOOM,
                    this.PREF_STRING, "full", this._prefBranch);

            this._loadPreference(this.PREF_GLODA_ENABLED,
                    this.PREF_BOOL, true, this._glodaPrefBranch);
        },

        /**
         * Register as preference changing observer
         */
        _register : function() {
            var ref = this;
            // add observer for our own branch
            var pbi = this._prefBranch
                    .QueryInterface(Components.interfaces.nsIPrefBranch2);
            pbi.addObserver("", {
                observe : function(subject, topic, data) {
                    if (topic != "nsPref:changed") {
                        return;
                    }
                    // reload preferences
                    ref._preferenceReload();
                    ref._doCallback(ref._PREF_BRANCH + data);
                }
            }, false);

            // add observer for gloda
            var glodaObserver = this._glodaPrefBranch
                    .QueryInterface(Components.interfaces.nsIPrefBranch2);
            glodaObserver.addObserver("", {
                observe : function(subject, topic, data) {
                    if (topic != "nsPref:changed") {
                        return;
                    }
                    // reload preferences
                    ref._preferenceReload();
                    ref._doCallback(this.PREF_GLODA_ENABLED);
                }
            }, false);
        },

        /**
         * Register a callback hook
         * 
         * @param {String}
         *            preference The preference
         * @param {Function}
         *            func The function that has to be called if the preference
         *            value changes
         */
        registerCallback : function(preference, func) {
            this._preferences[preference].callbacks.push(func);
        },

        /**
         * Set preference value for given preference
         * 
         * @param {String}
         *            pref The name of the preference
         * @param {String}
         *            val The value of the preference
         */
        setPreference : function(pref, val) {
            this._preferences[pref].value = val;
            this._storePreference(pref, val);
        },

        /**
         * Store a preference to the store
         * 
         * @param {String}
         *            pref The name of the preference
         * @param {String}
         *            val The value of the preference
         */
        _storePreference : function(pref, val) {
            var branch = this._preferences[pref].branch;
            var type = this._preferences[pref].type;
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
        },

        /**
         * Unregister observer
         */
        _unregister : function() {
            if (!this._prefBranch) {
                return;
            }

            var pbi = this._prefBranch
                    .QueryInterface(Components.interfaces.nsIPrefBranch2);
            pbi.removeObserver("", this);
        }
    };

    ThreadVis.Preferences._register();
    ThreadVis.Preferences._preferenceReload();

    return ThreadVis;
}(ThreadVis || {}));
