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
 * Copyright (C) 2007, 2008, 2009, 2010 Alexander C. Hubmann-Haidvogel
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
 * Draw the timeline.
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /***************************************************************************
     * Constructor for timeline class
     * 
     * @param stack
     *            The stack to draw the timeline on
     * @param containers
     *            An array of all containers
     * @param resize
     *            The resize parameter [0..1]
     * @param top
     *            The top position of the timeline
     * @param topDelta
     *            The delta position of the timeline
     * @return A new timeline object
     **************************************************************************/
    ThreadVis.Timeline = function(stack, containers, resize, top, topDelta) {
        /**
         * XUL stack to draw timeline on
         */
        this.stack = stack;

        /**
         * containers of current thread
         */
        this.containers = containers;

        /**
         * resize multiplicator
         */
        this.resize = resize;

        /**
         * top position of center of visualisation in px
         */
        this.top = top;

        /**
         * delta of timeline (moved to top by delta)
         */
        this.topDelta = topDelta;

        this.times = {};
    }

    /***************************************************************************
     * Draw the timeline
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Timeline.prototype.draw = function() {
        // start with second container
        for ( var i = 1; i < this.containers.length; i++) {
            // look at two adjacent containers
            var first = this.containers[i - 1];
            var second = this.containers[i];

            // don't calculate time if one of them is a dummy
            if (first.isDummy() || second.isDummy()) {
                continue;
            }

            var timeDifference = first.timeDifference;

            // get the formatted strings
            var formatted = ThreadVis.Util.formatTimeDifference(timeDifference);

            // draw the labels and tooltips
            this.drawTime(first, first.xPosition, second.xPosition,
                    formatted.string, formatted.toolTip);
        }
    }

    /***************************************************************************
     * Draw the label and the tooltip
     * 
     * @param container
     *            The container to draw
     * @param left
     *            The left position
     * @param right
     *            The right position
     * @param string
     *            The string to display
     * @param toolTip
     *            The tooltip to add
     * @return void
     **************************************************************************/
    ThreadVis.Timeline.prototype.drawTime = function(container, left, right,
            string, toolTip) {
        // check to see if we already created the label and the tooltip
        var elem = null;
        var newElem = false;
        if (this.times[container]) {
            elem = this.times[container];
        } else {
            elem = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                    "description");
            newElem = true;
            this.times[container] = elem;
        }

        // calculate style
        var styleBorderBottom = "";
        var styleBorderLeft = "";
        var styleBorderRight = "";
        var styleBorderTop = "";
        var styleFontSize = "9px";
        var styleLeft = (left * this.resize) + "px";
        var styleTop = (this.top - this.topDelta) * this.resize + "px";
        var styleWidth = ((right - left) * this.resize) + "px";

        // set style
        elem.style.borderBottom = styleBorderBottom;
        elem.style.borderLeft = styleBorderLeft;
        elem.style.borderRight = styleBorderRight;
        elem.style.borderTop = styleBorderTop;
        elem.style.fontSize = styleFontSize;
        elem.style.left = styleLeft;
        elem.style.position = "relative";
        elem.style.textAlign = "center";
        elem.style.top = styleTop;
        elem.style.width = styleWidth;
        elem.style.zIndex = "1";
        // elem.style.cursor = "move";

        elem.setAttribute("value", string);
        elem.setAttribute("tooltiptext", toolTip);

        // and add to stack only if we just created the element
        if (newElem) {
            this.stack.appendChild(elem);

            // prevent mousedown event from bubbling to box object
            // prevent dragging of visualisation by clicking on message
            elem.addEventListener("mousedown", function(event) {
                event.stopPropagation();
            }, true);
        }

        // hide if not enough space
        if (((right - left) * this.resize < 20)
                || (this.topDelta * this.resize < 9)) {
            elem.hidden = true;
        } else {
            elem.hidden = false;
        }
    }

    /***************************************************************************
     * Re-Draw the timeline
     * 
     * @param resize
     *            The resize parameter
     * @param top
     *            The top position
     **************************************************************************/
    ThreadVis.Timeline.prototype.redraw = function(resize, top) {
        this.resize = resize;
        this.top = top;
        this.draw();
    }

    return ThreadVis;
}(ThreadVis || {}));
