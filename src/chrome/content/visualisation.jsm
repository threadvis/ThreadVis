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
 * JavaScript file to visualise message relationships (threads).
 **********************************************************************************************************************/

const EXPORTED_SYMBOLS = [ "Visualisation" ];

const { ArcVisualisation } = ChromeUtils.import("chrome://threadvis/content/arcvisualisation.jsm");
const { ContainerVisualisation } = ChromeUtils.import("chrome://threadvis/content/containervisualisation.jsm");
const { Preferences } = ChromeUtils.import("chrome://threadvis/content/utils/preferences.jsm");
const { Scrollbar } = ChromeUtils.import("chrome://threadvis/content/scrollbar.jsm");
const { Strings } = ChromeUtils.import("chrome://threadvis/content/utils/strings.jsm");
const { Timeline } = ChromeUtils.import("chrome://threadvis/content/timeline.jsm");
const { convertHSVtoRGB, convertRGBtoHSV} = ChromeUtils.import("chrome://threadvis/content/utils/color.jsm");
const { extractEmailAddress } = ChromeUtils.import("chrome://threadvis/content/utils/emailparser.jsm");
const { DECtoHEX, HEXtoDEC } = ChromeUtils.import("chrome://threadvis/content/utils/number.jsm");

class Visualisation {

    /**
     * main ThreadVis object
     */
    #threadvis;

    /**
     * content window
     */
    #window;

    /**
     * content document
     */
    #document;

    /**
     * Default colors
     */
    #COLOUR_DUMMY = "#75756D";
    #COLOUR_SINGLE = "#0000FF";

    /**
     * Default resize parameters
     */
    #resize = 1;
    #zoom = 1;

    /**
     * Delay zooming
     */
    #zoomTimeout;

    /**
     * container visualisations
     */
    #containerVisualisations = {};

    /**
     * arc visualisations
     */
    #arcVisualisations = {};

    /**
     * Timeline
     */
    #timeline;

    /**
     * Scrollbar
     */
    #scrollbar;

    /**
     * Flag for visualisation change
     */
    #changed = false;

    /**
     * Temporarily disabled (e.g. by account/folder)
     */
    #disabled = false;

    /**
     * Force visualisation despite too many documents
     */
    #force = false;

    /**
     * XUL outer box
     */
    #outerBox;

    /**
     * XUL inner box
     */
    #box;

    /**
     * XUL stack to draw on
     */
    #stack;

    /**
     * Popups for messages
     */
    #popups;

    /**
     * XUL legend box
     */
    #legend;

    /**
     * Currently displayed thread
     */
    #currentThread;

    /**
     * Lastly chosen color offset
     */
    #lastColour;

    /**
     * Start positions for panning
     */
    #panning = false;

    /**
     * Constructor for visualisation class
     * 
     * @return {ThreadVis.Visualisation} A new visualisation object
     */
    constructor(threadvis, window) {
        Object.seal(this);
        this.#threadvis = threadvis;
        this.#window = window;
        this.#document = window.document;

        // get all needed DOM elements
        this.#outerBox = this.#document.getElementById("ThreadVis");
        this.#box = this.#document.getElementById("ThreadVisBox");
        this.#stack = this.#document.getElementById("ThreadVisStack");
        this.#popups = this.#document.getElementById("ThreadVisPopUpTooltips");

        // attach event listeners
        this.#document.addEventListener("mousemove", (event) => this.#onMouseMove(event), false);
        this.#box.addEventListener("mousedown", (event) => this.#onMouseDown(event), false);
        this.#document.addEventListener("mouseup", (event) => this.#onMouseUp(event), false);
        this.#box.addEventListener("DOMMouseScroll", (event) => this.#onScroll(event), false);
    }

    /**
     * Clear stack. Delete all children
     */
    clearStack() {
        this.#outerBox.hidden = false;
        while (this.#stack.firstChild) {
            this.#stack.removeChild(this.#stack.firstChild);
        }
        // reset move
        this.#stack.style.left = "0px";
        this.#stack.style.top = "0px";

        // also delete all popupset menus
        while (this.#popups.firstChild) {
            this.#popups.removeChild(this.#popups.firstChild);
        }
    }

    /**
     * Underline authors in header view
     * 
     * @param {Map<String, String>} authors - A hashmap (i.e. object) linking author email address to colour value
     */
    #colourAuthors(authors) {
        if (!authors) {
            return;
        }

        const prefHighlight = Preferences.get(Preferences.VIS_HIGHLIGHT);

        // check to see if we have the element messageHeader
        if (!this.#document.getElementById("messageHeader")) {
            return;
        }

        // in Thunderbird 102, every header containing an address seems to be a recipient-single-line
        const emailFields = this.#document.getElementById("messageHeader").querySelectorAll(".recipient-single-line");

        for (let field of emailFields) {
            const emailAddress = extractEmailAddress(field.textContent);
            if (! emailAddress) {
                continue;
            }

            const author = authors[emailAddress];
            let hsv = null;
            if (author) {
                hsv = author.hsv;
            }

            if (hsv && prefHighlight) {
                field.style.borderBottom = `2px solid ${this.#getColour(hsv.hue, 100, hsv.value)}`;
            } else {
                field.style.borderBottom = null;
            }
        }
    }

    /**
     * Underline authors in header view
     */
    recolourAuthors() {
        this.#colourAuthors(this.#currentThread?.authors);
    }

    /**
     * Build legend popup containing all authors of current thread
     * 
     * @param {Map<String, String>} authors - A hashmap (i.e. object) linking author email addresses to colour, name and message count
     */
    #createLegend(authors) {
        this.#legend = this.#document.createXULElement("vbox");

        for (let email in authors) {
            const { hsv, name, count} = authors[email];
            this.#legend.appendChild(this.#createLegendBox(hsv, name, count));
        }
    }

    get legend() {
        return this.#legend;
    }

    /**
     * Build one row for legend
     * 
     * @param {Object} hsv - The colour in HSV colour model
     * @param {String} name - The name of the author
     * @param {Number} count - The message count for the author
     * @return {DOMElement} A legend box for a single author
     */
    #createLegendBox(hsv, name, count) {
        const box = this.#document.createXULElement("hbox");

        const colourBox = this.#document.createXULElement("hbox");
        colourBox.style.background = this.#getColour(hsv.hue, 100, hsv.value);
        colourBox.style.width = "20px";
        box.appendChild(colourBox);

        const nameBox = this.#document.createXULElement("description");
        const nameText = this.#document.createTextNode(name + " (" + count + ")");
        nameBox.appendChild(nameText);

        box.appendChild(nameBox);

        return box;
    }

    set disabled(disabled) {
        this.#disabled = disabled;
    }

    set changed(changed) {
        this.#changed = changed;
    }

    /**
     * Display disabled message
     * 
     * @param {Boolean} forceHide - Force hiding of visualisation, even if preference is not set
     */
    displayDisabled(forceHide) {
        this.clearStack();
        this.#currentThread = undefined;

        // hide box completely
        if (forceHide) {
            this.#outerBox.hidden = true;
            return;
        }

        const warning = this.#document.createXULElement("label");
        warning.setAttribute("value", Strings.getString("visualisation.disabledWarning"));
        warning.style.position = "relative";
        warning.style.top = "10px";
        warning.style.left = "20px";
        warning.style.color = "#999999";
        this.#stack.appendChild(warning);

        const link = this.#document.createXULElement("label");
        link.setAttribute("value", Strings.getString("visualisation.disabledWarningLink"));
        link.style.position = "relative";
        link.style.top = "30px";
        link.style.left = "20px";
        link.style.color = "#0000ff";
        link.style.textDecoration = "underline";
        link.addEventListener("click", () => this.#threadvis.openOptionsPage(), true);
        link.style.cursor = "pointer";
        this.#stack.appendChild(link);

        // set cursor
        this.#box.style.cursor = null;

        this.#disabled = true;
        this.#changed = true;
        this.#colourAuthors({});
    }

    /**
     * Display warning (too many messages)
     * 
     * @param {ThreadVis.Thread} thread - The thread which has too many children
     */
    #displayWarningCount(thread) {
        this.clearStack();
        this.#scrollbar?.draw();

        const warning = this.#document.createXULElement("label");
        warning.setAttribute("value", Strings.getString("visualisation.warningCount") + " (" + thread.root.count + ").");
        warning.classList.add("warning");
        warning.style.top = "10px";
        this.#stack.appendChild(warning);

        const link = this.#document.createXULElement("label");
        link.setAttribute("value", Strings.getString("visualisation.warningCountLink"));
        link.classList.add("warning", "link");
        link.style.top = "30px";
        link.addEventListener("click", () => this.visualise(thread, true), true);
        this.#stack.appendChild(link);

        // check to move warning all the way to the right
        this.moveVisualisationTo({
            x: this.#boxSize.width - this.#stackSize.width
        });

        // set cursor
        this.#box.style.cursor = null;
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
    #drawArc(colour, vPosition, height, left, right, top, opacity) {
        const arc = new ArcVisualisation(this.#document, this.#stack, this.#resize,
            colour, vPosition, height, left, right, top, opacity);

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
     * @return {String} - The arc SVG string
     */
    #drawArcSVG(colour, vPosition, height, left, right, top, opacity, resize) {
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

        const path = `M${startX},${startY}`
            + ` a${radiusX},${radiusY} 0 0,${sweep} ${radiusX},${cornerStart}`
            + ` h ${width}`
            + ` a${radiusX},${radiusY} 0 0,${sweep} ${radiusX},${cornerEnd}`;

        return `<path d="${path}" fill="none" stroke="${colour}" stroke-width="${prefArcWidth * resize}" />`;
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
    #drawDot(container, colour, left, top, selected, circle, opacity) {
        const msg = new ContainerVisualisation(this.#threadvis, this.#document, this.#stack, container, colour,
            left, top, selected, this.#resize, circle, opacity);

        return msg;
    }

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
     * @return {String} - The dot SVG string
     */
    #drawDotSVG(container, colour, left, top, selected, circle, opacity, resize) {
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);

        let style = "full";
        if (container.message?.isSent) {
            style = "half";
        } else {
            style = "dummy";
        }

        let svg = `<circle cx="${left * resize}" cy="${top * resize}" r="${prefDotSize * resize * 0.5}"`;

        if (style !== "half") {
            svg += ` fill="${colour}"`;
        } else {
            svg += ` stroke="${colour}" stroke-width="${prefDotSize / 4 * resize}" fill="none"`;
        }
        svg += " />";

        return svg;
    }

    /**
     * Get the size of the available viewbox
     * 
     * @return {Object}
     *          .height - The height of the box
     *          .width - The width of the box
     */
    get #boxSize() {
        return {
            height: this.#box.getBoundingClientRect().height,
            width: this.#box.getBoundingClientRect().width
        };
    }

    /**
     * Get the size of the stack
     * 
     * @return {Object}
     *          .height - The height of the stack
     *          .width - The width of the stack
     */
    get #stackSize() {
        // loop over all elements, calculate max in each direction
        const {
            left: stackLeft,
            top: stackTop
        } = this.#stack.getBoundingClientRect();
        return Array.from(this.#stack.querySelectorAll("*")).reduce(({width, height}, element) => {
            const {
                left: elementLeft,
                top: elementTop,
                width: elementWidth,
                height: elementHeight
            } = element.getBoundingClientRect();
            return {
                width: Math.max(width, elementLeft + elementWidth - stackLeft),
                height: Math.max(height, elementTop + elementHeight - stackTop)
            };
        }, { width: 0, height: 0});
    }

    /**
     * Get a colour for the arc
     * 
     * @param {Number} hue - The colour hue
     * @param {Number} saturation - The colour saturation
     * @param {Number} value - The colour value
     * @return {String} - A colour string in the form "#11AACC"
     */
    #getColour(hue, saturation, value) {
        const rgb = convertHSVtoRGB(hue, saturation, value);

        return "#" + DECtoHEX(Math.floor(rgb.r))
                + DECtoHEX(Math.floor(rgb.g))
                + DECtoHEX(Math.floor(rgb.b));
    }

    /**
     * Get a new colour for the dot/arc. Choose the next available colour
     * 
     * @param {Boolean} sent - True if the message was sent
     * @return {Object} - The next available colour in HSV colour model
     */
    #getNewColour(sent) {
        // display sent emails always in the same colour
        let hex = "";
        if (sent) {
            hex = Preferences.get(Preferences.VIS_COLOURS_SENT);
        } else {
            const receivedColours = Preferences.get(Preferences.VIS_COLOURS_RECEIVED).split(",");
            this.#lastColour = (this.#lastColour + 1) % receivedColours.length;
            hex = receivedColours[this.#lastColour];
        }
        return convertRGBtoHSV(
            HEXtoDEC(hex.slice(1, 3)),
            HEXtoDEC(hex.slice(3, 5)),
            HEXtoDEC(hex.slice(5, 7)));
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
    #getResize(xCount, yCount, sizeX, sizeY) {
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
    #moveVisualisation(container) {
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);

        // get current left margin
        const oldMargin = parseFloat(this.#stack.style.left);
        let newMargin = oldMargin;

        const originalWidth = this.#boxSize.width;

        if (container.x * this.#resize + oldMargin > originalWidth) {
            // calculate necessary margin
            newMargin = -(container.x * this.#resize - originalWidth) - (prefSpacing * this.#resize);

            // if we already see the selected message, don't move any further
            if (newMargin > oldMargin) {
                newMargin = oldMargin;
            }
        }
        if (container.x * this.#resize + oldMargin < (prefSpacing / 2) * this.#resize) {
            // calculate necessary margin
            newMargin = (-container.x + (prefSpacing / 2)) * this.#resize;
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
        if (typeof (position.x) !== "undefined") {
            this.#stack.style.left = `${position.x}px`;
        }
        if (typeof (position.y) !== "undefined") {
            this.#stack.style.top = `${position.y}px`;
        }
    }

    /**
     * OnMouseDown event handler.
     * On left mouse button down, remember mouse position and enable panning
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    #onMouseDown(event) {
        // only pan on left click
        if (event.button !== 0) {
            return;
        }

        // only pan if visualisation is larger than viewport
        if (this.#scrollbar && !this.#scrollbar.isShown) {
            return;
        }

        this.#panning = {
            start: {
                x: event.screenX,
                y: event.screenY
            },
            box: {
                width: this.#box.clientWidth,
                height: this.#box.clientHeight
            },
            stack: {
                width: this.#stack.scrollWidth,
                height: this.#stack.scrollHeight
            }
        };
        this.#outerBox.classList.add("hover");

        // set mouse cursor
        this.#setCursor();
    }

    /**
     * OnMouseMove event handler.
     * If panning is enabled, read new mouse position and move box accordingly
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    #onMouseMove(event) {
        if (this.#panning) {
            const x = event.screenX;
            const y = event.screenY;

            let dx = x - this.#panning.start.x;
            let dy = y - this.#panning.start.y;
            let currentX = parseFloat(this.#stack.style.left);
            let currentY = parseFloat(this.#stack.style.top);

            if (currentX === "") {
                currentX = 0;
            }
            if (currentY === "") {
                currentY = 0;
            }
            dx = parseFloat(currentX) + parseFloat(dx);
            dy = parseFloat(currentY) + parseFloat(dy);
            this.#panning.start.x = x;
            this.#panning.start.y = y;

            // set mininum dx to a little less than available to prevent overpanning
            const minDx = Math.min(this.#panning.box.width - this.#panning.stack.width, 0);
            const minDy = Math.min(this.#panning.box.height - this.#panning.stack.height, 0);


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
            if (this.#scrollbar?.isShownHorizontal) {
                position.x = dx;
            }
            if (this.#scrollbar?.isShownVertical) {
                position.y = dy;
            }

            this.moveVisualisationTo(position);

            this.#scrollbar?.draw();
        }
    }

    /**
     * OnMouseUp event handler.
     * Disable panning when mouse button is released
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    #onMouseUp(event) {
        this.#panning = false;
        this.#outerBox.classList.remove("hover");

        // reset mouse cursor
        this.#setCursor();
    }

    /**
     * OnScroll event handler.
     * If mouse wheel is moved, zoom in and out of visualisation
     * 
     * @param {DOMEvent} event - The mouse event that fired
     */
    #onScroll(event) {
        // event.detail gives number of lines to scroll
        // positive number means scroll down
        if (event.detail < 0) {
            this.#zoomIn();
        } else {
            this.#zoomOut();
        }
    }

    /**
     * Reset stack
     * Set all offsets to zero
     */
    #resetStack() {
        this.#stack.style.left = "0px";
        this.#stack.style.top = "0px";
    }

    /**
     * Set the cursor
     */
    #setCursor() {
        // set cursor to dragging if currently panning
        if (this.#panning) {
            this.#box.style.cursor = "-moz-grabbing";
        }
        // set cursor if visualisation is draggable
        else if (this.#scrollbar?.isShown) {
            this.#box.style.cursor = "-moz-grab";
        } else {
            this.#box.style.cursor = null;
        }
    }

    /**
     * Visualise a new thread
     * 
     * @param {ThreadVis.Thread} thread - The current message thread to visualise
     * @param {Boolean} force - True to force a draw even if the thread contains too many messages
     */
    visualise(thread, force) {
        if (this.#disabled) {
            return;
        }

        // set cursor
        this.#box.style.cursor = "wait";

        // set background
        this.#outerBox.style.backgroundColor = Preferences.get(Preferences.VIS_COLOURS_BACKGROUND);
        const borderColour = Preferences.get(Preferences.VIS_COLOURS_BORDER);
        if (borderColour !== "") {
            this.#outerBox.style.border = "1px solid " + borderColour;
        } else {
            this.#outerBox.style.border = null;
        }

        if (typeof force === "undefined") {
            force = false;
        }
        this.#force = force;

        if (!thread) {
            thread = this.#currentThread;
        }

        if (!thread) {
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
        let keepExisting = false;
        if (thread.root.id === this.#currentThread?.root.id && !this.#changed) {
            keepExisting = true;
        }

        if (! keepExisting) {
            // clear stack before drawing
            this.#zoomReset();
            this.#resetStack();
            this.clearStack();

            this.#lastColour = -1;
            this.#containerVisualisations = {};
            this.#arcVisualisations = {};

            // get number of containers
            const count = thread.size;
            if (count > 50 && !this.#force) {
                this.#displayWarningCount(thread);
                return;
            }
        }

        // remember current thread to redraw after zoom
        this.#currentThread = thread;

        // calculate positions of containers
        const availableSize = this.#boxSize;
        const width = availableSize.width * this.#zoom;
        const height = availableSize.height * this.#zoom;
        const positionedThread = thread.getPositioned(width);

        const thisTopHeight = prefDotSize / 2 + prefArcMinHeight + positionedThread.topHeight * prefArcDifference;

        // do final resizing
        if (defaultZoom === "fit") {
            this.#resize = this.#getResize(positionedThread.size, Math.max(positionedThread.topHeight, positionedThread.bottomHeight), width, height);
        } else {
            this.#resize = 1 * this.#zoom;
        }

        positionedThread.containers.forEach((container) => {
            let colour = this.#COLOUR_DUMMY;
            let opacity = 1;
            let hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            if (container.message) {
                if (prefColour === "single") {
                    if (container.selected) {
                        colour = this.#COLOUR_SINGLE;
                    } else {
                        colour = this.#COLOUR_DUMMY;
                    }
                } else {
                    if (container.author.hsv) {
                        hsv = container.author.hsv;
                    } else {
                        hsv = this.#getNewColour(container.isSent);
                        container.author.hsv = hsv;
                    }
                    colour = this.#getColour(hsv.hue, 100, hsv.value);
                    if (container.selected || container.inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            if (!keepExisting) {
                // only display black circle to highlight selected message
                // if we are using more than one colour
                const circle = prefColour === "single" ? false : true;
                this.#containerVisualisations[container.id] = this.#drawDot(container, colour, container.x, thisTopHeight, container.selected, circle, opacity);
            } else {
                this.#containerVisualisations[container.id].redraw(this.#resize, container.x, thisTopHeight, container.selected, colour, opacity);
            }

            // draw arc
            const parent = container.parent;
            if (parent) {
                let position = "bottom";
                if (parent.depth % 2 === 0) {
                    position = "top";
                }

                const arcHeight = container.arcHeight;
                // if we are using a single colour, display all arcs from
                // a selected message in this colour
                if (prefColour === "single") {
                    if (container.selected || container.inThread) {
                        colour = this.#COLOUR_SINGLE;
                    } else {
                        colour = this.#COLOUR_DUMMY;
                    }
                } else {
                    // get colour for arc
                    colour = this.#getColour(hsv.hue, 100, hsv.value);
                    if (container.selected || container.inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }

                if (!keepExisting) {
                    this.#arcVisualisations[container.id] = this.#drawArc(colour, position, arcHeight, container.parent.x, container.x, thisTopHeight, opacity);
                } else {
                    this.#arcVisualisations[container.id].redraw(this.#resize, container.parent.x, container.x, thisTopHeight, colour, opacity);
                }
            }
        });

        // underline authors if enabled
        this.#colourAuthors(thread.authors);
        this.#createLegend(thread.authors);
        this.#threadvis.displayLegend();

        // calculate if we have to move the visualisation so that the
        // selected message is visible
        this.#moveVisualisation(positionedThread.selected);

        if (prefTimeline) {
            if (!keepExisting) {
                this.#timeline = new Timeline(this.#document, this.#stack, positionedThread, this.#resize, thisTopHeight);
                this.#timeline.draw();
            } else if (this.#timeline) {
                this.#timeline.redraw(positionedThread, this.#resize, thisTopHeight);
            }
        } else {
            this.#timeline = undefined;
        }

        if (! this.#scrollbar && ! keepExisting) {
            this.#scrollbar = new Scrollbar(this, this.#window, this.#stack, this.#box, this.#outerBox);
        }

        // vertically center the visualisation
        // - if visualisation height < available height, try to center as much as possible,
        //   but don't move any arcs outside of viewport, even if centerline is not centered
        // - if visualisation height > available height, center
        const centerY = availableSize.height / 2;
        const nowY = thisTopHeight * this.#resize;
        let deltaY = centerY - nowY;
        // check if visualisation fits into height, if so, don't move into negative
        if (this.#stackSize.height <= availableSize.height) {
            deltaY = Math.max(deltaY, 0);
        }
        this.moveVisualisationTo({
            y: deltaY
        });

        // right align the visualisation
        const deltaX = availableSize.width - positionedThread.maxX - (prefDotSize + prefSpacing / 2) * this.#resize;
        if (deltaX > 0) {
            this.moveVisualisationTo({
                x: deltaX
            });
        }

        this.#scrollbar.draw();
        // set cursor if visualisation is draggable
        this.#setCursor();
        this.#changed = false;
    }

    /**
     * Zoom in and draw new visualisation
     * 
     * @param {Number} amount - The amount by which to zoom in
     */
    #zoomIn(amount) {
        if (!isFinite(amount) || amount === 0) {
            amount = 1;
        }

        this.#zoom = this.#zoom + 0.1 * amount;

        this.#window.clearTimeout(this.#zoomTimeout);
        this.#zoomTimeout = this.#window.setTimeout(() => this.visualise(), 200);
    }

    /**
     * Zoom out and draw new visualisation
     * 
     * @param {Number} amount - The amount by which to zoom out
     */
    #zoomOut(amount) {
        // don't zoom out if there are no scrollbars
        if (!this.#scrollbar.isShown) {
            return;
        }
        if (!isFinite(amount) || amount === 0) {
            amount = 1;
        }

        this.#zoom = this.#zoom - 0.1 * amount;
        if (this.#zoom < 0.1) {
            this.#zoom = 0.1;
        }

        this.#window.clearTimeout(this.#zoomTimeout);
        this.#zoomTimeout = this.#window.setTimeout(() => this.visualise(), 200);
    }

    /**
     * Reset Zoom level
     */
    #zoomReset() {
        this.#zoom = 1.0;
    }

    /**
     * Export to SVG
     * 
     * @param {ThreadVis.Thread} thread - The message thread to visualise
     * @param {Boolean} force - True to force the display even if the thread contains too many messages
     */
    exportToSVG(thread, force) {
        console.log("xport to svg", thread, force);
        if (typeof force === "undefined") {
            force = false;
        }
        this.#force = force;

        if (!thread) {
            thread = this.#currentThread;
        }

        if (! thread) {
            return;
        }

        const prefArcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        const prefArcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const prefDotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const prefColour = Preferences.get(Preferences.VIS_COLOUR);
        const prefOpacity = Preferences.get(Preferences.VIS_OPACITY) / 100;
        const prefWidth = Preferences.get(Preferences.SVG_WIDTH);
        const prefHeight = Preferences.get(Preferences.SVG_HEIGHT);

        const width = prefWidth;
        const height = prefHeight;

        const positionedThread = thread.getPositioned(width);

        const thisTopHeight = prefDotSize / 2 + prefArcMinHeight + positionedThread.topHeight * prefArcDifference;

        // do final resizing
        const resize = this.#getResize(positionedThread.size, Math.max(positionedThread.topHeight, positionedThread.bottomHeight), width, height);

        let svg = `<?xml version="1.0" standalone="no"?>
            <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
            <svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">
            `.replace(/^\s+/gm, "").replace(/\s+$/gm, "");

        positionedThread.containers.forEach((container) => {
            let colour = this.#COLOUR_DUMMY;
            let opacity = 1;
            let hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            if (container.message) {
                if (prefColour === "single") {
                    if (container.selected) {
                        colour = this.#COLOUR_SINGLE;
                    } else {
                        colour = this.#COLOUR_DUMMY;
                    }
                } else {
                    if (container.author.hsv) {
                        hsv = container.author.hsv;
                    } else {
                        hsv = this.#getNewColour(container.isSent);
                        container.author.hsv = hsv;
                    }
                    colour = this.#getColour(hsv.hue, 100, hsv.value);
                    if (container.selected || container.inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            // only display black circle to highlight selected message
            // if we are using more than one colour
            const circle = prefColour === "single" ? false : true;

            svg += this.#drawDotSVG(container, colour, container.x, thisTopHeight, container.selected, circle, opacity, resize);
            svg += "\n";

            // draw arc
            const parent = container.parent;
            if (parent) {
                let position = "bottom";
                if (parent.depth % 2 === 0) {
                    position = "top";
                }

                const arcHeight = container.arcHeight;
                // if we are using a single colour, display all arcs from
                // a selected message in this colour
                if (prefColour === "single") {
                    if (container.selected || container.inThread) {
                        colour = this.#COLOUR_SINGLE;
                    } else {
                        colour = this.#COLOUR_DUMMY;
                    }
                } else {
                    // get colour for arc
                    colour = this.#getColour(hsv.hue, 100, hsv.value);
                    if (container.selected || container.inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }

                svg += this.#drawArcSVG(colour, position, arcHeight, container.parent.x, container.x, thisTopHeight, opacity, resize);
                svg += "\n";
            }
        });

        svg += "</svg>";

        const nsIFilePicker = Components.interfaces.nsIFilePicker;
        const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(this.#window, "Select a File", nsIFilePicker.modeSave);
        fp.appendFilter("SVG Files", "*.svg");
        fp.defaultString = "threadvis";
        fp.defaultExtension = "svg";

        fp.open((res) => {
            if (res === nsIFilePicker.returnOK || res === nsIFilePicker.returnReplace) {
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