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
 * Draw the timeline.
 **********************************************************************************************************************/

import { Preferences } from "./utils/preferences.mjs";
import { formatTimeDifference } from "./utils/date.mjs";

export class Timeline {

    /**
     * XUL/DOM document to draw in
     */
    #document;

    /**
     * XUL stack to draw timeline on
     */
    #stack;

    /**
     * current thread
     */
    #thread;

    /**
     * resize multiplicator
     */
    #resize;

    /**
     * top position of center of visualisation in px
     */
    #top;

    /**
     * cache timing info for containers
     */
    #times = {};

    /**
     * Constructor for timeline class
     * 
     * @param {DOMDocument} document - The document to draw in
     * @param {XULStack} stack - The stack to draw the timeline on
     * @param {ThreadVis.Thread} thread - The current thread
     * @param {Number} resize - The resize parameter [0..1]
     * @param {Number} top - The top position of the timeline
     * @return A new timeline object
     */
    constructor(document, stack, thread, resize, top) {
        Object.seal(this);
        this.#document = document;
        this.#stack = stack;
        this.#thread = thread;
        this.#resize = resize;
        this.#top = top;
    }

    /**
     * Draw the timeline
     */
    draw() {
        // start with second container
        const containers = this.#thread.containers;
        for (let i = 1; i < containers.length; i++) {
            // look at two adjacent containers
            const first = containers[i - 1];
            const second = containers[i];

            // don't calculate time if one of them does not have a message
            if (!first.message || !second.message) {
                continue;
            }

            const timeDifference = first.timeDifference;

            // get the formatted strings
            const formatted = formatTimeDifference(timeDifference);

            // draw the labels and tooltips
            this.#drawTime(first.id, first.x, second.x, formatted.string, formatted.toolTip);
        }
    }

    /**
     * Draw the label and the tooltip
     * 
     * @param {ThreadVis.Container.Id} containerId - The container to draw
     * @param {Number} left - The left position
     * @param {Number} right - The right position
     * @param {String} string - The string to display
     * @param {String} toolTip - The tooltip to add
     */
    #drawTime(containerId, left, right, string, toolTip) {
        const dotSize = Preferences.get(Preferences.VIS_DOTSIZE);
        const minArcHeight = Preferences.get(Preferences.VIS_ARC_MINHEIGHT);
        const fontSize = Preferences.get(Preferences.TIMELINE_FONTSIZE);

        // check to see if we already created the label and the tooltip
        let elem = null;
        let wrapperElem = null;
        if (this.#times[containerId]) {
            ({ elem, wrapperElem } = this.#times[containerId]);
        } else {
            elem = this.#document.createXULElement("description");
            elem.style.display = "inline-block";
            wrapperElem = this.#document.createElement("div");
            wrapperElem.classList.add("timeline", "wrapper");
            this.#times[containerId] = { elem, wrapperElem };

            // and add to stack only if we just created the element
            this.#stack.appendChild(wrapperElem);
            wrapperElem.appendChild(elem);

            // prevent mousedown event from bubbling to box object
            // prevent dragging of visualisation by clicking on message
            elem.addEventListener("mousedown", (event) => event.stopPropagation(), true);
        }

        // calculate position
        const posLeft = (left + dotSize / 2) * this.#resize;
        const posTop = (this.#top - dotSize / 2 - fontSize) * this.#resize - 1;
        const posWidth = ((right - left - dotSize) * this.#resize);

        // set style
        elem.style.fontSize = `${fontSize}px`;
        wrapperElem.style.left = `${posLeft}px`;
        wrapperElem.style.top = `${posTop}px`;
        wrapperElem.style.width = `${posWidth}px`;

        elem.setAttribute("value", string);
        elem.setAttribute("tooltiptext", toolTip);

        // force-show wrapper elem to calculate size
        wrapperElem.style.display = "flex";

        if ((elem.clientWidth > wrapperElem.clientWidth) || (fontSize > minArcHeight * this.#resize)) {
            wrapperElem.style.display = "none";
        } else {
            // not hidden, enough space. assign correct width to center text
            wrapperElem.style.display = "flex";
        }
    }

    /**
     * Re-Draw the timeline
     *
     * @param {ThreadVis.Thread} thread - The current thread
     * @param {Number} resize - The resize parameter
     * @param {Number} top - The top position
     */
    redraw(thread, resize, top) {
        this.#thread = thread;
        this.#resize = resize;
        this.#top = top;
        this.draw();
    }
}