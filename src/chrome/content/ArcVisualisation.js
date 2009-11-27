/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.mozdev.org/
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009 Alexander C. Hubmann-Haidvogel
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



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor for visualisation class
 *
 * @param stack
 *          The stack to draw on
 * @param dotSize
 *          The size of the dot
 * @param resize
 *          The resize parameter
 * @param arcMinHeight
 *          The minimal arc height
 * @param arcDifference
 *          The height difference between two arcs
 * @param arcRadius
 *          The corner radius of an arc
 * @param arcWidth
 *          The width of the arc
 * @param colour
 *          The colour of the arc
 * @param vPosition
 *          The vertical position (top/bottom)
 * @param height
 *          The height of the arc
 * @param left
 *          The left position of the arc
 * @param right
 *          The right position of the arc
 * @param top
 *          The top position
 * @param opacity
 *          The opacity
 * @return
 *          A new arc visualisation object
 ******************************************************************************/
ThreadVisNS.ArcVisualisation = function(stack, dotSize, resize, arcMinHeight,
    arcDifference, arcRadius, arcWidth, colour, vPosition, height, left, right,
    top, opacity) {

    /**
     * XUL stack on which to draw
     */
    this.stack = stack;

    /**
     * size of the dot representing a message in px
     */
    this.dotSize = dotSize;

    /**
     * resize multiplicator
     */
    this.resize = resize;

    /**
     * the minimum arc height in px
     */
    this.arcMinHeight = arcMinHeight;

    /**
     * the (height) difference between two arcs in px
     */
    this.arcDifference = arcDifference;

    /**
     * the corner radius for an arc in px
     */
    this.arcRadius = arcRadius;

    /**
     * width of an arc in px
     */
    this.arcWidth = arcWidth;

    /**
     * colour of the arc
     */
    this.colour = colour;

    /**
     * vertical position of arc ("top" or "bottom")
     */
    this.vPosition = vPosition;

    /**
     * height of arc (counting from 0)
     * multiplied by arc_difference_ to get height in px
     */
    this.height = height;

    /**
     * left edge of arc in px
     */
    this.left = left;

    /**
     * right edge of arc in pc
     */
    this.right = right;

    /**
     * top edge of arc in px
     */
    this.top = top;

    /**
     * opacity of item
     */
    this.opacity = opacity;

    this.drawArc();
}



/** ****************************************************************************
 * Draw arc
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ArcVisualisation.prototype.drawArc = function() {
    this.arc = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");

    this.visualise();
    this.stack.appendChild(this.arc);
}



/** ****************************************************************************
 * Re-Draw arc
 *
 * @param resize
 *          The resize parameter
 * @param left
 *          The left position
 * @param right
 *          The right position
 * @param top
 *          The top position
 * @param colour
 *          The colour
 * @param opacity
 *          The opacity
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ArcVisualisation.prototype.redrawArc = function(resize, left, right,
    top, colour, opacity) {
    this.resize = resize;
    this.left = left;
    this.top = top;
    this.right = right;
    this.colour = colour;
    this.opacity = opacity;

    this.visualise();
}



/** ****************************************************************************
 * Visualise arc
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ArcVisualisation.prototype.visualise = function() {
    var arcTop = 0;
    var fillTop = 0;
    if (this.vPosition == "top") {
        arcTop = (this.top - ((this.dotSize / 2) + this.arcMinHeight + 
            (this.arcDifference * this.height))) * this.resize;
    } else {
        arcTop = (this.top + (this.dotSize / 2)) * this.resize;
    }

    var styleTop = (arcTop) + "px";
    var styleLeft = ((this.left - (this.arcWidth / 2)) * this.resize) + "px";
    var styleHeight = ((this.arcMinHeight + this.arcDifference * this.height)
        * this.resize) + "px";
    var styleWidth = ((this.right - this.left + this.arcWidth)
        * this.resize)+ "px";
    var styleBackground = this.colour;
    var styleOpacity = this.opacity;

    this.arc.style.position = "relative";
    this.arc.style.top = styleTop;
    this.arc.style.left = styleLeft;
    this.arc.style.height = styleHeight;
    this.arc.style.width = styleWidth;
    this.arc.style.verticalAlign = "top";
    this.arc.style.opacity = styleOpacity;
    if (this.vPosition == "top") {
        this.arc.style.MozBorderRadiusTopleft = this.arcRadius + "px";
        this.arc.style.MozBorderRadiusTopright = this.arcRadius + "px"
        this.arc.style.borderTop = (this.arcWidth * this.resize) +  "px solid "
            + styleBackground;
        this.arc.style.borderLeft = (this.arcWidth * this.resize) +  "px solid "
            + styleBackground;
        this.arc.style.borderRight = (this.arcWidth * this.resize) + "px solid "
            + styleBackground;
    } else {
        this.arc.style.MozBorderRadiusBottomleft = this.arcRadius + "px";
        this.arc.style.MozBorderRadiusBottomright = this.arcRadius + "px";
        this.arc.style.borderBottom = (this.arcWidth * this.resize) + "px solid "
            + styleBackground;
        this.arc.style.borderLeft = (this.arcWidth * this.resize) + "px solid "
            + styleBackground;
        this.arc.style.borderRight = (this.arcWidth * this.resize) + "px solid "
            + styleBackground;
    }
}
