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
ThreadVisNS.ArcVisualisationSVG = function(stack, dotSize, resize, arcMinHeight,
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

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO, 
            "ArcVisualisationSVG()", {"action" : "start", "colour" : this.colour,
            "vposition" : this.vPosition, "height" : this.height,
            "left" : this.left, "right" : this.right});
    }

    this.drawArc();
}



/** ****************************************************************************
 * Draw arc
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ArcVisualisationSVG.prototype.drawArc = function() {
    //this.arc = document.createElementNS(THREADVIS.SVG_NAMESPACE, "rect");
    this.arc = document.createElementNS(THREADVIS.SVG_NAMESPACE, "path");

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
ThreadVisNS.ArcVisualisationSVG.prototype.redrawArc = function(resize, left,
    right, top, colour, opacity) {
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
ThreadVisNS.ArcVisualisationSVG.prototype.visualise = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO, 
            "Visualisation.drawArc()", {"action" : "draw arc",
            "top" : styleTop, "left" : styleLeft, "height" : styleHeight,
            "width" : styleWidth, "background" : styleBackground});
    }
    
    var height = ((this.arcMinHeight + this.arcDifference * this.height) - this.arcWidth)
        * this.resize;
    var startX = this.left * this.resize;
    var startY = 0;
    var width = ((this.right - this.left) * this.resize) ;
    var radiusY = height;
    var radiusX = Math.min(height, width / 2);
    width = width - 2 * radiusX;
    var cornerStart = radiusY;
    var cornerEnd = radiusY;
    var sweep = 1;
    
    if (this.vPosition == "top") {
        var cornerStart = -cornerStart;
        startY = (this.top - (this.dotSize / 2)) * this.resize;
    } else {
        var cornerEnd = -cornerEnd;
        startY = (this.top + (this.dotSize / 2)) * this.resize;
        sweep = 0;
    }
    
    var path = "M"+ startX + "," + startY
        + " a" + radiusX + "," + radiusY 
        + " 0 0," + sweep
        + " " + radiusX + "," + cornerStart
        + " h " + width
        + " a" + radiusX + "," + radiusY
        + " 0 0," + sweep
        + " " + radiusX + "," + cornerEnd;

    this.arc.setAttribute("d", path);
    this.arc.setAttribute("fill", "none");
    this.arc.setAttribute("stroke", this.colour);
    this.arc.setAttribute("stroke-width", this.arcWidth * this.resize);
    this.arc.setAttribute("opacity", this.opacity);
}
