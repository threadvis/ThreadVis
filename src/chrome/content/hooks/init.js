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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022 Alexander C. Hubmann-Haidvogel
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

const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

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
}

let ThreadVisInstance;

/**
 * Activate add-on, called by WindowListener experiment
 *
 * @param {boolean} isAddonActivation
 */
var onLoad = async (isAddonActivation) => {
    WL.injectCSS("chrome://threadvis/content/threadvis.css");
    injectVisualisation();
    injectStatusbar();

    await notify.notifyTools.notifyBackground({command: "initPref"});
    ThreadVisInstance = new ThreadVis(window, openOptionsPage);

    window.ThreadVis = ThreadVisInstance;
    // attach event listeners
    document.getElementById("ThreadVisPopUpOpenOptionsDialog")
        .addEventListener("command", () => WL.messenger.runtime.openOptionsPage());
    document.getElementById("ThreadVisOpenOptionsDialog")
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
    <hbox id="expandedHeaderView">
        <vbox id="expandedHeadersBox">
            <hbox id="expandedHeadersBottomBox">
                <hbox insertbefore="otherActionsBox"
                      style="flex: 0.33"
                      pack="end">
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
                    <hbox id="ThreadVis"
                          flex="1"
                          style="width: 100%">
                        <vbox flex="1">
                            <vbox id="ThreadVisBox"
                                  style="overflow: hidden;"
                                  flex="1"
                                  context="ThreadVisPopUp" />
                            <hbox id="ThreadVisHorizontalScrollbar"
                                  style="height: 5px; width: 0px;">
                                <hbox id="ThreadVisScrollbarLeft"
                                      style="width: 6px; height: 5px; padding-right: 1px;">
                                    <image src="chrome://threadvis/content/images/arrowleft.png"
                                           style="width: 5px; height: 5px;" />
                                </hbox>
                                <stack id="ThreadVisScrollbarHorizontalBox"
                                       style="background: #cccccc; border: 1px solid #333333; height: 5px;"
                                       flex="1">
                                    <box id="ThreadVisScrollbarHorizontal"
                                         height="3"
                                         style="background: #333333; cursor: e-resize; position: relative;" />
                                </stack>
                                <hbox id="ThreadVisScrollbarRight"
                                      style="width: 6px; height: 5px; padding-left: 1px;">
                                    <image src="chrome://threadvis/content/images/arrowright.png"
                                           style="width: 5px; height: 5px;" />
                                </hbox>
                            </hbox>
                        </vbox>
                        <vbox id="ThreadVisVerticalScrollbar">
                            <vbox style="width: 5px;"
                                  flex="1">
                                <hbox id="ThreadVisScrollbarUp"
                                      style="width: 5px; height: 6px; padding-bottom: 1px;">
                                    <image src="chrome://threadvis/content/images/arrowtop.png"
                                           style="width: 5px; height: 5px;" />
                                </hbox>
                                <stack id="ThreadVisScrollbarVerticalBox"
                                       style="background: #cccccc; border: 1px solid #333333;"
                                       flex="1">
                                    <box id="ThreadVisScrollbarVertical"
                                         width="3"
                                         style="background: #333333; cursor: s-resize; position: relative;" />
                                </stack>
                                <hbox id="ThreadVisScrollbarDown"
                                      style="width: 5px; height: 6px; padding-top: 1px;">
                                    <image src="chrome://threadvis/content/images/arrowbottom.png"
                                           style="width: 5px; height: 5px;" />
                                </hbox>
                            </vbox>
                            <hbox style="height: 5px;" />
                        </vbox>
                    </hbox>
                </hbox>
            </hbox>
        </vbox>
    </hbox>`,
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