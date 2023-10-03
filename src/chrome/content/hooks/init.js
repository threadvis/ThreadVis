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
 * JS file to load XUL to display ThreadVis extension and include all scripts.
 **********************************************************************************************************************/

const Services = globalThis.Services;

const { ThreadVis } = ChromeUtils.import("chrome://threadvis/content/threadvis.jsm");

const { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

const notify = {};
const extension = ExtensionParent.GlobalManager.getExtension(ThreadVis.ADD_ON_ID);
Services.scriptloader.loadSubScript(
    extension.rootURI.resolve("chrome/content/helpers/notifyTools.js"),
    notify,
    "UTF-8"
);
// Set add-on id in notify tools
notify.notifyTools.setAddOnId(ThreadVis.ADD_ON_ID);

const openOptionsPage = () => {
    WL.messenger.runtime.openOptionsPage();
};

let ThreadVisInstance;

/**
 * Activate add-on, called by WindowListener experiment
 *
 * @param {boolean} isAddonActivation
 */
var onLoad = async (isAddonActivation) => {
    WL.injectCSS("chrome://threadvis/content/threadvis.css");

    if (window.location.href === "about:message") {
        injectVisualisation();
    }
    if (window.location.href === "chrome://messenger/content/messenger.xhtml") {
        injectStatusbar();
        document.getElementById("ThreadVisOpenOptionsDialog")
            .addEventListener("command", () => WL.messenger.runtime.openOptionsPage());
        return;
    }

    await notify.notifyTools.notifyBackground({command: "initPref"});
    ThreadVisInstance = new ThreadVis(window, openOptionsPage);

    window.ThreadVis = ThreadVisInstance;
    // attach event listeners
    document.getElementById("ThreadVisPopUpOpenOptionsDialog")
        .addEventListener("command", () => WL.messenger.runtime.openOptionsPage());
    document.getElementById("ThreadVisPopUpOpenVisualisation")
        .addEventListener("command", () => ThreadVisInstance.displayVisualisationWindow());
    document.getElementById("ThreadVisOpenLegendWindow")
        .addEventListener("command", () => ThreadVisInstance.displayLegendWindow());
    document.getElementById("ThreadVisExportSVG")
        .addEventListener("command", () => ThreadVisInstance.visualisation.exportToSVG());
};

/**
 * Deactivate add-on, called by WindowListener experiment
 *
 * @param {boolean} isAddonDeactivation
 */
var onUnload = (isAddonDeactivation) => {
    if (ThreadVisInstance) {
        ThreadVisInstance.shutdown();
        ThreadVisInstance = null;
        delete window.ThreadVis;
    }
};

/**
 * Inject the visualization's XUL code into the user interface
 */
const injectVisualisation = () => {
    WL.injectElements(`
    <html:body>
        <popupset>
            <menupopup id="ThreadVisPopUp">
                <menuitem label="&popup.settings;"
                          id="ThreadVisPopUpOpenOptionsDialog" />
                <menuitem label="&popup.popupwindow;"
                          id="ThreadVisPopUpOpenVisualisation" />
                <menuitem label="&popup.legend;"
                          id="ThreadVisOpenLegendWindow" />
                <menuitem label="&popup.exportsvg;"
                          id="ThreadVisExportSVG" />
            </menupopup>
        </popupset>
        <popupset id="ThreadVisPopUpTooltips">
        </popupset>
    </html:body>`,
    ["chrome://threadvis/locale/threadvis.dtd"]);

    WL.injectElements(`
    <html:header id="messageHeader">
        <html:div id="ThreadVisHeaderBox">
            <html:div id="ThreadVis">
                <box id="ThreadVisBox" style="overflow: hidden;" context="ThreadVisPopUp">
                    <stack id="ThreadVisStack" />
                </box>
                <html:div id="ThreadVisHorizontalScrollbar">
                    <stack id="ThreadVisScrollbarHorizontalBox">
                        <html:div id="ThreadVisScrollbarHorizontal" />
                    </stack>
                </html:div>
                <html:div id="ThreadVisVerticalScrollbar">
                    <stack id="ThreadVisScrollbarVerticalBox" >
                        <html:div id="ThreadVisScrollbarVertical" />
                    </stack>
                </html:div>
            </html:div>
        </html:div>
    </html:header>`,
    ["chrome://threadvis/locale/threadvis.dtd"]);
};

/**
 * Inject the statusbar XUL code into the user interface
 */
const injectStatusbar = () => {
    WL.injectElements(`
    <hbox id="status-bar">
        <tooltip id="ThreadVisStatusTooltip" orient="vertical">
            <description value="&extension.name; &extension.version;" />
            <description id="ThreadVisStatusTooltipError"
                         hidden="true" />
            <description id="ThreadVisStatusTooltipDisabled"
                         value="&statusbar.disabled;"
                         hidden="true" />
            <description id="ThreadVisStatusTooltipGlodaDisabled"
                         value="&statusbar.disabledGloda;"
                         hidden="true" />
            <description id="ThreadVisStatusTooltipAccountDisabled"
                         value="&statusbar.disabledAccount;"
                         hidden="true" />
            <description id="ThreadVisStatusTooltipFolderDisabled"
                         value="&statusbar.disabledFolder;"
                         hidden="true" />
        </tooltip>
        <hbox id="ThreadVisStatusBarPanel"
              class="statusbarpanel"
              tooltip="ThreadVisStatusTooltip">
            <toolbarbutton id="ThreadVisStatusText"
                           label="&extension.name;"
                           defaultlabel="&extension.name;"
                           type="menu"
                           image="chrome://threadvis/content/images/statusbar.png">
                <menupopup id="ThreadVisStatusPopUp">
                    <menuitem label="&extension.name; &extension.version;"
                              disabled="true" />

                    <menuitem disabled="true"
                              label="&statusbar.enableAccount;" />
                    <menuitem id="ThreadVisStatusMenuEnableAccount"
                              type="checkbox"
                              label="&statusbar.enable;"
                              oncommand="ThreadVis.enableCurrentAccount();" />
                    <menuitem id="ThreadVisStatusMenuDisableAccount"
                              type="checkbox"
                              label="&statusbar.disable;"
                              oncommand="ThreadVis.disableCurrentAccount();" />

                    <menuseparator />

                    <menuitem disabled="true"
                              label="&statusbar.enableFolder;" />
                    <menuitem id="ThreadVisStatusMenuEnableFolder"
                              type="checkbox"
                              label="&statusbar.enable;" 
                              oncommand="ThreadVis.enableCurrentFolder();" />
                    <menuitem id="ThreadVisStatusMenuDisableFolder"
                              type="checkbox"
                              label="&statusbar.disable;"
                              oncommand="ThreadVis.disableCurrentFolder();" />

                    <menuseparator />

                    <menuitem label="&popup.settings;"
                              id="ThreadVisOpenOptionsDialog" />
                </menupopup>

            </toolbarbutton>
        </hbox>
    </hbox>`,
    ["chrome://threadvis/locale/threadvis.dtd"]);
};