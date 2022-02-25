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
 * Draw the timeline.
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "Timeline" ];

const { Preferences } = ChromeUtils.import("chrome://threadvis/content/utils/preferences.jsm");
const { formatTimeDifference } = ChromeUtils.import("chrome://threadvis/content/utils/date.jsm");

class Timeline {
    /**
     * Constructor for timeline class
     * 
     * @param document
     *            The document to draw in
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
    constructor(document, stack, containers, resize, top) {
        /**
         * XUL/DOM document to draw in
         */
        this.document = document;

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

        this.times = {};
    }

    /**
     * Draw the timeline
     */
    draw() {
        // start with second container
        for (let i = 1; i < this.containers.length; i++) {
            // look at two adjacent containers
            let first = this.containers[i - 1];
            let second = this.containers[i];

            // don't calculate time if one of them is a dummy
            if (first.isDummy() || second.isDummy()) {
                continue;
            }

            let timeDifference = first.timeDifference;

            // get the formatted strings
            let formatted = formatTimeDifference(timeDifference);

            // draw the labels and tooltips
            this.drawTime(first, first.xPosition, second.xPosition, formatted.string, formatted.toolTip);
        }
    }

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
    drawTime(container, left, right, string, toolTip) {
        let dotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        let minArcHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        let fontSize = Preferences.get(Preferences.TIMELINE_FONTSIZE);
        // check to see if we already created the label and the tooltip
        let elem = null;
        let newElem = false;
        if (this.times[container]) {
            elem = this.times[container];
        } else {
            elem = this.document.createXULElement("description");
            newElem = true;
            this.times[container] = elem;
        }

        // calculate position
        let posLeft = (left * this.resize);
        let posTop = (this.top - dotSize / 2 - fontSize) * this.resize - 1;
        let posWidth = ((right - left - dotSize) * this.resize);

        // set style
        elem.style.fontSize = fontSize + "px";
        elem.style.left = posLeft + "px";
        elem.style.position = "relative";
        elem.style.textAlign = "center";
        elem.style.top = posTop + "px";
        elem.style.width = posWidth + "px";
        elem.style.zIndex = "1";

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

        // hide if not enough space (need to show first, otherwise .clientWidth is 0)
        elem.hidden = false;
        if ((elem.clientWidth > Math.floor((right - left) * this.resize)) || (fontSize > minArcHeight * this.resize)) {
            elem.hidden = true;
        } else {
            elem.hidden = false;
        }
    }

    /**
     * Re-Draw the timeline
     * 
     * @param resize
     *            The resize parameter
     * @param top
     *            The top position
     */
    redraw(resize, top) {
        this.resize = resize;
        this.top = top;
        this.draw();
    }
}