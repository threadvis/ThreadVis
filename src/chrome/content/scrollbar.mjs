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
 * Copyright (C) 2007, 2008, 2009,
 *               2010, 2011, 2013, 2018, 2019,
 *               2020, 2021, 2022, 2023, 2024, 2025 Alexander C. Hubmann-Haidvogel
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
 * Display a simple scrollbar. Don't use normal built-in scrollbars as they are way too large for the visualisation.
 **********************************************************************************************************************/

export class Scrollbar {

    /**
     * visualisation object
     */
    #visualisation;

    /**
     * XUL stack on which visualisation gets drawn
     */
    #stack;

    /**
     * XUL box containing visualisation
     */
    #box;

    /**
     * XUL box containing add-on in header
     */
    #outerBox;

    /**
     * XUL boxes for horizontal scrollbar
     */
    #horizontalScrollbar;
    #boxHorizontal;
    #horizontal;

    /**
     * XUL boxes for vertical scrollbar
     */
    #verticalScrollbar;
    #boxVertical;
    #vertical;

    /**
     * Initial state: no scrollbars shown
     */
    #verticalShown = false;
    #horizontalShown = false;

    /**
     * Panning
     */
    #panningHorizontal = false;
    #panningVertical = false;
    #startX;
    #startY;

    /**
     * Constructor for scrollbar class
     * 
     * @param {ThreadVis.Visualisation} visualisation - The main visualisation object.
     * @param {DOMWindow} window - The current window
     * @param {XULStack} stack - The stack on which the visualisation is drawn.
     * @param {XULBox} box - The main box.
     * @param {XULBox} outerBox - The main outer box.
     * @return A new scrollbar object.
     */
    constructor(visualisation, window, stack, box, outerBox) {
        Object.seal(this);
        this.#visualisation = visualisation;
        this.#stack = stack;
        this.#box = box;
        this.#outerBox = outerBox;

        // XUL boxes for horizontal scrollbar
        this.#horizontalScrollbar = window.document.getElementById("ThreadVisHorizontalScrollbar");
        this.#boxHorizontal = window.document.getElementById("ThreadVisScrollbarHorizontalBox");
        this.#horizontal = window.document.getElementById("ThreadVisScrollbarHorizontal");

        // XUL boxes for vertical scrollbar
        this.#verticalScrollbar = window.document.getElementById("ThreadVisVerticalScrollbar");
        this.#boxVertical = window.document.getElementById("ThreadVisScrollbarVerticalBox");
        this.#vertical = window.document.getElementById("ThreadVisScrollbarVertical");

        // add event listeners
        window.document.addEventListener("mousemove", (event) => this.#onMouseMoveHorizontal(event), false);
        this.#horizontal.addEventListener("mousedown", (event) => this.#onMouseDownHorizontal(event), false);
        window.document.addEventListener("mouseup", (event) => this.#onMouseUpHorizontal(event), false);

        window.document.addEventListener("mousemove", (event) => this.#onMouseMoveVertical(event), false);
        this.#vertical.addEventListener("mousedown", (event) => this.#onMouseDownVertical(event), false);
        window.document.addEventListener("mouseup", (event) => this.#onMouseUpVertical(event), false);
    }

    /**
     * Calculate positions of the scrollbars
     * 
     * @return {Object}
     *         object.x - the x-position of the horizontal scrollbar
     *         object.y - the y-position of the vertical scrollbar
     */
    #calculatePosition() {
        const movedX = Math.abs(parseFloat(this.#stack.style.left));
        const movedY = Math.abs(parseFloat(this.#stack.style.top));

        const x = (movedX / this.#stackWidth) * this.#scrollBarHorizontalWidth;
        const y = (movedY / this.#stackHeight) * this.#scrollBarVerticalHeight;

        return {
            x,
            y
        };
    }

    /**
     * Calculate size of scrollbars. Determine if scrollbars need to be drawn.
     * 
     * @return {Object}
     *         object.width - the width of the horizontal scrollbar
     *         object.height - the height of the vertical scrollbar
     *         object.hideHorizontal - true to hide the horizontal scrollbar
     *         object.hideVertical - true to hide the vertical scrollbar
     */
    #calculateSize() {
        let width = (this.#totalWidth / this.#stackWidth) * this.#scrollBarHorizontalWidth;
        let height = (this.#totalHeight / this.#stackHeight) * this.#scrollBarVerticalHeight;

        // check for meaningful values
        if (isNaN(width) || isNaN(height)) {
            return {
                width: 0,
                hideHorizontal: true,
                height: 0,
                hideVertical: true
            };
        }

        width = Math.min(width, this.#scrollBarHorizontalWidth);
        height = Math.min(height, this.#scrollBarVerticalHeight);

        let hideHorizontal = false;
        if (Math.abs(width - this.#scrollBarHorizontalWidth) < 2) {
            hideHorizontal = true;
        }

        let hideVertical = false;
        if (Math.abs(height - this.#scrollBarVerticalHeight) < 2) {
            hideVertical = true;
        }

        return {
            width,
            hideHorizontal,
            height,
            hideVertical
        };
    }

    /**
     * Draw the scrollbar
     */
    draw() {
        this.#reset();
        const size = this.#calculateSize();
        const position = this.#calculatePosition();

        if (size.hideHorizontal) {
            this.#horizontalScrollbar.style.visibility = "hidden";
        } else {
            this.#horizontalShown = true;
            this.#horizontalScrollbar.style.visibility = null;
            this.#horizontal.style.width = `${size.width}px`;
            this.#horizontal.style.left = `${position.x}px`;
        }

        if (size.hideVertical) {
            this.#verticalScrollbar.style.visibility = "hidden";
        } else {
            this.#verticalShown = true;
            this.#verticalScrollbar.style.visibility = null;
            this.#vertical.style.height = `${size.height}px`;
            this.#vertical.style.top = `${position.y}px`;
        }
    }

    /**
     * Get width of horizontal scrollbar
     * 
     * @return {Number} - The width of the horizontal scrollbar in pixel
     */
    get #scrollBarHorizontalWidth() {
        return Math.max(this.#boxHorizontal.clientWidth, 0);
    }

    /**
     * Get vertical scrollbar height
     * 
     * @return {Number} - The height of the vertical scrollbar in pixel
     */
    get #scrollBarVerticalHeight() {
        return Math.max(this.#boxVertical.clientHeight, 0);
    }

    /**
     * Get height of stack (visualisation)
     * 
     * @return {Number} - The height of the visualisation stack in pixel
     */
    get #stackHeight() {
        return this.#stack.scrollHeight;
    }

    /**
     * Get width of stack (visualisation)
     * 
     * @return {Number} - The width of the visualisation stack in pixel
     */
    get #stackWidth() {
        return this.#stack.scrollWidth;
    }

    /**
     * Get height of viewport (box)
     * 
     * @return {Number} - The height of the viewport in pixel
     */
    get #totalHeight() {
        return this.#box.clientHeight;
    }

    /**
     * Get width of viewport (box)
     * 
     * @return {Number} - The width of the viewport in pixel
     */
    get #totalWidth() {
        return this.#box.clientWidth;
    }

    /**
     * Return true if scrollbar is shown
     * 
     * @return {Boolean} - True if any scrollbar (either horizontal or vertical) is shown
     */
    get isShown() {
        return this.#verticalShown || this.#horizontalShown;
    }

    /**
     * Return true if vertical scrollbar is shown
     * 
     * @return {Boolean} - True if the vertical scrollbar is shown, false otherwise
     */
    get isShownVertical() {
        return this.#verticalShown;
    }

    /**
     * Return true if horizontal scrollbar is shown
     * 
     * @return {Boolean} - True if the horizontal scrollbar is show, false otherwise
     */
    get isShownHorizontal() {
        return this.#horizontalShown;
    }

    /**
     * React to mousemovement over horizontal scrollbar Do actual scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    #onMouseMoveHorizontal(event) {
        if (this.#panningHorizontal) {
            const x = event.screenX;
            const dx = x - this.#startX;
            this.#startX = x;
            this.#panHorizontal(dx);
        }
    }

    /**
     * React to mousedown event on horizontal scrollbar Start scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    #onMouseDownHorizontal(event) {
        // only react to left mousebutton
        if (event.button !== 0) {
            return;
        }

        this.#startX = event.screenX;
        this.#panningHorizontal = true;
        this.#outerBox.classList.add("hover");
    }

    /**
     * React to mouseup event on horizontal scrollbar Stop scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    #onMouseUpHorizontal(event) {
        this.#panningHorizontal = false;
    }

    /**
     * React to mousemovement over vertical scrollbar Do actual scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    #onMouseMoveVertical(event) {
        if (this.#panningVertical) {
            const y = event.screenY;
            const dy = y - this.#startY;

            this.#startY = y;
            this.#panVertical(dy);
        }
    }

    /**
     * React to mousedown event on vertical scrollbar Start scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    #onMouseDownVertical(event) {
        if (event.button !== 0) {
            return;
        }

        this.#startY = event.screenY;
        this.#panningVertical = true;
        this.#outerBox.classList.add("hover");
    }

    /**
     * React to mouseup event on vertical scrollbar Stop scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    #onMouseUpVertical(event) {
        this.#panningVertical = false;
    }

    /**
     * Do horizontal panning by dx pixel
     * 
     * @param {Number} dx - Amount of panning in pixel
     */
    #panHorizontal(dx) {
        let currentX = parseFloat(this.#horizontal.style.left);
        if (currentX === "") {
            currentX = 0;
        }
        dx = parseInt(currentX) + parseInt(dx);

        const barWidth = this.#horizontal.clientWidth;

        if (dx < 0) {
            dx = 0;
        }

        if (dx + barWidth > this.#scrollBarHorizontalWidth) {
            dx = this.#scrollBarHorizontalWidth - barWidth;
        }
        this.#horizontal.style.left = dx + "px";

        const multiplicator = -1 * this.#stackWidth / this.#totalWidth;

        const position = {
            "x": dx * multiplicator
        };
        this.#visualisation.moveVisualisationTo(position);
    }

    /**
     * Do vertical panning by dy pixel
     * 
     * @param {Number} dy - The amount to pan in pixel
     */
    #panVertical(dy) {
        let currentY = parseFloat(this.#vertical.style.top);
        if (currentY === "") {
            currentY = 0;
        }

        dy = parseInt(currentY) + parseInt(dy);

        const barHeight = this.#vertical.clientHeight;

        if (dy < 0) {
            dy = 0;
        }

        if (dy + barHeight > this.#scrollBarVerticalHeight) {
            dy = this.#scrollBarVerticalHeight - barHeight;
        }

        this.#vertical.style.top = dy + "px";

        const multiplicator = -1 * this.#stackHeight / this.#totalHeight;

        let position = {
            "y": dy * multiplicator
        };
        this.#visualisation.moveVisualisationTo(position);
    }

    /**
     * Reset size of scrollbar to 0
     */
    #reset() {
        this.#vertical.style.height = "0px";
        this.#vertical.style.top = "0px";
        this.#horizontal.style.width = "0px";
        this.#horizontal.style.left = "0px";
        this.#verticalShown = false;
        this.#horizontalShown = false;
    }

    /**
     * Reset size of scrollbar to 0 on window resize. Otherwise, window
     * can't be resized to a size smaller than the scrollbars.
     */
    #resize() {
        this.#reset();
        this.draw();
    }
}