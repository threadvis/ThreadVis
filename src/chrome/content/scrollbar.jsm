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
     * @param visualisation
     *            The main visualisation object.
     * @param window
     *            The current window
     * @param stack
     *            The stack on which the visualisation is drawn.
     * @param box
     *            The main box.
     * @return A new scrollbar object.
     */
    constructor(visualisation, window, stack, box) {
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

        this.init(box);

        /**
         * XUL boxes for horizontal scrollbar
         */
        this.horizontalScrollbar = this.document.getElementById("ThreadVisHorizontalScrollbar");
        this.boxHorizontal = this.document.getElementById("ThreadVisScrollbarHorizontalBox");
        this.horizontal = this.document.getElementById("ThreadVisScrollbarHorizontal");
        this.arrowLeft = this.document.getElementById("ThreadVisScrollbarLeft");
        this.arrowRight = this.document.getElementById("ThreadVisScrollbarRight");

        /**
         * XUL boxes for vertical scrollbar
         */
        this.verticalScrollbar = this.document.getElementById("ThreadVisVerticalScrollbar");
        this.boxVertical = this.document.getElementById("ThreadVisScrollbarVerticalBox");
        this.vertical = this.document.getElementById("ThreadVisScrollbarVertical");
        this.arrowDown = this.document.getElementById("ThreadVisScrollbarDown");
        this.arrowUp = this.document.getElementById("ThreadVisScrollbarUp");

        // add event listeners
        let ref = this;
        this.document.addEventListener("mousemove", function(event) {
            ref.onMouseMoveHorizontal(event);
        }, false);
        this.horizontal.addEventListener("mousedown", function(event) {
            ref.onMouseDownHorizontal(event);
        }, false);
        this.document.addEventListener("mouseup", function(event) {
            ref.onMouseUpHorizontal(event);
        }, false);

        this.document.addEventListener("mousemove", function(event) {
            ref.onMouseMoveVertical(event);
        }, false);
        this.vertical.addEventListener("mousedown", function(event) {
            ref.onMouseDownVertical(event);
        }, false);
        this.document.addEventListener("mouseup", function(event) {
            ref.onMouseUpVertical(event);
        }, false);

        // add event listeners for up/down/left/right buttons
        /**
         * Pan intervals
         */
        this.leftPanInterval = null;
        this.upPanInterval = null;
        this.downPanInterval = null;
        this.rightPanInterval = null;

        this.arrowUp.addEventListener("click", function(event) {
            clearInterval(ref.upPanInterval);
            ref.panUp();
        }, false);
        this.arrowUp.addEventListener("mousedown", function(event) {
            clearInterval(ref.upPanInterval);
            ref.upPanInterval = setInterval(function() {
                ref.panUp();
            }, 100);
        }, false);
        this.arrowDown.addEventListener("click", function(event) {
            clearInterval(ref.upPanInterval);
            ref.panDown();
        }, false);
        this.arrowDown.addEventListener("mousedown", function(event) {
            clearInterval(ref.downPanInterval);
            ref.downPanInterval = setInterval(function() {
                ref.panDown();
            }, 100);
        }, false);
        this.arrowLeft.addEventListener("click", function(event) {
            clearInterval(ref.upPanInterval);
            ref.panLeft();
        }, false);
        this.arrowLeft.addEventListener("mousedown", function(event) {
            clearInterval(ref.leftPanInterval);
            ref.leftPanInterval = setInterval(function() {
                ref.panLeft();
            }, 100);
        }, false);
        this.arrowRight.addEventListener("click", function(event) {
            ref.window.clearInterval(ref.upPanInterval);
            ref.panRight();
        }, false);
        this.arrowRight.addEventListener("mousedown", function(event) {
            ref.window.clearInterval(ref.rightPanInterval);
            ref.rightPanInterval = setInterval(function() {
                ref.panRight();
            }, 100);
        }, false);

        this.document.addEventListener("mouseup", function(event) {
            ref.window.clearInterval(ref.upPanInterval);
            ref.window.clearInterval(ref.downPanInterval);
            ref.window.clearInterval(ref.leftPanInterval);
            ref.window.clearInterval(ref.rightPanInterval);
        }, false);

        // on resize, reset size of scrollbars
        this.window.addEventListener("resize", function(event) {
            ref.resize();
        }, false);

        /**
         * Initial state: no scrollbars shown
         */
        this.verticalShown = false;
        this.horizontalShown = false;
    }

    /**
     * Calculate positions of the scrollbars
     * 
     * @return object.x is the x-position of the horizontal scrollbar
     *         object.y is the y-position of the vertical scrollbar
     */
    calculatePosition() {
        let movedX = Math.abs(parseFloat(this.stack.style.marginLeft));
        let movedY = Math.abs(parseFloat(this.stack.style.marginTop));

        let x = (movedX / this.getStackWidth()) * this.getScrollBarHorizontalWidth();
        let y = (movedY / this.getStackHeight()) * this.getScrollBarVerticalHeight();

        let position = new Object();
        position.x = x;
        position.y = y;

        return position;
    }

    /**
     * Calculate size of scrollbars. Determine if scrollbars need to be drawn.
     * 
     * @return object.width is the width of the horizontal scrollbar
     *         object.height is the height of the vertical scrollbar
     *         object.hideHorizontal is true to hide the horizontal scrollbar
     *         object.hideVertical is true to hide the vertical scrollbar
     */
    calculateSize() {
        let width = (this.getTotalWidth() / this.getStackWidth()) * this.getScrollBarHorizontalWidth();
        let height = (this.getTotalHeight() / this.getStackHeight()) * this.getScrollBarVerticalHeight();

        if (width > this.getScrollBarHorizontalWidth()) {
            width = this.getScrollBarHorizontalWidth();
        }

        if (height > this.getScrollBarVerticalHeight()) {
            height = this.getScrollBarVerticalHeight();
        }

        let hideHorizontal = false;
        if (Math.abs(width - this.getScrollBarHorizontalWidth()) < 2) {
            hideHorizontal = true;
        }

        let hideVertical = false;
        if (Math.abs(height - this.getScrollBarVerticalHeight()) < 2) {
            hideVertical = true;
        }

        return {
            "width":  width,
            "hideHorizontal": hideHorizontal,
            "height": height,
            "hideVertical": hideVertical
        };
    }

    /**
     * Draw the scrollbar
     */
    draw() {
        this.reset();
        let size = this.calculateSize();
        let position = this.calculatePosition();

        if (size.hideHorizontal) {
            this.horizontalScrollbar.style.visibility = "hidden";
        } else {
            this.horizontalShown = true;
            this.horizontalScrollbar.style.visibility = "visible";
            this.horizontal.style.width = size.width + "px";
            this.horizontal.style.left = position.x + "px";
        }

        if (size.hideVertical) {
            this.verticalScrollbar.style.visibility = "hidden";
        } else {
            this.verticalShown = true;
            this.verticalScrollbar.style.visibility = "visible";
            this.vertical.style.height = size.height + "px";
            this.vertical.style.top = position.y + "px";
        }
    }

    /**
     * Get width of horizontal scrollbar
     * 
     * @return The width of the horizontal scrollbar in pixel
     */
    getScrollBarHorizontalWidth() {
        return this.boxHorizontal.clientWidth - 2;
    }

    /**
     * Get vertical scrollbar height
     * 
     * @return The height of the vertical scrollbar in pixel
     */
    getScrollBarVerticalHeight() {
        return this.boxVertical.clientHeight - 2;
    }

    /**
     * Get height of stack (visualisation)
     * 
     * @return The height of the visualisation stack in pixel
     */
    getStackHeight() {
        return this.stack.scrollHeight;
    }

    /**
     * Get width of stack (visualisation)
     * 
     * @return The width of the visualisation stack in pixel
     */
    getStackWidth() {
        return this.stack.scrollWidth;
    }

    /**
     * Get height of viewport (box)
     * 
     * @return The height of the viewport in pixel
     */
    getTotalHeight() {
        return this.box.clientHeight;
    }

    /**
     * Get width of viewport (box)
     * 
     * @return The width of the viewport in pixel
     */
    getTotalWidth() {
        return this.box.clientWidth;
    }

    /**
     * Init height of scrollbars
     * 
     * @param box
     *            The box object (viewport)
     */
    init(box) {
        this.box = box;
    }

    /**
     * Return true if scrollbar is shown
     * 
     * @return True if any scrollbar (either horizontal or vertical) is shown
     */
    isShown() {
        return this.verticalShown || this.horizontalShown;
    }

    /**
     * Return true if vertical scrollbar is shown
     * 
     * @return True if the vertical scrollbar is shown, false otherwise
     */
    isShownVertical() {
        return this.verticalShown;
    }

    /**
     * Return true if horizontal scrollbar is shown
     * 
     * @return True if the horizontal scrollbar is show, false otherwise
     */
    isShownHorizontal() {
        return this.horizontalShown;
    }

    /**
     * React to mousemovement over horizontal scrollbar Do actual scrolling
     * 
     * @param event
     *            The event object
     */
    onMouseMoveHorizontal(event) {
        if (this.panningHorizontal) {
            let x = event.clientX;
            let dx = x - this.startX;
            this.startX = x;
            this.panHorizontal(dx);
        }
    }

    /**
     * React to mousedown event on horizontal scrollbar Start scrolling
     * 
     * @param event
     *            The event object
     */
    onMouseDownHorizontal(event) {
        // only react to left mousebutton
        if (event.button != 0) {
            return;
        }

        this.startX = event.clientX;
        this.panningHorizontal = true;
    }

    /**
     * React to mouseup event on horizontal scrollbar Stop scrolling
     * 
     * @param event
     *            The event object
     */
    onMouseUpHorizontal(event) {
        this.panningHorizontal = false;
    }

    /**
     * React to mousemovement over vertical scrollbar Do actual scrolling
     * 
     * @param event
     *            The event object
     */
    onMouseMoveVertical(event) {
        if (this.panningVertical) {
            let y = event.clientY;
            let dy = y - this.startY;

            this.startY = y;
            this.panVertical(dy);
        }
    }

    /**
     * React to mousedown event on vertical scrollbar Start scrolling
     * 
     * @param event
     *            The event object
     */
    onMouseDownVertical(event) {
        if (event.button != 0) {
            return;
        }

        this.startY = event.clientY;
        this.panningVertical = true;
    }

    /**
     * React to mouseup event on vertical scrollbar Stop scrolling
     * 
     * @param event
     *            The event object
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
     * @param dx
     *            Amount of panning in pixel
     */
    panHorizontal(dx) {
        let currentX = parseFloat(this.horizontal.style.left);
        if (currentX == "") {
            currentX = 0;
        }
        dx = parseInt(currentX) + parseInt(dx);

        let barWidth = this.horizontal.clientWidth;

        if (dx < 0) {
            dx = 0;
        }

        if (dx + barWidth > this.getScrollBarHorizontalWidth()) {
            dx = this.getScrollBarHorizontalWidth() - barWidth;
        }
        this.horizontal.style.left = dx + "px";

        let multiplicator = -1 * this.getStackWidth() / this.getTotalWidth();

        let position = {
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
     * @param dy
     *            The amount to pan in pixel
     */
    panVertical(dy) {
        let currentY = parseFloat(this.vertical.style.top);
        if (currentY == "") {
            currentY = 0;
        }

        dy = parseInt(currentY) + parseInt(dy);

        let barHeight = this.vertical.clientHeight;

        if (dy < 0) {
            dy = 0;
        }

        if (dy + barHeight > this.getScrollBarVerticalHeight()) {
            dy = this.getScrollBarVerticalHeight() - barHeight;
        }

        this.vertical.style.top = dy + "px";

        let multiplicator = -1 * this.getStackHeight() / this.getTotalHeight();

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