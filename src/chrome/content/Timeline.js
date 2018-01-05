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
 *               2013, 2018 Alexander C. Hubmann-Haidvogel
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

    /**
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
     * @return A new timeline object
     */
    ThreadVis.Timeline = function(stack, containers, resize, top) {
        this._stack = stack;
        this._containers = containers;
        this._resize = resize;
        this._top = top;
        this._times = {};
    };

    /**
     * Prototype / instance methods
     */
    ThreadVis.Timeline.prototype = {
        /**
         * XUL stack to draw timeline on
         */
        _stack : null,

        /**
         * containers of current thread
         */
        _containers : null,

        /**
         * resize multiplicator
         */
        _resize : 1,

        /**
         * top position of center of visualisation in px
         */
        _top : 0,

        _times : {},

        /**
         * Draw the timeline
         */
        draw : function() {
            // start with second container
            for (var i = 1; i < this._containers.length; i++) {
                // look at two adjacent containers
                var first = this._containers[i - 1];
                var second = this._containers[i];

                // don't calculate time if one of them is a dummy
                if (first.isDummy() || second.isDummy()) {
                    continue;
                }

                var timeDifference = first.timeDifference;

                // get the formatted strings
                var formatted = ThreadVis.Util
                        .formatTimeDifference(timeDifference);

                // draw the labels and tooltips
                this._drawTime(first, first.xPosition, second.xPosition,
                        formatted.string, formatted.toolTip);
            }
        },

        /**
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
         */
        _drawTime : function(container, left, right, string, toolTip) {
            var dotSize = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
            var minArcHeight = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT);
            var fontSize = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_TIMELINE_FONTSIZE);
            // check to see if we already created the label and the tooltip
            var elem = null;
            var newElem = false;
            if (this._times[container]) {
                elem = this._times[container];
            } else {
                elem = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "description");
                newElem = true;
                this._times[container] = elem;
            }

            // calculate position
            var posLeft = (left * this._resize);
            var posTop = (this._top - dotSize / 2 - fontSize) * this._resize
                    - 1;
            var posWidth = ((right - left) * this._resize);

            // set style
            elem.style.fontSize = fontSize + "px";
            elem.left = posLeft + "px";
            elem.style.textAlign = "center";
            elem.top = posTop + "px";
            elem.style.zIndex = "1";

            elem.setAttribute("value", string);
            elem.setAttribute("tooltiptext", toolTip);

            // and add to stack only if we just created the element
            if (newElem) {
                this._stack.appendChild(elem);

                // prevent mousedown event from bubbling to box object
                // prevent dragging of visualisation by clicking on message
                elem.addEventListener("mousedown", function(event) {
                    event.stopPropagation();
                }, true);
            }

            // hide if not enough space (need to show first, otherwise .clientWidth is 0
            elem.hidden = false;
            elem.width = "";
            if ((elem.clientWidth > Math.floor((right - left) * this._resize))
                    || (fontSize + 2 > minArcHeight * this._resize)) {
                elem.hidden = true;
            } else {
                elem.hidden = false;
                elem.width = posWidth + "px";
            }
        },

        /**
         * Re-Draw the timeline
         * 
         * @param resize
         *            The resize parameter
         * @param top
         *            The top position
         */
        redraw : function(resize, top) {
            this._resize = resize;
            this._top = top;
            this.draw();
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
