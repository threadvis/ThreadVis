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
 * Names of preferences
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "PreferenceBranch", "PreferenceKeys" ];

const PreferenceBranch = "extensions.threadvis.";

/**
 * Preference names
 */
const PreferenceKeys = {
    // list of disabled accounts
    DISABLED_ACCOUNTS:
        PreferenceBranch + "disabledaccounts",

    // list of disabled folders
    DISABLED_FOLDERS:
        PreferenceBranch + "disabledfolders",

    // check for "sent" by folder flag
    SENTMAIL_FOLDERFLAG:
        PreferenceBranch + "sentmail.folderflag",

    // check for "sent" by identity
    SENTMAIL_IDENTITY:
        PreferenceBranch + "sentmail.identity",

    // height of SVG export image
    SVG_HEIGHT:
        PreferenceBranch + "svg.height",

    // width of SVG export image
    SVG_WIDTH:
        PreferenceBranch + "svg.width",

    // show timeline
    TIMELINE:
        PreferenceBranch + "timeline.enabled",

    // font size of timeline
    TIMELINE_FONTSIZE:
        PreferenceBranch + "timeline.fontsize",

    // enable timescaling
    TIMESCALING:
        PreferenceBranch + "timescaling.enabled",

    // timescaling method
    TIMESCALING_METHOD:
        PreferenceBranch + "timescaling.method",

    // minimal timedifference to show
    TIMESCALING_MINTIMEDIFF:
        PreferenceBranch + "timescaling.mintimediff",

    // size of dot
    VIS_DOTSIZE:
        PreferenceBranch + "visualisation.dotsize",

    // minimum height of arc
    VIS_ARC_MINHEIGHT:
        PreferenceBranch + "visualisation.arcminheight",

    // radius of arc
    VIS_ARC_RADIUS:
        PreferenceBranch + "visualisation.arcradius",

    // height difference between two arcs
    VIS_ARC_DIFFERENCE:
        PreferenceBranch + "visualisation.arcdifference",

    // arc width
    VIS_ARC_WIDTH:
        PreferenceBranch + "visualisation.arcwidth",

    // spacing
    VIS_SPACING:
        PreferenceBranch + "visualisation.spacing",

    // message circles
    VIS_MESSAGE_CIRCLES:
        PreferenceBranch + "visualisation.messagecircles",

    // colour
    VIS_COLOUR:
        PreferenceBranch + "visualisation.colour",

    // background color
    VIS_COLOURS_BACKGROUND:
        PreferenceBranch + "visualisation.colours.background",

    // border color
    VIS_COLOURS_BORDER:
        PreferenceBranch + "visualisation.colours.border",

    // colours for received
    VIS_COLOURS_RECEIVED:
        PreferenceBranch + "visualisation.colours.received",

    // colours for sent
    VIS_COLOURS_SENT:
        PreferenceBranch + "visualisation.colours.sent",

    // colour for marking current message
    VIS_COLOURS_CURRENT:
        PreferenceBranch + "visualisation.colours.current",

    // hide if only one message shown
    VIS_HIDE_ON_SINGLE:
        PreferenceBranch + "visualisation.hideonsingle",

    // highlight message
    VIS_HIGHLIGHT:
        PreferenceBranch + "visualisation.highlight",

    // minimal width of visualisation
    VIS_MINIMAL_WIDTH:
        PreferenceBranch + "visualisation.minimalwidth",

    // opacity
    VIS_OPACITY:
        PreferenceBranch + "visualisation.opacity",

    // zoom
    VIS_ZOOM:
        PreferenceBranch + "visualisation.zoom",

    // global message index (Thunderbird internal)
    GLODA_ENABLED:
        "mailnews.database.global.indexer.enabled"
};