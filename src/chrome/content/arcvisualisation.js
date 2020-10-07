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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020 Alexander C. Hubmann-Haidvogel
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

var EXPORTED_SYMBOLS = [ "ArcVisualisation"];

 class ArcVisualisation {

    /**
     * XUL/DOM window to draw in
     */
    document = null;

    /**
     * XUL box element which visualises the arc
     */
    arc = null;

    /**
     * XUL stack on which to draw
     */
    stack = null;

    /**
     * size of the dot representing a message in px
     */
    dotSize = 0;

    /**
     * resize multiplicator
     */
    resize = 1;

    /**
     * the minimum arc height in px
     */
    arcMinHeight = 0;

    /**
     * the (height) difference between two arcs in px
     */
    arcDifference = 0;

    /**
     * the corner radius for an arc in px
     */
    arcRadius = 0;

    /**
     * width of an arc in px
     */
    arcWidth = 0;

    /**
     * colour of the arc
     */
    colour = "";

    /**
     * vertical position of arc ("top" or "bottom")
     */
    vPosition = "top";

    /**
     * height of arc (counting from 0) multiplied by arc_difference_ to get height in px
     */
    height = 0;

    /**
     * left edge of arc in px
     */
    left = 0;

    /**
     * right edge of arc in pc
     */
    right = 0;

    /**
     * top edge of arc in px
     */
    top = 0;

    /**
     * opacity of item
     */
    opacity = 1;

    /**
     * Constructor for visualisation class
     * 
     * @constructor
     * @param {DOMElement} document The document to draw on
     * @param {DOMElement} stack The stack to draw on
     * @param {Number} dotSize The size of the dot
     * @param {Number} resize The resize parameter
     * @param {Number} arcMinHeight The minimal arc height
     * @param {Number} arcDifference The height difference between two arcs
     * @param {Number} arcRadius The corner radius of an arc
     * @param {Number} arcWidth The width of the arc
     * @param {String} colour The colour of the arc
     * @param {String} vPosition The vertical position (top/bottom)
     * @param {Number} height The height of the arc
     * @param {Number} left The left position of the arc
     * @param {Number} right The right position of the arc
     * @param {Number} top The top position
     * @param {Number} opacity The opacity
     * @return {ArcVisualisation} A new arc visualisation object
     * @type ArcVisualisation
     */
    constructor(document, stack, dotSize, resize, arcMinHeight, arcDifference, arcRadius, arcWidth, colour, vPosition,
            height,left, right, top, opacity) {

        this.document = document;
        this.stack = stack;
        this.dotSize = dotSize;
        this.resize = resize;
        this.arcMinHeight = arcMinHeight;
        this.arcDifference = arcDifference;
        this.arcRadius = arcRadius;
        this.arcWidth = arcWidth;
        this.colour = colour;
        this.vPosition = vPosition;
        this.height = height;
        this.left = left;
        this.right = right;
        this.top = top;
        this.opacity = opacity;

        this.draw();
    };

    /**
     * Draw arc
     */
    draw() {
        this.arc = this.document.createXULElement("box");
        this.arc.style.position = "relative";

        this.visualise();
        this.stack.appendChild(this.arc);
    }

    /**
     * Re-Draw arc
     * 
     * @param {Number} resize The resize parameter
     * @param {Number} left The left position
     * @param {Number} right The right position
     * @param {Number} top The top position
     * @param {String} colour The colour
     * @param {Number} opacity The opacity
     */
    redraw(resize, left, right, top, colour, opacity) {
        this.resize = resize;
        this.left = left;
        this.top = top;
        this.right = right;
        this.colour = colour;
        this.opacity = opacity;

        this.visualise();
    }

    /**
     * Visualise arc
     */
    visualise() {
        let arcTop = 0;
        if (this.vPosition == "top") {
            arcTop = (this.top - ((this.dotSize / 2) + this.arcMinHeight + (this.arcDifference * this.height))) * this.resize;
        } else {
            arcTop = (this.top + (this.dotSize / 2)) * this.resize;
        }

        let posTop = arcTop;
        let posLeft = (this.left - (this.arcWidth / 2)) * this.resize;
        let posHeight = (this.arcMinHeight + this.arcDifference * this.height) * this.resize;
        let posWidth = (this.right - this.left + this.arcWidth) * this.resize;
        let styleBackground = this.colour;
        let styleOpacity = this.opacity;

        this.arc.style.top = posTop + "px";
        this.arc.style.left = posLeft + "px";
        this.arc.style.height = posHeight + "px";
        this.arc.style.width = posWidth + "px";
        this.arc.style.opacity = styleOpacity;
        if (this.vPosition == "top") {
            this.arc.style.borderTopLeftRadius = this.arcRadius + "px";
            this.arc.style.borderTopRightRadius = this.arcRadius + "px";
            this.arc.style.borderTop = (this.arcWidth * this.resize) + "px solid " + styleBackground;
            this.arc.style.borderLeft = (this.arcWidth * this.resize) + "px solid " + styleBackground;
            this.arc.style.borderRight = (this.arcWidth * this.resize) + "px solid " + styleBackground;
        } else {
            this.arc.style.borderBottomLeftRadius = this.arcRadius + "px";
            this.arc.style.borderBottomRightRadius = this.arcRadius + "px";
            this.arc.style.borderBottom = (this.arcWidth * this.resize) + "px solid " + styleBackground;
            this.arc.style.borderLeft = (this.arcWidth * this.resize) + "px solid " + styleBackground;
            this.arc.style.borderRight = (this.arcWidth * this.resize) + "px solid " + styleBackground;
        }
    }
}