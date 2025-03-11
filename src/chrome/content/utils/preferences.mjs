/* *********************************************************************************************************************
 * This file is part of ThreadVis.
 * https://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis titled
 * "ThreadVis for Thunderbird: A Thread Visualisation Extension for the Mozilla Thunderbird Email Client"
 * at Graz University of Technology, Austria. An electronic version of the thesis is available online at
 * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009,
 *               2010, 2011, 2013, 2018, 2019,
 *               2020, 2021, 2022, 2023, 2024, 2025 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with ThreadVis.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *********************************************************************************************************************
 * JavaScript file to react to preference changing events
 **********************************************************************************************************************/

// shared key strings for our preferences
import { PreferenceKeys, PreferenceBranch } from "./preferenceskeys.mjs";

const PREF_BOOL = Services.prefs.PREF_BOOL;
const PREF_INT = Services.prefs.PREF_INT;
const PREF_STRING = Services.prefs.PREF_STRING;

class PreferencesClass {

    /**
     * Internal preferences object
     */
    #preferences = {};

    /**
     * Branch of threadvis preferences
     */
    #threadVisPrefBranch = Services.prefs.getBranch(PreferenceBranch);
    
    /**
     * Branch for gloda preference
     */
    #glodaPrefBranch = Services.prefs.getBranch("mailnews.database.global.indexer.enabled");
    
    /**
     * Constructor
     */
    constructor() {
    }

    /**
     * Do callbacks after preference change
     * 
     * @param {String} pref - The pref that changed
     */
    #doCallback(pref) {
        const value = this.#preferences[pref].value;
        const callbacks = this.#preferences[pref].callbacks;
        for (let key in callbacks) {
            callbacks[key](value);
        }
    }

    /**
     * Get preference value for given preference
     * 
     * @param {String} pref - The preference to get
     * @return {String} - The value of the preference
     */
    get(pref) {
        return this.#preferences[pref].value;
    }

    /**
     * Load a preference from the store
     * 
     * @param {String} pref - The preference to load
     * @param {PrefType} type - The type of the preference (bool, string, int)
     * @param {String} def - The default value
     * @param {nsIPrefBranch} prefBranch - The branch to use to read the value
     */
    #load(pref, type, def, prefBranch) {
        if (! prefBranch) {
            prefBranch = this.#threadVisPrefBranch;
        }
        if (!this.#preferences[pref]) {
            this.#preferences[pref] = {
                value: def,
                callbacks: [],
                type: type,
                branch: prefBranch
            };
        }

        // remove leading branch from pref name
        const loadPref = pref.substring(this.#preferences[pref].branch.root.length);

        // check if we are loading right pref type
        if (this.#preferences[pref].branch.getPrefType(loadPref) !== type) {
            return;
        }

        switch (type) {
            case PREF_BOOL:
                this.#preferences[pref].value = this.#preferences[pref].branch.getBoolPref(loadPref);
                break;
            case PREF_STRING:
                this.#preferences[pref].value = this.#preferences[pref].branch.getCharPref(loadPref);
                break;
            case PREF_INT:
                this.#preferences[pref].value = this.#preferences[pref].branch.getIntPref(loadPref);
                break;
        }
    }

    /**
     * Reload preferences
     */
    reload() {
        this.#load(PreferenceKeys.DISABLED_ACCOUNTS, PREF_STRING, "");
        this.#load(PreferenceKeys.DISABLED_FOLDERS, PREF_STRING, "");
        this.#load(PreferenceKeys.SENTMAIL_FOLDERFLAG, PREF_BOOL, true);
        this.#load(PreferenceKeys.SENTMAIL_IDENTITY, PREF_BOOL, true);
        this.#load(PreferenceKeys.SVG_HEIGHT, PREF_INT, 1000);
        this.#load(PreferenceKeys.SVG_WIDTH, PREF_INT, 1000);
        this.#load(PreferenceKeys.STATUSBAR, PREF_BOOL, true);
        this.#load(PreferenceKeys.TIMELINE, PREF_BOOL, true);
        this.#load(PreferenceKeys.TIMELINE_FONTSIZE, PREF_INT, 9);
        this.#load(PreferenceKeys.TIMESCALING, PREF_BOOL, true,);
        this.#load(PreferenceKeys.TIMESCALING_METHOD, PREF_STRING, "linear");
        this.#load(PreferenceKeys.TIMESCALING_MINTIMEDIFF, PREF_INT, 0);
        this.#load(PreferenceKeys.VIS_DOTSIZE, PREF_INT, 12);
        this.#load(PreferenceKeys.VIS_ARC_MINHEIGHT, PREF_INT, 12);
        this.#load(PreferenceKeys.VIS_ARC_RADIUS, PREF_INT, 32);
        this.#load(PreferenceKeys.VIS_ARC_DIFFERENCE, PREF_INT, 6);
        this.#load(PreferenceKeys.VIS_ARC_WIDTH, PREF_INT, 2);
        this.#load(PreferenceKeys.VIS_SPACING, PREF_INT, 24);
        this.#load(PreferenceKeys.VIS_MESSAGE_CIRCLES, PREF_BOOL, true);
        this.#load(PreferenceKeys.VIS_COLOUR, PREF_STRING, "author");
        this.#load(PreferenceKeys.VIS_COLOURS_BACKGROUND, PREF_STRING, "");
        this.#load(PreferenceKeys.VIS_COLOURS_BORDER, PREF_STRING, "");
        this.#load(PreferenceKeys.VIS_COLOURS_RECEIVED, PREF_STRING,
            "#7FFF00,#00FFFF,#7F00FF,#997200,#009926,#002699,#990072,#990000,#4C9900,#009999,#4C0099,#FFBF00,#00FF3F,#003FFF,#FF00BF");
        this.#load(PreferenceKeys.VIS_COLOURS_SENT, PREF_STRING, "#ff0000");
        this.#load(PreferenceKeys.VIS_COLOURS_CURRENT, PREF_STRING, "#000000");
        this.#load(PreferenceKeys.VIS_HIDE_ON_SINGLE, PREF_BOOL, false);
        this.#load(PreferenceKeys.VIS_HIGHLIGHT, PREF_BOOL, true);
        this.#load(PreferenceKeys.VIS_MINIMAL_WIDTH, PREF_INT, 0);
        this.#load(PreferenceKeys.VIS_OPACITY, PREF_INT, 30);
        this.#load(PreferenceKeys.VIS_ZOOM, PREF_STRING, "full");

        this.#load(PreferenceKeys.GLODA_ENABLED, PREF_BOOL, true, this.#glodaPrefBranch);
    }

    /**
     * Register as preference changing observer
     */
    register() {
        // add observer for our own branch
        this.#threadVisPrefBranch.addObserver("", this, false);

        // add observer for gloda
        this.#glodaPrefBranch.addObserver("", this, false);
    }

    /**
     * Observe a pref change
     * @param {String} subject
     * @param {String} topic
     * @param {*} data
     */
    observe(subject, topic, data) {
        if (topic !== "nsPref:changed") {
            return;
        }
        // reload preferences
        this.reload();
        if (subject.root === "mailnews.database.global.indexer.enabled") {
            this.#doCallback("mailnews.database.global.indexer.enabled");
        } else {
            this.#doCallback(PreferenceBranch + data);
        }
    }

    /**
     * Register a callback hook
     * 
     * @param {String} preference - The preference
     * @param {Function} func - The function that has to be called if the preference value changes
     */
    callback(preference, func) {
        this.#preferences[preference].callbacks.push(func);
    }

    /**
     * Set preference value for given preference
     * 
     * @param {String} pref - The name of the preference
     * @param {String} val - The value of the preference
     */
    set(pref, val) {
        this.#preferences[pref].value = val;
        this.#storePreference(pref, val);
    }

    /**
     * Store a preference to the store
     * 
     * @param {String} pref - The name of the preference
     * @param {String} val - The value of the preference
     */
    #storePreference(pref, val) {
        const branch = this.#preferences[pref].branch;
        const type = this.#preferences[pref].type;
        // remove leading branch from pref name
        pref = pref.substring(branch.root.length);

        switch (type) {
            case PREF_BOOL:
                branch.setBoolPref(pref, val);
                break;
            case PREF_STRING:
                branch.setCharPref(pref, val);
                break;
            case PREF_INT:
                branch.setIntPref(pref, val);
                break;
        }
    }

    /**
     * Unregister observer
     */
    unregister() {
        this.#threadVisPrefBranch.removeObserver("", this);
        this.#glodaPrefBranch.removeObserver("", this);
    }
}

export const Preferences = Object.assign(new PreferencesClass(), PreferenceKeys);
Object.seal(Preferences);
