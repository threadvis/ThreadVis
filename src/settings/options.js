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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023 Alexander C. Hubmann-Haidvogel
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
 * JavaScript file for settings dialog
 **********************************************************************************************************************/

import { PreferenceKeys } from "../chrome/content/utils/preferenceskeys.mjs";

const getPref = async (pref) => 
    (await messenger.runtime.getBackgroundPage()).messenger.LegacyPref.get(pref);

const setPref = async (pref, value) => 
    (await messenger.runtime.getBackgroundPage()).messenger.LegacyPref.set(pref, value);

const getAccounts = async () =>
    (await messenger.runtime.getBackgroundPage()).messenger.LegacyAccountsFolders.getAccounts();

const querySelector = (name, value) => `[name="${name}"]` + (value ? `[value="${value}"]` : "");

const init = async () => {
    [
        { key: PreferenceKeys.TIMESCALING, type: "bool"},
        { key: PreferenceKeys.TIMESCALING_METHOD, type: "string"},
        { key: PreferenceKeys.VIS_MESSAGE_CIRCLES, type: "bool"},
        { key: PreferenceKeys.TIMESCALING_MINTIMEDIFF, type: "string"},
        { key: PreferenceKeys.TIMELINE, type: "bool"},
        { key: PreferenceKeys.VIS_DOTSIZE, type: "integer"},
        { key: PreferenceKeys.VIS_ARC_MINHEIGHT, type: "integer"},
        { key: PreferenceKeys.VIS_ARC_RADIUS, type: "integer"},
        { key: PreferenceKeys.VIS_ARC_DIFFERENCE, type: "integer"},
        { key: PreferenceKeys.VIS_ARC_WIDTH, type: "integer"},
        { key: PreferenceKeys.VIS_SPACING, type: "integer"},
        { key: PreferenceKeys.TIMELINE_FONTSIZE, type: "integer"},
        { key: PreferenceKeys.VIS_ZOOM, type: "string"},
        { key: PreferenceKeys.VIS_HIGHLIGHT, type: "bool"},
        { key: PreferenceKeys.VIS_OPACITY, type: "string"},
        { key: PreferenceKeys.VIS_COLOUR, type: "string"},
        { key: PreferenceKeys.VIS_COLOURS_SENT, type: "string"},
        { key: PreferenceKeys.VIS_COLOURS_RECEIVED, type: "string"},
        { key: PreferenceKeys.VIS_COLOURS_CURRENT, type: "string"},
        { key: PreferenceKeys.SENTMAIL_FOLDERFLAG, type: "bool"},
        { key: PreferenceKeys.SENTMAIL_IDENTITY, type: "bool"},
        { key: PreferenceKeys.STATUSBAR, type: "bool"},
        { key: PreferenceKeys.DISABLED_ACCOUNTS, type: "string"},
        { key: PreferenceKeys.DISABLED_FOLDERS, type: "string"}
    ].forEach((pref) => {
        getPref(pref.key).then((value) => {
            const elems = document.querySelectorAll(querySelector(pref.key));
            if (elems.length === 1) {
                const elem = elems[0];
                if (pref.type === "bool") {
                    elem.checked = value;
                } else {
                    elem.value = value;
                }
                elem.addEventListener("change", function() {
                    if (pref.type === "bool") {
                        setPref(pref.key, this.checked);
                    } else {
                        setPref(pref.key, this.value);
                    }
                });
            } else if (elems.length > 1) {
                // note: special handling for prefs which map to multiple elements, assume each elem is a boolean
                elems.forEach((elem) => {
                    const equals = elem.value === (pref.type === "bool" ? (value === true ? "true" : "false") : value);
                    if (equals) {
                        elem.checked = true;
                    }
                    elem.addEventListener("change", function() {
                        if (this.checked) {
                            setPref(pref.key, pref.type === "bool" ? (this.value === "true" ? true : false) : this.value);
                        }
                    });
                });
            }
        });
    });

    // build account list
    await buildAccountList();
};

/**
 * Build the account list.
 * Get all accounts, display checkbox for each
 */
const buildAccountList = async () => {
    const accountBox = document.getElementById("ThreadVisEnableAccounts");
    const pref = document.getElementById("ThreadVisHiddenDisabledAccounts").value;

    const accounts = await getAccounts();
    accounts.forEach((account) => {
        const checkbox = document.createElement("input");
        checkbox.setAttribute("id", "ThreadVis-Account-" + account.id);
        checkbox.setAttribute("type", "checkbox");
        checkbox.setAttribute("data-type", "account");
        checkbox.setAttribute("data-account", account.id);
        checkbox.addEventListener("change", function() {
            buildAccountPreference();
            document.querySelectorAll("[data-type=folder][data-account=" + account.id + "]").forEach((box) => {
                box.disabled = ! this.checked;
            });
        });
        if (pref !== "" && pref.indexOf(" " + account.key + " ") > -1) {
            checkbox.checked = false;
        } else {
            checkbox.checked = true;
        }
        const label = document.createElement("label");
        label.setAttribute("for", "ThreadVis-Account-" + account.id);
        label.textContent = account.name;

        const buttonAll = document.createElement("button");
        buttonAll.textContent = "__MSG_options.visualisation.enabledaccounts.button.all__";
        buttonAll.addEventListener("click", function() {
            document.querySelectorAll("[data-type=folder][data-account=" + account.id + "]").forEach((box) => {
                box.checked = true;
                box.dispatchEvent(new Event("change"));
            });
        });
        const buttonNone = document.createElement("button");
        buttonNone.textContent = "__MSG_options.visualisation.enabledaccounts.button.none__";
        buttonNone.addEventListener("click", function() {
            document.querySelectorAll("[data-type=folder][data-account=" + account.id + "]").forEach((box) => {
                box.checked = false;
                box.dispatchEvent(new Event("change"));
            });
        });

        const hbox = document.createElement("div");
        hbox.setAttribute("class", "account");
        hbox.appendChild(checkbox);
        hbox.appendChild(label);
        hbox.appendChild(buttonAll);
        hbox.appendChild(buttonNone);
        accountBox.appendChild(hbox);

        buildFolderCheckboxes(accountBox, account.folders, account.id, 1);
    });
};

/**
 * Create checkbox elements for all folders
 * 
 * @param {DOMElement} box - The box to which to add the checkbox elements to
 * @param {Array} folders - All folders for which to create checkboxes
 * @param {Account} account - The account for which the checkboxes are created
 * @param {Number} indent - The amount of indentation
 */
const buildFolderCheckboxes = (box, folders, account, indent) => {
    const pref = document.getElementById("ThreadVisHiddenDisabledFolders").value;

    folders.forEach((folder) => {
        const div = document.createElement("div");
        const checkbox = document.createElement("input");
        checkbox.setAttribute("id", "ThreadVis-Account-" + account + "-Folder-" + folder.url);
        checkbox.setAttribute("type", "checkbox");
        checkbox.setAttribute("data-type", "folder");
        checkbox.setAttribute("data-account", account);
        checkbox.setAttribute("data-folder", folder.url);
        checkbox.addEventListener("change", function() {
            buildFolderPreference();
        });
        div.style.paddingLeft = indent + "em";
        if (pref !== "" && pref.indexOf(folder.url + " ") > -1) {
            checkbox.checked = false;
        } else {
            checkbox.checked = true;
        }
        const label = document.createElement("label");
        label.setAttribute("for", "ThreadVis-Account-" + account + "-Folder-" + folder.url);
        label.textContent = folder.name;
        div.appendChild(checkbox);
        div.appendChild(label);
        box.appendChild(div);

        // descend into subfolders
        if (folder.folders) {
            buildFolderCheckboxes(box, folder.folders, account, indent + 1);
        }
    });
};

/**
 * Create a string preference of all deselected accounts
 */
const buildAccountPreference = () => {
    const accountBox = document.getElementById("ThreadVisEnableAccounts");
    const prefElement = document.getElementById("ThreadVisHiddenDisabledAccounts");

    let pref = "";

    const checkboxes = accountBox.querySelectorAll("[data-type=account]");
    checkboxes.forEach((checkbox) => {
        if (! checkbox.checked) {
            pref += " " + checkbox.getAttribute("data-account") + " ";
        }
    });
    prefElement.value = pref;
    prefElement.dispatchEvent(new Event("change"));
};

/**
 * Create a string preference of all deselected folders
 */
const buildFolderPreference = () => {
    const accountBox = document.getElementById("ThreadVisEnableAccounts");
    const prefElement = document.getElementById("ThreadVisHiddenDisabledFolders");

    let pref = "";

    const checkboxes = accountBox.querySelectorAll("[data-type=folder]");
    checkboxes.forEach((checkbox) => {
        if (! checkbox.checked) {
            pref += " " + checkbox.getAttribute("data-folder") + " ";
        }
    });
    prefElement.value = pref;
    prefElement.dispatchEvent(new Event("change"));
};

const localize = () => {
    const keyPrefix = "__MSG_";

    const localization = {
        updateString(string) {
            const re = new RegExp(keyPrefix + "(.+?)__", "g");
            return string.replace(re, (matched) => {
                const key = matched.slice(keyPrefix.length, -2);
                return messenger.i18n.getMessage(key) || matched;
            });
        },

        updateSubtree(node) {
            const texts = document.evaluate(
                "descendant::text()[contains(self::text(), \"" + keyPrefix + "\")]",
                node,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            for (let i = 0, maxi = texts.snapshotLength; i < maxi; i++) {
                const text = texts.snapshotItem(i);
                if (text.nodeValue.includes(keyPrefix)) {
                    text.nodeValue = this.updateString(text.nodeValue);
                }
            }

            const attributes = document.evaluate(
                "descendant::*/attribute::*[contains(., \"" + keyPrefix + "\")]",
                node,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            for (let i = 0, maxi = attributes.snapshotLength; i < maxi; i++) {
                const attribute = attributes.snapshotItem(i);
                if (attribute.value.includes(keyPrefix)) {
                    attribute.value = this.updateString(attribute.value);
                }
            }
        },

        async updateDocument() {
            this.updateSubtree(document);
        }
    };

    localization.updateDocument();
};

(async () => {
    await init();
    localize();
})();