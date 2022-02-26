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
 * JavaScript file to visualise message relationships (threads).
 **********************************************************************************************************************/

const EXPORTED_SYMBOLS = [ "Visualisation" ];

const { ArcVisualisation } = ChromeUtils.import("chrome://threadvis/content/arcvisualisation.jsm");
const { sortFunction } = ChromeUtils.import("chrome://threadvis/content/container.jsm");
const { ContainerVisualisation } = ChromeUtils.import("chrome://threadvis/content/containervisualisation.jsm");
const { Preferences } = ChromeUtils.import("chrome://threadvis/content/utils/preferences.jsm");
const { Scrollbar } = ChromeUtils.import("chrome://threadvis/content/scrollbar.jsm");
const { Strings } = ChromeUtils.import("chrome://threadvis/content/utils/strings.jsm");
const { Timeline } = ChromeUtils.import("chrome://threadvis/content/timeline.jsm");
const { convertHSVtoRGB, convertRGBtoHSV} = ChromeUtils.import("chrome://threadvis/content/utils/color.jsm");
const { DECtoHEX, HEXtoDEC } = ChromeUtils.import("chrome://threadvis/content/utils/number.jsm");

class Visualisation {

    /**
     * Constructor for visualisation class
     * 
     * @return {ThreadVis.Visualisation} A new visualisation object
     */
    constructor(threadvis, window) {
        this.threadvis = threadvis;
        this.window = window;
        this.document = window.document;

        this.COLOUR_DUMMY = "#75756D";
        this.COLOUR_SINGLE = "#0000FF";

        this.box = null;
        this.stack = null;
        // set default resize parameter
        this.resize = 1;
        this.zoom = 1;

        this.authors = null;
        this.containers = null;
        this.containerVisualisations = null;
        this.arcVisualisations = null;
        this.timeline = null;
        this.scrollbar = null;
        this.changed = false;

        this.disabled = false;

        // force display of too many messages
        this.force = false;

        this.outerBox = this.document.getElementById("ThreadVis");
        this.box = this.document.getElementById("ThreadVisBox");
        this.verticalScrollbarBox = this.document.getElementById("ThreadVisVerticalScrollbar");
        this.horizontalScrollbarBox = this.document.getElementById("ThreadVisHorizontalScrollbar");
        this.buttonsBox = this.document.getElementById("ThreadVisButtons");
        this.stack = this.document.getElementById("ThreadVisStack");
        this.popups = this.document.getElementById("ThreadVisPopUpTooltips");
    }

    /**
     * Calculate heights for all arcs. Set information in containers.
     * 
     * @param {Array<ThreadVis.Container>} containers - The array of all containers that are visualised
     */
    calculateArcHeights(containers) {
        // reset all heights
        let thisContainer = null;
        for (let counter = 0; counter < containers.length; counter++) {
            thisContainer = containers[counter];
            thisContainer.currentArcHeightIncoming = [];
            thisContainer.currentArcHeightOutgoing = [];
        }

        for (let counter = 0; counter < containers.length; counter++) {
            thisContainer = containers[counter];
            thisContainer.xIndex = counter;

            // odd tells us if we display the arc above or below the messages
            thisContainer.odd = thisContainer.getDepth() % 2 == 0;

            const parent = thisContainer.getParent();
            if (parent != null) {
                // find a free arc height between the parent message and this one
                // since we want to draw an arc between this message and its parent,
                // and we do not want any arcs to overlap
                let freeHeight = 1;
                let blocked = true;
                while (blocked) {
                    blocked = false;
                    for (let innerCounter = parent.xIndex; innerCounter < counter; innerCounter++) {
                        const lookAtContainer = containers[innerCounter];

                        if (lookAtContainer.odd == parent.odd && lookAtContainer.currentArcHeightOutgoing[freeHeight] == 1) {
                            freeHeight++;
                            blocked = true;
                            break;
                        }
                        if (lookAtContainer.odd != parent.odd && lookAtContainer.currentArcHeightIncoming[freeHeight] == 1) {
                            freeHeight++;
                            blocked = true;
                            break;
                        }
                    }
                }
                parent.currentArcHeightOutgoing[freeHeight] = 1;
                thisContainer.currentArcHeightIncoming[freeHeight] = 1;

                thisContainer.arcHeight = freeHeight;
            }
        }
    }

    /**
     * Calculate size
     * 
     * @param {Array<ThreadVis.Container>} containers - The array of all containers that are visualised
     * @return {Object}
     *         .containers - All containers
     *         .totalMaxHeight - The maximum total height of the visualisation
     *         .minimalTimeDifference - The minimal time difference between two messages
     *         .topHeight - The height of the visualisation above the message nodes
     *         .bottomHeight - The height of the visualisation below the message nodes
     */
    calculateSize(containers) {
        // totalmaxheight counts the maximal number of stacked arcs
        let totalMaxHeight = 0;

        // topheight counts the maximal number of stacked arcs on top
        let topHeight = 0;

        // bottomheight counts the maximal number of stacked arcs on bottom
        let bottomHeight = 0;

        // minmaltimedifference stores the minimal time between two messages
        let minimalTimeDifference = Number.MAX_VALUE;

        this.calculateArcHeights(containers);

        for (let counter = 0; counter < containers.length; counter++) {
            const thisContainer = containers[counter];

            // odd tells us if we display the arc above or below the messages
            thisContainer.odd = thisContainer.getDepth() % 2 == 0;

            const parent = thisContainer.getParent();
            if (parent != null) {
                // also keep track of the current maximal stacked arc height,
                // so that we can resize the whole extension
                if (parent.odd && thisContainer.arcHeight > topHeight) {
                    topHeight = thisContainer.arcHeight;
                }

                if (!parent.odd && thisContainer.arcHeight > bottomHeight)
                    bottomHeight = thisContainer.arcHeight;
            }

            // also keep track of the time difference between two adjacent
            // messages
            if (counter < containers.length - 1) {
                const timeDifference = containers[counter + 1].getDate().getTime() - containers[counter].getDate().getTime();
                // timeDifference stores the time difference to the _next_ message
                thisContainer.timeDifference = timeDifference;

                // since we could have dummy containers that have the same time as
                // the next message, skip any time difference of 0
                if (timeDifference < minimalTimeDifference && timeDifference != 0) {
                    minimalTimeDifference = timeDifference;
                }
            }
        }

        totalMaxHeight = Math.max(topHeight, bottomHeight);

        return {
            containers,
            totalMaxHeight,
            minimalTimeDifference,
            topHeight,
            bottomHeight
        };
    }

    /**
     * Check size of stack. If resized, resize visualisation
     */
    checkSize() {
        if (this.disabled) {
            return;
        }

        if (this.box.getBoundingClientRect().height != this.boxHeight || this.box.getBoundingClientRect().width != this.boxWidth) {
            this.resetStack();
            this.visualise();
        }

        this.boxHeight = this.box.getBoundingClientRect().height;
        this.boxWidth = this.box.getBoundingClientRect().width;
    }

    /**
     * Clear stack. Delete all children
     */
    clearStack() {
        if (this.outerBox != null) {
            this.outerBox.hidden = false;
        }
        if (this.stack != null) {
            while (this.stack.firstChild != null) {
                this.stack.removeChild(this.stack.firstChild);
            }
            // reset move
            this.stack.style.marginLeft = "0px";
            this.stack.style.marginTop = "0px";
            this.stack.style.padding = "5px";

        }

        if (this.popups != null) {
            // also delete all popupset menus
            while (this.popups.firstChild != null) {
                this.popups.removeChild(this.popups.firstChild);
            }
        }
    }

    /**
     * Underline authors in header view
     * 
     * @param {Map<String, String>} authors - A hashmap (i.e. object) linking author email address to colour value
     */
    colourAuthors(authors) {
        const prefHighlight = Preferences.get(Preferences.VIS_HIGHLIGHT);

        // colour links
        const emailFields = [];

        // check to see if we have the element expandedHeaderView
        if (this.document.getElementById("expandedHeaderView") == null) {
            return;
        }

        // in Thunderbird 78, evertyhing seems to be a mail-multi-headerfield
        // (from, to, cc, bcc, ... )
        const multiFields = this.document.getElementById("expandedHeaderView").getElementsByTagName("mail-multi-emailheaderfield");
        for (let i = 0; i < multiFields.length; i++) {
            // get "normal" header fields (i.e. non expanded cc and to)
            let multiField = multiFields[i].emailAddresses.childNodes;
            for (let j = 0; j < multiField.length; j++) {
                if (multiField[j].attributes["emailAddress"])
                    emailFields.push(multiField[j]);
            }

            // get "expanded" header fields
            multiField = multiFields[i].longEmailAddresses.childNodes;
            for (let j = 0; j < multiField.length; j++) {
                if (multiField[j].attributes["emailAddress"]) {
                    emailFields.push(multiField[j]);
                }
            }
        }

        let emailField = null;
        while (emailField = emailFields.pop()) {
            const author = authors[emailField.attributes["emailAddress"].value];
            let hsv = null;
            if (author) {
                hsv = author.hsv;
            }

            if (hsv && prefHighlight) {
                emailField.style.borderBottom = "2px solid " + this.getColour(hsv.hue, 100, hsv.value);
            } else {
                emailField.style.borderBottom = null;
            }
        }
    }

    /**
     * Build legend popup containing all authors of current thread
     * 
     * @param {Map<String, String>} authors - A hashmap (i.e. object) linking author email addresses to colour, name and message count
     */
    createLegend(authors) {
        this.legend = this.document.createXULElement("vbox");

        for (let email in authors) {
            const { hsv, name, count} = authors[email];
            this.legend.appendChild(this.createLegendBox(hsv, name, count));
        }
    }

    /**
     * Build one row for legend
     * 
     * @param {Object} hsv - The colour in HSV colour model
     * @param {String} name - The name of the author
     * @param {Number} count - The message count for the author
     * @return {DOMElement} A legend box for a single author
     */
    createLegendBox(hsv, name, count) {
        const box = this.document.createXULElement("hbox");

        const colourBox = this.document.createXULElement("hbox");
        colourBox.style.background = this.getColour(hsv.hue, 100, hsv.value);
        colourBox.style.width = "20px";
        box.appendChild(colourBox);

        const nameBox = this.document.createXULElement("description");
        const nameText = this.document.createTextNode(name + " (" + count + ")");
        nameBox.appendChild(nameText);

        box.appendChild(nameBox);

        return box;
    };

    /**
     * Create stack
     */
    createStack() {
        if (!this.stack) {
            this.stack = null;
            if (this.stack == null) {
                this.stack = this.document.createXULElement("stack");
                this.stack.setAttribute("id", "ThreadVisStack");
                this.stack.style.position = "relative";
                this.box.appendChild(this.stack);
            }
            this.document.addEventListener("mousemove", event => this.onMouseMove(event), false);
            this.box.addEventListener("mousedown", event => this.onMouseDown(event), false);
            this.document.addEventListener("mouseup", event => this.onMouseUp(event), false);
            this.box.addEventListener("DOMMouseScroll", event => this.onScroll(event), false);
        } else {
            this.clearStack();
        }

        const loading = this.document.createXULElement("description");
        loading.setAttribute("value", Strings.getString("visualisation.loading"));
        loading.style.position = "relative";
        loading.style.top = "20px";
        loading.style.left = "20px";
        loading.style.color = "#999999";
        this.stack.appendChild(loading);
    }

    /**
     * Display disabled message
     * 
     * @param {Boolean} forceHide - Force hiding of visualisation, even if preference is not set
     */
    displayDisabled(forceHide) {
        this.clearStack();
        this.currentContainer = null;

        // hide box completely
        if (forceHide) {
            this.outerBox.hidden = true;
            return;
        }

        const warning = this.document.createXULElement("label");
        warning.setAttribute("value", Strings.getString("visualisation.disabledWarning"));
        warning.style.position = "relative";
        warning.style.top = "10px";
        warning.style.left = "20px";
        warning.style.color = "#999999";
        this.stack.appendChild(warning);

        const link = this.document.createXULElement("label");
        link.setAttribute("value", Strings.getString("visualisation.disabledWarningLink"));
        link.style.position = "relative";
        link.style.top = "30px";
        link.style.left = "20px";
        link.style.color = "#0000ff";
        link.style.textDecoration = "underline";
        link.addEventListener("click", () => this.threadvis.openOptionsPage(), true);
        link.style.cursor = "pointer";
        this.stack.appendChild(link);

        // set cursor
        this.box.style.cursor = null;

        this.disabled = true;
        this.changed = true;
        this.colourAuthors([]);
    }

    /**
     * Display warning (too many messages)
     * 
     * @param {ThreadVis.Container} container - The container which has too many children
     */
    displayWarningCount(container) {
        this.clearStack();

        const warning = this.document.createXULElement("label");
        warning.setAttribute("value", Strings.getString("visualisation.warningCount") + " [" + container.getTopContainer().getCount() + "].");
        warning.style.position = "relative";
        warning.style.top = "10px";
        warning.style.left = "20px";
        warning.style.color = "#999999";
        this.stack.appendChild(warning);

        const link = this.document.createXULElement("label");
        link.setAttribute("value", Strings.getString("visualisation.warningCountLink"));
        link.style.position = "relative";
        link.style.top = "30px";
        link.style.left = "20px";
        link.style.color = "#0000ff";
        link.style.textDecoration = "underline";
        link.addEventListener("click", () => this.visualise(container, true), true);
        link.style.cursor = "pointer";
        this.stack.appendChild(link);

        // set cursor
        this.box.style.cursor = null;
    }

    /**
     * Draw arc
     * 
     * @param {String} colour - The colour of the arc
     * @param {Number} vPosition - The vertical position of the arc (top or bottom)
     * @param {Number} height - The height of the arc
     * @param {Number} left - The left position of the arc
     * @param {Number} right - The right position of the arc
     * @param {Number} top - The top position of the arc
     * @param {Number} opacity - The opacity of the arc
     * @return {ThreadVis.ArcVisualisation} - The arc object
     */
    drawArc(colour, vPosition, height, left, right, top, opacity) {
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const prefArcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const prefArcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        const prefArcRadius = Preferences.get(Preferences.VIS_ARC_RADIUS);
        const prefArcWidth = Preferences.get(Preferences.VIS_ARC_WIDTH);

        const arc = new ArcVisualisation(this.document, this.stack, prefDotSize, this.resize, prefArcMinHeight,
            prefArcDifference, prefArcRadius, prefArcWidth, colour, vPosition, height, left, right, top, opacity);

        return arc;
    }

    /**
     * Export an arc to SVG
     * 
     * @param {String} colour - The colour of the arc
     * @param {Number} vPosition - The vertical position of the arc (top or bottom)
     * @param {Number} height - The height of the arc
     * @param {Number} left - The left position of the arc
     * @param {Number} right - The right position of the arc
     * @param {Number} top - The top position of the arc
     * @param {Number} opacity - The opacity of the arc
     * @param {Number} resize - The resize value
     * @param {Number} counter - A counter for the arcs to create distinct ids
     * @return {String} - The arc SVG string
     */
    drawArcSVG(colour, vPosition, height, left, right, top, opacity, resize, counter) {
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const prefArcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const prefArcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        const prefArcWidth = Preferences.get(Preferences.VIS_ARC_WIDTH);

        height = ((prefArcMinHeight + prefArcDifference * height) - prefArcWidth) * resize;
        let startX = left * resize;
        let startY = 0;
        let width = ((right - left) * resize);
        let radiusY = height;
        let radiusX = Math.min(height, width / 2);
        width = width - 2 * radiusX;
        let cornerStart = radiusY;
        let cornerEnd = radiusY;
        let sweep = 1;

        if (vPosition === "top") {
            cornerStart = -cornerStart;
            startY = (top - (prefDotSize / 2)) * resize;
        } else {
            cornerEnd = -cornerEnd;
            startY = (top + (prefDotSize / 2)) * resize;
            sweep = 0;
        }

        const path = "M" + startX + "," + startY
                + " a" + radiusX + "," + radiusY + " 0 0," + sweep + " " + radiusX + "," + cornerStart
                + " h " + width
                + " a" + radiusX + "," + radiusY + " 0 0," + sweep + " " + radiusX + "," + cornerEnd;

        return "<path id=\"p_" + counter + "\""
                + " d=\"" + path + "\""
                + " fill=\"none\""
                + " stroke=\"" + colour + "\""
                + " stroke-width=\"" + (prefArcWidth * resize) + "\" />";
    }

    /**
     * Draw a dot
     * 
     * @param {ThreadVis.Container} container - The container that is drawn
     * @param {String} colour - The colour of the dot
     * @param {Number} left - The left position of the dot
     * @param {Number} top - The top position of the dot
     * @param {Boolean} selected - True if the container is selected
     * @param {Boolean} circle - True to draw a circle around the dot
     * @param {Number} opacity - The opacity of the dot
     * @return {ThreadVis.ContainerVisualisation} - The dot object
     */
    drawDot(container, colour, left, top, selected, circle, opacity) {
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);
        const prefMessageCircles = Preferences.get(Preferences.VIS_MESSAGE_CIRCLES);
        const prefColourHighlight = Preferences.get(Preferences.VIS_COLOURS_CURRENT);

        const msg = new ContainerVisualisation(this.threadvis, this.document, this.stack, container, colour,
            prefColourHighlight, left, top, selected, prefDotSize, this.resize, circle, prefSpacing, opacity,
            prefMessageCircles);

        return msg;
    };

    /**
     * Export a dot to SVG
     * 
     * @param {ThreadVis.Container} container - The container that is drawn
     * @param {String} colour - The colour of the dot
     * @param {Number} left - The left position of the dot
     * @param {Number} top - The top position of the dot
     * @param {Boolean} selected - True if the container is selected
     * @param {Boolean} circle - True to draw a circle around the dot
     * @param {Number} opacity - The opacity of the dot
     * @param {Number} resize - The resize value
     * @param {Number} counter - A running counter to id the dot
     * @return {String} - The dot SVG string
     */
    drawDotSVG(container, colour, left, top, selected, circle, opacity, resize, counter) {
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);

        let style = "full";
        if (!container.isDummy()) {
            if (container.getMessage().isSent()) {
                style = "half";
            }
        } else {
            style = "dummy";
        }

        let svg = "<circle id=\"c_" + counter + "\""
                + " onmouseover=\"toggle(evt,this);\" onmouseout=\"toggle(evt,this);\""
                + " cx=\"" + (left * resize) + "\"" + " cy=\"" + (top * resize) + "\""
                + " r=\"" + (prefDotSize * resize * 0.5) + "\"";

        if (style !== "half") {
            svg += " fill=\"" + colour + "\"";
        } else {
            svg += " stroke=\"" + colour + "\" stroke-width=\"" + (prefDotSize / 4 * resize) + "\" fill=\"none\"";
        }
        svg += " />";

        return svg;
    };

    /**
     * Get the size of the available viewbox
     * 
     * @return {Object}
     *          .height - The height of the box
     *          .width - The width of the box
     */
    getBoxSize() {
        return {
            height: this.box.getBoundingClientRect().height,
            width: this.box.getBoundingClientRect().width
        };
    };

    /**
     * Get a colour for the arc
     * 
     * @param {Number} hue - The colour hue
     * @param {Number} saturation - The colour saturation
     * @param {Number} value - The colour value
     * @return {String} - A colour string in the form "#11AACC"
     */
    getColour(hue, saturation, value) {
        const rgb = convertHSVtoRGB(hue, saturation, value);

        return "#" + DECtoHEX(Math.floor(rgb.r))
                + DECtoHEX(Math.floor(rgb.g))
                + DECtoHEX(Math.floor(rgb.b));
    };

    /**
     * Get a new colour for the arc. Choose the next available colour
     * 
     * @param {Boolean} sent - True if the message was sent
     * @return {Object} - The next available colour in HSV colour model
     */
    getNewColour(sent) {
        // display sent emails always in the same colour
        let hex = "";
        if (sent) {
            hex = Preferences.get(Preferences.VIS_COLOURS_SENT);
        } else {
            const receivedColours = Preferences.get(Preferences.VIS_COLOURS_RECEIVED).split(",");

            this.lastColour = (this.lastColour + 1) % receivedColours.length;
            hex = receivedColours[this.lastColour];
        }
        hex = hex.substr(1);
        return convertRGBtoHSV(
            HEXtoDEC(hex.substr(0, 2)),
            HEXtoDEC(hex.substr(2, 2)),
            HEXtoDEC(hex.substr(4, 2)));
    }

    /**
     * Get resize multiplicator.
     * Calculate from box width and height and needed width and height
     * 
     * @param {Number} xCount - Number of messages
     * @param {Number} yCount - Number of stacked arcs
     * @param {Number} sizeX - Available horizontal size
     * @param {Number} sizeY - Available vertical size
     * @return {Number}  - The resize value (smaller than 1)
     */
    getResize(xCount, yCount, sizeX, sizeY) {
        const prefArcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        const prefArcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);

        const spacePerArcAvailableX = sizeX / xCount;
        const spacePerArcAvailableY = sizeY / 2;
        const spacePerArcNeededX = prefSpacing;
        const spacePerArcNeededY = (prefDotSize / 2) + prefArcMinHeight + (yCount + 1) * prefArcDifference;

        const resizeX = (spacePerArcAvailableX / spacePerArcNeededX);
        const resizeY = (spacePerArcAvailableY / spacePerArcNeededY);

        let resize = 1;
        if (resizeX < resizeY) {
            resize = resizeX;
        } else {
            resize = resizeY;
        }

        if (resize > 1) {
            resize = 1;
        }

        return resize;
    }

    /**
     * Move visualisation to show current message
     * 
     * @param {ThreadVis.Container} container - The container that should be included in the viewport
     */
    moveVisualisation(container) {
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);

        // get current left margin
        const oldMargin = parseFloat(this.stack.style.marginLeft);
        let newMargin = oldMargin;

        const originalWidth = this.box.getBoundingClientRect().width;

        if (container.xPosition * this.resize + oldMargin > originalWidth) {
            // calculate necessary margin
            newMargin = -(container.xPosition * this.resize - originalWidth) - (prefSpacing * this.resize);

            // if we already see the selected message, don't move any further
            if (newMargin > oldMargin) {
                newMargin = oldMargin;
            }
        }
        if (container.xPosition * this.resize + oldMargin < (prefSpacing / 2) * this.resize) {
            // calculate necessary margin
            newMargin = (-container.xPosition + (prefSpacing / 2)) * this.resize;
        }

        this.moveVisualisationTo({
            x: newMargin
        });
    }

    /**
     * Move visualisation by given delta
     * 
     * @param {Object} position The position to move the visualisation by
     *          .x: the x-position
     *          .y: the y-position
     */
    moveVisualisationTo(position) {
        if (typeof (position.x) != "undefined") {
            this.stack.style.marginLeft = position.x + "px";
        }
        if (typeof (position.y) != "undefined") {
            this.stack.style.marginTop = position.y + "px";
        }
    }

    /**
     * Mouse click event handler. Display message user clicked on
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    onMouseClick(event) {
        const container = event.target.container;
        if (container && !container.isDummy()) {
            this.threadvis.callback(container.getMessage().getKey(), container.getMessage().getFolder());
        }
    }

    /**
     * OnMouseDown event handler.
     * On left mouse button down, remember mouse position and enable panning
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    onMouseDown(event) {
        // only pan on left click
        if (event.button != 0) {
            return;
        }

        // only pan if visualisation is larger than viewport
        if (this.scrollbar != null && !this.scrollbar.isShown()) {
            return;
        }

        // remember box size now
        this.boxWidth = this.box.clientWidth;
        this.boxHeight = this.box.clientHeight;
        this.stackWidth = this.stack.scrollWidth;
        this.stackHeight = this.stack.scrollHeight;

        this.startX = event.clientX;
        this.startY = event.clientY;
        this.panning = true;

        // set mouse cursor
        this.setCursor();
    };

    /**
     * OnMouseMove event handler.
     * If panning is enabled, read new mouse position and move box accordingly
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    onMouseMove(event) {
        if (this.panning) {
            const x = event.clientX;
            const y = event.clientY;
            let dx = x - this.startX;
            let dy = y - this.startY;
            let currentX = parseFloat(this.stack.style.marginLeft);
            let currentY = parseFloat(this.stack.style.marginTop);

            if (currentX == "") {
                currentX = 0;
            }
            if (currentY == "") {
                currentY = 0;
            }
            dx = parseFloat(currentX) + parseFloat(dx);
            dy = parseFloat(currentY) + parseFloat(dy);
            this.startX = x;
            this.startY = y;

            // set mininum dx to a little less than available to prevent overpanning
            const minDx = Math.min(this.boxWidth - this.stackWidth + 4, 0);
            const minDy = Math.min(this.boxHeight - this.stackHeight, 0);

            // don't move more to the right than necessary
            if (dx > 0) {
                dx = 0;
            }

            // don't move more to the left than necessary
            if (dx < minDx) {
                dx = minDx;
            }

            // don't move more to the bottom than necessary
            if (dy > 0) {
                dy = 0;
            }

            // don't move more to the top than necessary
            if (dy < minDy) {
                dy = minDy;
            }

            const position = {};
            if (this.scrollbar.isShownHorizontal()) {
                position.x = dx;
            }
            if (this.scrollbar.isShownVertical()) {
                position.y = dy;
            }

            this.moveVisualisationTo(position);

            this.scrollbar.draw();
        }
    };

    /**
     * OnMouseUp event handler.
     * Disable panning when mouse button is released
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    onMouseUp(event) {
        this.panning = false;

        // reset mouse cursor
        this.setCursor();
    };

    /**
     * OnScroll event handler.
     * If mouse wheel is moved, zoom in and out of visualisation
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    onScroll(event) {
        // event.detail gives number of lines to scroll
        // positive number means scroll down
        if (event.detail < 0) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
    };

    /**
     * Reset stack Set all margins to zero
     */
    resetStack() {
        this.stack.style.marginLeft = "0px";
        this.stack.style.marginTop = "0px";
    };

    /**
     * Set the cursor
     */
    setCursor() {
        // set cursor to dragging if currently panning
        if (this.panning) {
            this.box.style.cursor = "-moz-grabbing";
        }
        // set cursor if visualisation is draggable
        else if (this.scrollbar != null && this.scrollbar.isShown()) {
            this.box.style.cursor = "-moz-grab";
        } else {
            this.box.style.cursor = null;
        }
    };

    /**
     * If time scaling is enabled, we want to layout the messages so that their
     * horizontal spacing is proportional to the time difference between those
     * two messages
     * 
     * @param {Array<ThreadVis.Container>} containers - The array of all containers to visualise
     * @param {Number} minimalTimeDifference - The minimal time difference between two messages
     * @param {Number} width - The available width
     * @return {Array<ThreadVis.Container>} - The containers array with set spacings for each container
     */
    timeScaling(containers, minimalTimeDifference, width) {
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);
        const prefTimescaling = Preferences.get(Preferences.TIMESCALING);
        const prefTimescalingMethod = Preferences.get(Preferences.TIMESCALING_METHOD);
        const prefTimescalingMinimalTimeDifference = Preferences.get(Preferences.TIMESCALING_MINTIMEDIFF);

        // if we do not want to do timescaling, reset all scaling info to 1
        for (let counter = 0; counter < containers.length; counter++) {
            const thisContainer = containers[counter];
            thisContainer.xScaled = 1;
        }
        if (!prefTimescaling) {
            return containers;
        }

        // we want to scale the messages horizontally according to their time difference
        // therefore we calculate the overall scale factor
        if (prefTimescalingMinimalTimeDifference > 0) {
            minimalTimeDifference = prefTimescalingMinimalTimeDifference;
        }
        let totalTimeScale = 0;
        for (let counter = 0; counter < containers.length - 1; counter++) {
            const thisContainer = containers[counter];
            // we norm the scale factor to the minimal time
            // (this means, the two messages that are the nearest in time have a difference of 1)
            if (thisContainer.timeDifference == 0) {
                thisContainer.xScaled = 1;
            } else {
                thisContainer.xScaled = thisContainer.timeDifference / minimalTimeDifference;
                // instead of linear scaling, we might use other scaling factor
                if (prefTimescalingMethod == "log") {
                    thisContainer.xScaled = Math.log(thisContainer.xScaled) / Math.log(2) + 1;
                }
                // check if we might encounter a dummy container, see above
                if (thisContainer.xScaled < 1) {
                    thisContainer.xScaled = 1;
                }
            }
            totalTimeScale += thisContainer.xScaled;
        }

        // max_count_x tells us how many messages we could display if all are laid out with the minimal horizontal spacing
        // e.g.
        // |---|---|---|
        // width / spacing would lead to 3
        const maxCountX = width / prefSpacing;

        // if the time scaling factor is bigger than what we can display, we have a problem
        // this means, we have to scale the timing factor down
        let scaling = 0.9;
        let iteration = 0;
        while (totalTimeScale > maxCountX) {
            iteration++;
            totalTimeScale = 0;
            for (let counter = 0; counter < containers.length - 1; counter++) {
                const thisContainer = containers[counter];
                if (thisContainer.timeDifference == 0) {
                    thisContainer.xScaled = 1;
                } else {
                    if (prefTimescalingMethod == "linear") {
                        thisContainer.xScaled = thisContainer.xScaled * scaling;
                    } else if (prefTimescalingMethod == "log") {
                        thisContainer.xScaled = Math.log(thisContainer.timeDifference / minimalTimeDifference) / Math.log(2 / Math.pow(scaling, iteration)) + 1;
                    }
                    if (thisContainer.xScaled < 1) {
                        thisContainer.xScaled = 1;
                    }
                }
                totalTimeScale += thisContainer.xScaled;
            }
            // if the total_time_scale == containers.length, we reduced every horizontal spacing to its minimum and
            // we can't do anything more
            // this means we have to lay out more messages than we can
            // this is dealt with later in resizing
            if (totalTimeScale === containers.length - 1) {
                break;
            }
        }

        return containers;
    };

    /**
     * Visualise a new thread
     * 
     * @param {ThreadVis.Container} container - The current message container to visualise
     * @param {Boolean} force - True to force a draw even if the thread contains too many messages
     */
    visualise(container, force) {
        if (this.disabled) {
            return;
        }

        // set cursor
        this.box.style.cursor = "wait";

        // set background
        this.outerBox.style.backgroundColor = Preferences.get(Preferences.VIS_COLOURS_BACKGROUND);
        const borderColour = Preferences.get(Preferences.VIS_COLOURS_BORDER);
        if (borderColour != "") {
            this.outerBox.style.border = "1px solid " + borderColour;
        } else {
            this.outerBox.style.border = null;
        }

        if (typeof force == "undefined") {
            force = false;
        }
        this.force = force;

        if (container == null) {
            container = this.currentContainer;
        }

        if (container == null) {
            return;
        }

        const prefArcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        const prefArcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const defaultZoom = Preferences.get(Preferences.VIS_ZOOM);
        const prefColour = Preferences.get(Preferences.VIS_COLOUR);
        const prefTimeline = Preferences.get(Preferences.TIMELINE);
        const prefOpacity = Preferences.get(Preferences.VIS_OPACITY) / 100;

        // check if we are still in the same thread as last time
        // check if visualisation parameters changed
        // if not, reset zoom level
        if (this.currentContainer && container.getTopContainer() == this.currentContainer.getTopContainer() && !this.changed) {
            this.visualiseExisting(container);
            return;
        }

        // clear stack before drawing
        this.createStack();
        this.zoomReset();
        this.resetStack();
        this.clearStack();

        // get topmost container
        const topContainer = container.getTopContainer();

        // get number of containers
        const count = topContainer.getCount();
        if (count > 50 && !this.force) {
            this.displayWarningCount(container);
            return;
        }

        // remember current container to redraw after zoom
        this.currentContainer = container;

        // get all containers in thread as array
        this.containers = new Array();
        this.containers.push(topContainer);
        this.containers = this.containers.concat(topContainer.getChildren());

        // sort containers by date
        this.containers.sort(sortFunction);

        // pre-calculate size
        const preSize = this.calculateSize(this.containers);
        this.containers = preSize.containers;
        // totalmaxheight counts the maximal number of stacked arcs
        const totalMaxHeight = preSize.totalMaxHeight;
        // minmaltimedifference stores the minimal time between two messages
        const minimalTimeDifference = preSize.minimalTimeDifference;

        const topHeight = prefDotSize / 2 + prefArcMinHeight + preSize.topHeight * prefArcDifference;

        const availableSize = this.getBoxSize();

        // do time scaling
        const width = availableSize.width * this.zoom - (prefSpacing / this.resize);
        const height = availableSize.height * this.zoom;
        this.containers = this.timeScaling(this.containers, minimalTimeDifference, width);

        // do final resizing
        if (defaultZoom == "fit") {
            this.resize = this.getResize(this.containers.length, totalMaxHeight, width, height);
        } else {
            this.resize = 1 * this.zoom;
        }

        let x = (prefSpacing / 2) * (1 / this.resize);

        // pre-calculate colours for different authors
        this.authors = new Object();
        this.lastColour = -1;

        this.containerVisualisations = {};
        this.arcVisualisations = {};

        for (let counter = 0; counter < this.containers.length; counter++) {
            const thisContainer = this.containers[counter];

            const selected = thisContainer == container;
            const inThread = container.findParent(thisContainer) || thisContainer.findParent(container);
            const sent = !thisContainer.isDummy() ? thisContainer.getMessage().isSent() : false;

            let colour = this.COLOUR_DUMMY;
            let opacity = 1;
            let hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            if (!thisContainer.isDummy()) {
                if (prefColour == "single") {
                    if (selected) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    if (this.authors[thisContainer.getMessage().getFromEmail()] != null) {
                        hsv = this.authors[thisContainer.getMessage().getFromEmail()].hsv;
                        this.authors[thisContainer.getMessage().getFromEmail()].count = this.authors[thisContainer.getMessage().getFromEmail()].count + 1;
                    } else {
                        hsv = this.getNewColour(sent);
                        this.authors[thisContainer.getMessage().getFromEmail()] = {
                            "hsv" : hsv,
                            "name" : thisContainer.getMessage().getFrom(),
                            "count" : 1
                        };
                    }
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            // only display black circle to highlight selected message
            // if we are using more than one colour
            const circle = prefColour == "single" ? false : true;

            this.containerVisualisations[thisContainer] = this.drawDot(thisContainer, colour, x, topHeight, selected, circle, opacity);

            thisContainer.xPosition = x;

            // draw arc
            const parent = thisContainer.getParent();
            if (parent != null) {
                let position = "bottom";
                if (parent.odd) {
                    position = "top";
                }

                const arcHeight = thisContainer.arcHeight;
                // if we are using a single colour, display all arcs from
                // a selected message in this colour
                if (prefColour == "single") {
                    if (selected || inThread) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    // get colour for arc
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }

                this.arcVisualisations[thisContainer] = this.drawArc(colour, position, arcHeight, parent.xPosition, x, topHeight, opacity);
            }
            if (counter < this.containers.length - 1) {
                x = x + (thisContainer.xScaled * prefSpacing);
            }
        }

        // underline authors if enabled
        this.colourAuthors(this.authors);
        this.createLegend(this.authors);
        this.threadvis.displayLegend();

        // calculate if we have to move the visualisation so that the
        // selected message is visible
        this.moveVisualisation(container);

        // create a new box and overlay over all other elements to catch
        // all clicks and drags
        const popupBox = this.document.createXULElement("box");
        popupBox.style.width = "100%";
        popupBox.style.height = "100%";
        popupBox.setAttribute("context", "ThreadVisPopUp");

        if (prefTimeline) {
            this.timeline = new Timeline(this.document, this.stack, this.containers, this.resize, topHeight);
            this.timeline.draw();
        } else {
            this.timeline = null;
        }

        if (!this.scrollbar) {
            this.scrollbar = new Scrollbar(this, this.window, this.stack, this.box);
        }
        this.scrollbar.init(this.box);
        this.scrollbar.draw();
        this.changed = false;

        // check for resize of box
        this.boxHeight = this.box.getBoundingClientRect().height;
        this.boxWidth = this.box.getBoundingClientRect().width;
        // TODO check how to resize
        // let ref = this;
        // this.window.clearInterval(this.checkResizeInterval);
        // this.checkResizeInterval = this.window.setInterval(function() {
        //     ref.checkSize();
        // }, 100);

        // set cursor if visualisation is draggable
        this.setCursor();

        // vertically center the visualisation
        const centerY = (availableSize.height - prefDotSize * this.resize) / 2;
        const nowY = topHeight * this.resize;
        const deltaY = centerY - nowY;
        this.moveVisualisationTo({
            y: deltaY
        });

        // right align the visualisation
        if (x < this.boxWidth) {
            const deltaX = this.boxWidth - x - prefDotSize - prefSpacing;
            this.moveVisualisationTo({
                x: deltaX
            });
        }
    };

    /**
     * Visualise an existing thread
     * 
     * @param {ThreadVis.Container} container - The current message container
     */
    visualiseExisting(container) {
        const prefArcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        const prefArcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);
        const defaultZoom = Preferences.get(Preferences.VIS_ZOOM);
        const prefColour = Preferences.get(Preferences.VIS_COLOUR);
        const prefTimeline = Preferences.get(Preferences.TIMELINE);
        const prefOpacity = Preferences.get(Preferences.VIS_OPACITY) / 100;

        // set cursor
        this.box.style.cursor = "wait";

        // remember current container to redraw after zoom
        this.currentContainer = container;

        // pre-calculate size
        const preSize = this.calculateSize(this.containers);
        this.containers = preSize.containers;
        // totalmaxheight counts the maximal number of stacked arcs
        const totalMaxHeight = preSize.totalMaxHeight;
        // minmaltimedifference stores the minimal time between two messages
        const minimalTimeDifference = preSize.minimalTimeDifference;

        const topHeight = prefDotSize / 2 + prefArcMinHeight + preSize.topHeight * prefArcDifference;

        const availableSize = this.getBoxSize();

        // do timescaling
        const width = availableSize.width * this.zoom - (prefSpacing / this.resize);
        const height = availableSize.height * this.zoom;
        this.containers = this.timeScaling(this.containers, minimalTimeDifference, width);

        // do final resizing
        if (defaultZoom == "fit") {
            this.resize = this.getResize(this.containers.length, totalMaxHeight, width, height);
        } else {
            this.resize = 1 * this.zoom;
        }

        let x = (prefSpacing / 2) * (1 / this.resize);

        for (let counter = 0; counter < this.containers.length; counter++) {
            const thisContainer = this.containers[counter];
            const selected = thisContainer == container;
            const inThread = thisContainer.findParent(container) || container.findParent(thisContainer);
            const sent = !thisContainer.isDummy() ? thisContainer.getMessage().isSent() : false;

            // if thread has changed and we don't have all container
            // visualisations
            if (this.containerVisualisations[thisContainer] == null) {
                // do a full redraw
                this.currentContainer = null;
                this.visualise(container);
                return;
            }

            let colour = this.COLOUR_DUMMY;
            let opacity = 1;
            let hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            if (!thisContainer.isDummy()) {
                // get colour for dot
                if (prefColour == "single") {
                    if (selected) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    if (this.authors[thisContainer.getMessage().getFromEmail()] != null) {
                        hsv = this.authors[thisContainer.getMessage().getFromEmail()].hsv;
                    } else {
                        hsv = this.getNewColour(sent);
                        this.authors[thisContainer.getMessage().getFromEmail()] = {
                            "hsv" : hsv,
                            "name" : thisContainer.getMessage().getFrom(),
                            "count" : 1
                        };
                    }
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            // draw dot
            this.containerVisualisations[thisContainer].redraw(this.resize, x, topHeight, selected, colour, opacity);
            thisContainer.xPosition = x;

            // get colour for arc
            if (prefColour == "single") {
                if (selected || inThread) {
                    colour = this.COLOUR_SINGLE;
                } else {
                    colour = this.COLOUR_DUMMY;
                }
            } else {
                colour = this.getColour(hsv.hue, 100, hsv.value);
                if (selected || inThread) {
                    opacity = 1;
                } else {
                    opacity = prefOpacity;
                }
            }

            // draw arc
            const parent = thisContainer.getParent();
            if (parent != null) {
                this.arcVisualisations[thisContainer].redraw(this.resize, parent.xPosition, x, topHeight, colour, opacity);
            }

            x = x + (thisContainer.xScaled * prefSpacing);
        }

        // calculate if we have to move the visualisation so that the
        // selected message is visible
        this.moveVisualisation(container);

        // underline authors if enabled
        this.colourAuthors(this.authors);
        this.createLegend(this.authors);

        if (prefTimeline && this.timeline != null) {
            this.timeline.redraw(this.resize, topHeight);
        }

        // reset vertical position before drawing scrollbars
        this.moveVisualisationTo({
            y: 0
        });
        this.scrollbar.draw();

        // set cursor if visualisation is draggable
        this.setCursor();

        // vertically center the visualisation
        const centerY = (availableSize.height - prefDotSize * this.resize) / 2;
        const nowY = topHeight * this.resize;
        const deltaY = centerY - nowY;
        this.moveVisualisationTo({
            y: deltaY
        });
    };

    /**
     * Zoom in and draw new visualisation
     * 
     * @param {Number} amount - The amount by which to zoom in
     */
    zoomIn(amount) {
        if (!isFinite(amount) || amount == 0) {
            amount = 1;
        }

        this.zoom = this.zoom + 0.1 * amount;

        this.window.clearTimeout(this.zoomTimeout);
        this.zoomTimeout = this.window.setTimeout(() => this.visualise(), 200);
    };

    /**
     * Zoom out and draw new visualisation
     * 
     * @param {Number} amount - The amount by which to zoom out
     */
    zoomOut(amount) {
        // don't zoom out if there are no scrollbars
        if (!this.scrollbar.isShown()) {
            return;
        }
        if (!isFinite(amount) || amount == 0) {
            amount = 1;
        }

        this.zoom = this.zoom - 0.1 * amount;
        if (this.zoom < 0.1) {
            this.zoom = 0.1;
        }

        this.window.clearTimeout(this.zoomTimeout);
        let ref = this;
        this.zoomTimeout = this.window.setTimeout(function() {
            ref.visualise();
        }, 200);
    };

    /**
     * Reset Zoom level
     */
    zoomReset() {
        this.zoom = 1.0;
    };

    /**
     * Export to SVG
     * 
     * @param {ThreadVis.Container} container - The message container to visualise
     * @param {Boolean} force - True to force the display even if the thread contains too many messages
     */
    exportToSVG(container, force) {
        if (typeof force == "undefined") {
            force = false;
        }
        this.force = force;

        if (container == null) {
            container = this.currentContainer;
        }

        const prefArcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        const prefArcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const prefColour = Preferences.get(Preferences.VIS_COLOUR);
        const prefOpacity = Preferences.get(Preferences.VIS_OPACITY) / 100;
        const prefWidth = Preferences.get(Preferences.SVG_WIDTH);
        const prefHeight = Preferences.get(Preferences.SVG_HEIGHT);

        // get topmost container
        const topContainer = container.getTopContainer();

        // get all containers in thread as array
        let containers = [];
        containers.push(topContainer);
        containers = containers.concat(topContainer.getChildren());

        // sort containers by date
        containers.sort(sortFunction);

        // pre-calculate size
        const preSize = this.calculateSize(this.containers);
        containers = preSize.containers;
        // totalmaxheight counts the maximal number of stacked arcs
        const totalMaxHeight = preSize.totalMaxHeight;
        // minmaltimedifference stores the minimal time between two messages
        const minimalTimeDifference = preSize.minimalTimeDifference;

        const topHeight = prefDotSize / 2 + prefArcMinHeight + preSize.topHeight * prefArcDifference;

        const width = prefWidth;
        const height = prefHeight;

        containers = this.timeScaling(containers, minimalTimeDifference, width);

        // do final resizing
        let x = prefSpacing / 2;
        const resize = this.getResize(containers.length, totalMaxHeight, width, height);

        // pre-calculate colours for different authors
        const authors = {};
        // remember last colour to reset
        let lastColour = this.lastColour;
        this.lastColour = -1;

        let svg = "<?xml version=\"1.0\" standalone=\"no\"?>"
                + "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">"
                + "<svg width=\"100%\" height=\"100%\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\">";

        for (let counter = 0; counter < containers.length; counter++) {
            const thisContainer = containers[counter];

            const selected = thisContainer == container;
            const inThread = container.findParent(thisContainer) || thisContainer.findParent(container);
            const sent = !thisContainer.isDummy() ? thisContainer.getMessage().isSent() : false;

            let colour = this.COLOUR_DUMMY;
            let opacity = 1;
            let hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            if (!thisContainer.isDummy()) {
                if (prefColour == "single") {
                    if (selected) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    if (authors[thisContainer.getMessage().getFromEmail()] != null) {
                        hsv = authors[thisContainer.getMessage().getFromEmail()].hsv;
                    } else {
                        hsv = this.getNewColour(sent);
                        authors[thisContainer.getMessage().getFromEmail()] = {
                            "hsv" : hsv
                        };
                    }
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            // only display black circle to highlight selected message
            // if we are using more than one colour
            const circle = prefColour == "single" ? false : true;

            svg += this.drawDotSVG(thisContainer, colour, x, topHeight, selected, circle, false, opacity, resize, counter);

            thisContainer.xPosition = x;
            thisContainer.svgId = counter;

            // draw arc
            const parent = thisContainer.getParent();
            if (parent != null) {
                let position = "bottom";
                if (parent.odd) {
                    position = "top";
                }

                const arcHeight = thisContainer.arcHeight;
                // if we are using a single colour, display all arcs from
                // a selected message in this colour
                if (prefColour == "single") {
                    if (selected || inThread) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    // get colour for arc
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }

                svg += this.drawArcSVG(colour, position, arcHeight, parent.xPosition, x, topHeight, opacity, resize, counter);
            }
            x = x + (thisContainer.xScaled * prefSpacing);
        }

        this.lastColour = lastColour;

        svg += "</svg>";

        const nsIFilePicker = Components.interfaces.nsIFilePicker;
        const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(this.window, "Select a File", nsIFilePicker.modeSave);
        fp.appendFilter("SVG Files", "*.svg");

        fp.open((res) => {
            if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
                const file = fp.file;
                const foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                        .createInstance(Components.interfaces.nsIFileOutputStream);

                // use 0x02 | 0x10 to open file for appending.
                foStream.init(file, 0x02 | 0x08 | 0x20, 0o666, 0); // write,
                // create,
                // truncate
                foStream.write(svg, svg.length);
                foStream.close();
            }
        });
    }
}