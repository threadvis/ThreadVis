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
 * JavaScript file to visualise message arc in threadvis
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /**
     * Constructor for visualisation class
     * 
     * @constructor
     * @param {DOMElement}
     *            stack The stack to draw on
     * @param {Number}
     *            dotSize The size of the dot
     * @param {Number}
     *            resize The resize parameter
     * @param {Number}
     *            arcMinHeight The minimal arc height
     * @param {Number}
     *            arcDifference The height difference between two arcs
     * @param {Number}
     *            arcRadius The corner radius of an arc
     * @param {Nuumber}
     *            arcWidth The width of the arc
     * @param {String}
     *            colour The colour of the arc
     * @param {String}
     *            vPosition The vertical position (top/bottom)
     * @param {Number}
     *            height The height of the arc
     * @param {Number}
     *            left The left position of the arc
     * @param {Number}
     *            right The right position of the arc
     * @param {Number}
     *            top The top position
     * @param {Number}
     *            opacity The opacity
     * @return {ThreadVis.ArcVisualisation} A new arc visualisation object
     * @type ThreadVis.ArcVisualisation
     */
    ThreadVis.ArcVisualisation = function(stack, dotSize, resize, arcMinHeight,
            arcDifference, arcRadius, arcWidth, colour, vPosition, height,
            left, right, top, opacity) {

        this._stack = stack;
        this._dotSize = dotSize;
        this._resize = resize;
        this._arcMinHeight = arcMinHeight;
        this._arcDifference = arcDifference;
        this._arcRadius = arcRadius;
        this._arcWidth = arcWidth;
        this._colour = colour;
        this._vPosition = vPosition;
        this._height = height;
        this._left = left;
        this._right = right;
        this._top = top;
        this._opacity = opacity;

        this._draw();
    };

    /**
     * Prototype / instance methods
     */
    ThreadVis.ArcVisualisation.prototype = {
        /**
         * XUL box element which visualises the arc
         */
        _arc : null,

        /**
         * XUL stack on which to draw
         */
        _stack : null,

        /**
         * size of the dot representing a message in px
         */
        _dotSize : 0,

        /**
         * resize multiplicator
         */
        _resize : 1,

        /**
         * the minimum arc height in px
         */
        _arcMinHeight : 0,

        /**
         * the (height) difference between two arcs in px
         */
        _arcDifference : 0,

        /**
         * the corner radius for an arc in px
         */
        _arcRadius : 0,

        /**
         * width of an arc in px
         */
        _arcWidth : 0,

        /**
         * colour of the arc
         */
        _colour : "",

        /**
         * vertical position of arc ("top" or "bottom")
         */
        _vPosition : "top",

        /**
         * height of arc (counting from 0) multiplied by arc_difference_ to get
         * height in px
         */
        _height : 0,

        /**
         * left edge of arc in px
         */
        _left : 0,

        /**
         * right edge of arc in pc
         */
        _right : 0,

        /**
         * top edge of arc in px
         */
        _top : 0,

        /**
         * opacity of item
         */
        _opacity : 1,

        /**
         * Draw arc
         */
        _draw : function() {
            this._arc = document
                    .createElementNS(ThreadVis.XUL_NAMESPACE, "box");

            this._visualise();
            this._stack.appendChild(this._arc);
        },

        /**
         * Re-Draw arc
         * 
         * @param {Number}
         *            resize The resize parameter
         * @param {Number}
         *            left The left position
         * @param {Number}
         *            right The right position
         * @param {Number}
         *            top The top position
         * @param {String}
         *            colour The colour
         * @param {Number}
         *            opacity The opacity
         */
        redraw : function(resize, left, right, top, colour, opacity) {
            this._resize = resize;
            this._left = left;
            this._top = top;
            this._right = right;
            this._colour = colour;
            this._opacity = opacity;

            this._visualise();
        },

        /**
         * Visualise arc
         */
        _visualise : function() {
            var arcTop = 0;
            var fillTop = 0;
            if (this._vPosition == "top") {
                arcTop = (this._top - ((this._dotSize / 2) + this._arcMinHeight
                        + (this._arcDifference * this._height))) * this._resize;
            } else {
                arcTop = (this._top + (this._dotSize / 2)) * this._resize;
            }

            var posTop = arcTop;
            var posLeft = (this._left - (this._arcWidth / 2)) * this._resize;
            var posHeight = (this._arcMinHeight + this._arcDifference
                    * this._height)
                    * this._resize;
            var posWidth = (this._right - this._left + this._arcWidth)
                    * this._resize;
            var styleBackground = this._colour;
            var styleOpacity = this._opacity;

            this._arc.top = posTop + "px";
            this._arc.left = posLeft + "px";
            this._arc.height = posHeight + "px";
            this._arc.width = posWidth + "px";
            this._arc.style.opacity = styleOpacity;
            if (this._vPosition == "top") {
                // Thunderbird 5 uses CSS3
                this._arc.style.borderTopLeftRadius = this._arcRadius + "px";
                this._arc.style.borderTopRightRadius = this._arcRadius + "px";
                // Thundbird 3 uses -moz* custom CSS
                this._arc.style.MozBorderRadiusTopleft = this._arcRadius + "px";
                this._arc.style.MozBorderRadiusTopright = this._arcRadius + "px";
                this._arc.style.borderTop = (this._arcWidth * this._resize)
                        + "px solid " + styleBackground;
                this._arc.style.borderLeft = (this._arcWidth * this._resize)
                        + "px solid " + styleBackground;
                this._arc.style.borderRight = (this._arcWidth * this._resize)
                        + "px solid " + styleBackground;
            } else {
                // Thunderbird 5 uses CSS3
                this._arc.style.borderBottomLeftRadius = this._arcRadius + "px";
                this._arc.style.borderBottomRightRadius = this._arcRadius
                        + "px";
                // Thunderbird 3 uses -moz* custom CSS
                this._arc.style.MozBorderRadiusBottomleft = this._arcRadius
                        + "px";
                this._arc.style.MozBorderRadiusBottomright = this._arcRadius
                        + "px";
                this._arc.style.borderBottom = (this._arcWidth * this._resize)
                        + "px solid " + styleBackground;
                this._arc.style.borderLeft = (this._arcWidth * this._resize)
                        + "px solid " + styleBackground;
                this._arc.style.borderRight = (this._arcWidth * this._resize)
                        + "px solid " + styleBackground;
            }
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
