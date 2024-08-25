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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023, 2024 Alexander C. Hubmann-Haidvogel
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
 * JavaScript file to visualise message arc in threadvis
 **********************************************************************************************************************/

import { Preferences } from "./utils/preferences.mjs";

export class ArcVisualisation {
    /**
     * XUL/DOM window to draw in
     */
    #document;

    /**
     * XUL stack on which to draw
     */
    #stack;

    /**
     * size of the dot representing a message in px
     */
    #dotSize;

    /**
     * resize multiplicator
     */
    #resize;

    /**
     * the minimum arc height in px
     */
    #arcMinHeight;

    /**
     * the (height) difference between two arcs in px
     */
    #arcDifference;

    /**
     * the corner radius for an arc in px
     */
    #arcRadius;

    /**
     * width of an arc in px
     */
    #arcWidth;

    /**
     * colour of the arc
     */
    #colour;

    /**
     * vertical position of arc ("top" or "bottom")
     */
    #vPosition;

    /**
     * height of arc (counting from 0) multiplied by arcDifference to get height in px
     */
    #height;

    /**
     * left edge of arc in px
     */
    #left;

    /**
     * right edge of arc in pc
     */
    #right;

    /**
     * top edge of arc in px
     */
    #top;

    /**
     * opacity of item
     */
    #opacity;

    /**
     * XUL box element which visualises the arc
     */
    #arc;

    /**
     * Constructor for visualisation class
     * 
     * @constructor
     * @param {DOMElement} document - The document to draw on
     * @param {DOMElement} stack - The stack to draw on
     * @param {Number} resize - The resize parameter
     * @param {String} colour - The colour of the arc
     * @param {String} vPosition - The vertical position (top/bottom)
     * @param {Number} height - The height of the arc
     * @param {Number} left - The left position of the arc
     * @param {Number} right - The right position of the arc
     * @param {Number} top - The top position
     * @param {Number} opacity - The opacity
     * @return {ArcVisualisation} - A new arc visualisation object
     */
    constructor(document, stack, resize, colour, vPosition, height, left, right, top, opacity) {
        Object.seal(this);

        this.#dotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        this.#arcMinHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        this.#arcDifference = Preferences.get(Preferences.VIS_ARC_DIFFERENCE);
        this.#arcRadius = Preferences.get(Preferences.VIS_ARC_RADIUS);
        this.#arcWidth = Preferences.get(Preferences.VIS_ARC_WIDTH);

        this.#document = document;
        this.#stack = stack;
        this.#resize = resize;
        this.#colour = colour;
        this.#vPosition = vPosition;
        this.#height = height;
        this.#left = left;
        this.#right = right;
        this.#top = top;
        this.#opacity = opacity;
        this.#arc = null;

        this.#draw();
    }

    /**
     * Draw arc
     */
    #draw() {
        this.#arc = this.#document.createXULElement("box");
        this.#arc.style.position = "relative";

        this.#visualise();
        this.#stack.appendChild(this.#arc);
    }

    /**
     * Re-Draw arc
     *
     * @param {Number} resize - The resize parameter
     * @param {Number} left - The left position
     * @param {Number} right - The right position
     * @param {Number} top - The top position
     * @param {String} colour - The colour
     * @param {Number} opacity - The opacity
     */
    redraw(resize, left, right, top, colour, opacity) {
        this.#resize = resize;
        this.#left = left;
        this.#top = top;
        this.#right = right;
        this.#colour = colour;
        this.#opacity = opacity;

        this.#visualise();
    }

    /**
     * Visualise arc
     */
    #visualise() {
        let arcTop = 0;
        if (this.#vPosition === "top") {
            arcTop = (this.#top - ((this.#dotSize / 2) + this.#arcMinHeight + (this.#arcDifference * this.#height))) * this.#resize;
        } else {
            arcTop = (this.#top + (this.#dotSize / 2)) * this.#resize;
        }

        let posTop = arcTop;
        let posLeft = (this.#left - (this.#arcWidth / 2)) * this.#resize;
        let posHeight = (this.#arcMinHeight + this.#arcDifference * this.#height) * this.#resize;
        let posWidth = (this.#right - this.#left + this.#arcWidth) * this.#resize;
        let styleBackground = this.#colour;
        let styleOpacity = this.#opacity;

        this.#arc.style.top = `${posTop}px`;
        this.#arc.style.left = `${posLeft}px`;
        this.#arc.style.height = `${posHeight}px`;
        this.#arc.style.width = `${posWidth}px`;
        this.#arc.style.opacity = styleOpacity;
        if (this.#vPosition === "top") {
            this.#arc.style.borderTopLeftRadius = `${this.#arcRadius}px`;
            this.#arc.style.borderTopRightRadius = `${this.#arcRadius}px`;
            this.#arc.style.borderTop = `${this.#arcWidth * this.#resize}px solid ${styleBackground}`;
            this.#arc.style.borderLeft = `${this.#arcWidth * this.#resize}px solid ${styleBackground}`;
            this.#arc.style.borderRight = `${this.#arcWidth * this.#resize}px solid ${styleBackground}`;
        } else {
            this.#arc.style.borderBottomLeftRadius = `${this.#arcRadius}px`;
            this.#arc.style.borderBottomRightRadius = `${this.#arcRadius}px`;
            this.#arc.style.borderBottom = `${this.#arcWidth * this.#resize}px solid ${styleBackground}`;
            this.#arc.style.borderLeft = `${this.#arcWidth * this.#resize}px solid ${styleBackground}`;
            this.#arc.style.borderRight = `${this.#arcWidth * this.#resize}px solid ${styleBackground}`;
        }
    }
}