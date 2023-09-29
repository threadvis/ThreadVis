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
 * Display a simple scrollbar. Don't use normal built-in scrollbars as they are way too large for the visualisation.
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "Scrollbar" ];

class Scrollbar {
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
        /**
         * DOM/XUL window to render in
         */
        this.window = window;

        /**
         * DOM/XUL document to render in
         */
        this.document = window.document;

        /**
         * visualisation object
         */
        this.visualisation = visualisation;

        /**
         * XUL stack on which visualisation gets drawn
         */
        this.stack = stack;

        /**
         * XUL box containing visualisation
         */
        this.box = box;

        /**
         * XUL box containing add-on in header
         */
        this.outerBox = outerBox;

        /**
         * XUL boxes for horizontal scrollbar
         */
        this.horizontalScrollbar = this.document.getElementById("ThreadVisHorizontalScrollbar");
        this.boxHorizontal = this.document.getElementById("ThreadVisScrollbarHorizontalBox");
        this.horizontal = this.document.getElementById("ThreadVisScrollbarHorizontal");

        /**
         * XUL boxes for vertical scrollbar
         */
        this.verticalScrollbar = this.document.getElementById("ThreadVisVerticalScrollbar");
        this.boxVertical = this.document.getElementById("ThreadVisScrollbarVerticalBox");
        this.vertical = this.document.getElementById("ThreadVisScrollbarVertical");

        // add event listeners
        this.document.addEventListener("mousemove", (event) => this.onMouseMoveHorizontal(event), false);
        this.horizontal.addEventListener("mousedown", (event) => this.onMouseDownHorizontal(event), false);
        this.document.addEventListener("mouseup", (event) => this.onMouseUpHorizontal(event), false);

        this.document.addEventListener("mousemove", (event) => this.onMouseMoveVertical(event), false);
        this.vertical.addEventListener("mousedown", (event) => this.onMouseDownVertical(event), false);
        this.document.addEventListener("mouseup", (event) => this.onMouseUpVertical(event), false);

        // add event listeners for up/down/left/right buttons
        /**
         * Pan intervals
         */
        this.leftPanInterval = null;
        this.upPanInterval = null;
        this.downPanInterval = null;
        this.rightPanInterval = null;

        this.document.addEventListener("mouseup", (event) => {
            this.window.clearInterval(this.upPanInterval);
            this.window.clearInterval(this.downPanInterval);
            this.window.clearInterval(this.leftPanInterval);
            this.window.clearInterval(this.rightPanInterval);
        }, false);

        // on resize, reset size of scrollbars
        //this.window.addEventListener("resize", (event) => { console.log(event); /*this.resize()*/}, false);

        /**
         * Initial state: no scrollbars shown
         */
        this.verticalShown = false;
        this.horizontalShown = false;
    }

    /**
     * Calculate positions of the scrollbars
     * 
     * @return {Object}
     *         object.x - the x-position of the horizontal scrollbar
     *         object.y - the y-position of the vertical scrollbar
     */
    calculatePosition() {
        const movedX = Math.abs(parseFloat(this.stack.style.left));
        const movedY = Math.abs(parseFloat(this.stack.style.top));

        const x = (movedX / this.getStackWidth()) * this.getScrollBarHorizontalWidth();
        const y = (movedY / this.getStackHeight()) * this.getScrollBarVerticalHeight();

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
    calculateSize() {
        let width = (this.getTotalWidth() / this.getStackWidth()) * this.getScrollBarHorizontalWidth();
        let height = (this.getTotalHeight() / this.getStackHeight()) * this.getScrollBarVerticalHeight();

        // check for meaningful values
        if (isNaN(width) || isNaN(height)) {
            return {
                width: 0,
                hideHorizontal: true,
                height: 0,
                hideVertical: true
            };
        }

        width = Math.min(width, this.getScrollBarHorizontalWidth());
        height = Math.min(height, this.getScrollBarVerticalHeight());

        let hideHorizontal = false;
        if (Math.abs(width - this.getScrollBarHorizontalWidth()) < 2) {
            hideHorizontal = true;
        }

        let hideVertical = false;
        if (Math.abs(height - this.getScrollBarVerticalHeight()) < 2) {
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
        this.reset();
        const size = this.calculateSize();
        const position = this.calculatePosition();

        if (size.hideHorizontal) {
            this.horizontalScrollbar.style.visibility = "hidden";
        } else {
            this.horizontalShown = true;
            this.horizontalScrollbar.style.visibility = null;
            this.horizontal.style.width = size.width + "px";
            this.horizontal.style.left = position.x + "px";
        }

        if (size.hideVertical) {
            this.verticalScrollbar.style.visibility = "hidden";
        } else {
            this.verticalShown = true;
            this.verticalScrollbar.style.visibility = null;
            this.vertical.style.height = size.height + "px";
            this.vertical.style.top = position.y + "px";
        }
    }

    /**
     * Get width of horizontal scrollbar
     * 
     * @return {Number} - The width of the horizontal scrollbar in pixel
     */
    getScrollBarHorizontalWidth() {
        return Math.max(this.boxHorizontal.clientWidth, 0);
    }

    /**
     * Get vertical scrollbar height
     * 
     * @return {Number} - The height of the vertical scrollbar in pixel
     */
    getScrollBarVerticalHeight() {
        return Math.max(this.boxVertical.clientHeight, 0);
    }

    /**
     * Get height of stack (visualisation)
     * 
     * @return {Number} - The height of the visualisation stack in pixel
     */
    getStackHeight() {
        return this.stack.scrollHeight;
    }

    /**
     * Get width of stack (visualisation)
     * 
     * @return {Number} - The width of the visualisation stack in pixel
     */
    getStackWidth() {
        return this.stack.scrollWidth;
    }

    /**
     * Get height of viewport (box)
     * 
     * @return {Number} - The height of the viewport in pixel
     */
    getTotalHeight() {
        return this.box.clientHeight;
    }

    /**
     * Get width of viewport (box)
     * 
     * @return {Number} - The width of the viewport in pixel
     */
    getTotalWidth() {
        return this.box.clientWidth;
    }

    /**
     * Return true if scrollbar is shown
     * 
     * @return {Boolean} - True if any scrollbar (either horizontal or vertical) is shown
     */
    isShown() {
        return this.verticalShown || this.horizontalShown;
    }

    /**
     * Return true if vertical scrollbar is shown
     * 
     * @return {Boolean} - True if the vertical scrollbar is shown, false otherwise
     */
    isShownVertical() {
        return this.verticalShown;
    }

    /**
     * Return true if horizontal scrollbar is shown
     * 
     * @return {Boolean} - True if the horizontal scrollbar is show, false otherwise
     */
    isShownHorizontal() {
        return this.horizontalShown;
    }

    /**
     * React to mousemovement over horizontal scrollbar Do actual scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    onMouseMoveHorizontal(event) {
        if (this.panningHorizontal) {
            const x = event.screenX;
            const dx = x - this.startX;
            this.startX = x;
            this.panHorizontal(dx);
        }
    }

    /**
     * React to mousedown event on horizontal scrollbar Start scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    onMouseDownHorizontal(event) {
        // only react to left mousebutton
        if (event.button != 0) {
            return;
        }

        this.startX = event.screenX;
        this.panningHorizontal = true;
        this.outerBox.classList.add("hover");
    }

    /**
     * React to mouseup event on horizontal scrollbar Stop scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    onMouseUpHorizontal(event) {
        this.panningHorizontal = false;
    }

    /**
     * React to mousemovement over vertical scrollbar Do actual scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    onMouseMoveVertical(event) {
        if (this.panningVertical) {
            const y = event.screenY;
            const dy = y - this.startY;

            this.startY = y;
            this.panVertical(dy);
        }
    }

    /**
     * React to mousedown event on vertical scrollbar Start scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    onMouseDownVertical(event) {
        if (event.button != 0) {
            return;
        }

        this.startY = event.screenY;
        this.panningVertical = true;
        this.outerBox.classList.add("hover");
    }

    /**
     * React to mouseup event on vertical scrollbar Stop scrolling
     * 
     * @param {DOMEvent} event - The event object
     */
    onMouseUpVertical(event) {
        this.panningVertical = false;
    }

    /**
     * React on click on "down" button Pan vertically by one pixel
     */
    panDown() {
        this.panVertical(1);
    }

    /**
     * Do horizontal panning by dx pixel
     * 
     * @param {Number} dx - Amount of panning in pixel
     */
    panHorizontal(dx) {
        let currentX = parseFloat(this.horizontal.style.left);
        if (currentX == "") {
            currentX = 0;
        }
        dx = parseInt(currentX) + parseInt(dx);

        const barWidth = this.horizontal.clientWidth;

        if (dx < 0) {
            dx = 0;
        }

        if (dx + barWidth > this.getScrollBarHorizontalWidth()) {
            dx = this.getScrollBarHorizontalWidth() - barWidth;
        }
        this.horizontal.style.left = dx + "px";

        const multiplicator = -1 * this.getStackWidth() / this.getTotalWidth();

        const position = {
            "x": dx * multiplicator
        };
        this.visualisation.moveVisualisationTo(position);
    }

    /**
     * React on click on "left" button Pan left by one pixel
     */
    panLeft() {
        this.panHorizontal(-1);
    }

    /**
     * React on click on "right" button Pan right by one pixel
     */
    panRight() {
        this.panHorizontal(1);
    }

    /**
     * React on click on "up" button Pan up by one pixel
     */
    panUp() {
        this.panVertical(-1);
    }

    /**
     * Do vertical panning by dy pixel
     * 
     * @param {Number} dy - The amount to pan in pixel
     */
    panVertical(dy) {
        let currentY = parseFloat(this.vertical.style.top);
        if (currentY == "") {
            currentY = 0;
        }

        dy = parseInt(currentY) + parseInt(dy);

        const barHeight = this.vertical.clientHeight;

        if (dy < 0) {
            dy = 0;
        }

        if (dy + barHeight > this.getScrollBarVerticalHeight()) {
            dy = this.getScrollBarVerticalHeight() - barHeight;
        }

        this.vertical.style.top = dy + "px";

        const multiplicator = -1 * this.getStackHeight() / this.getTotalHeight();

        let position = {
            "y": dy * multiplicator
        };
        this.visualisation.moveVisualisationTo(position);
    }

    /**
     * Reset size of scrollbar to 0
     */
    reset() {
        this.vertical.style.height = "0px";
        this.vertical.style.top = "0px";
        this.horizontal.style.width = "0px";
        this.horizontal.style.left = "0px";
        this.verticalShown = false;
        this.horizontalShown = false;
    }

    /**
     * Reset size of scrollbar to 0 on window resize. Otherwise, window
     * can't be resized to a size smaller than the scrollbars.
     */
    resize() {
        this.reset();
        this.draw();
    }
}