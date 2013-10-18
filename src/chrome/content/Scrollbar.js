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
 * Display a simple scrollbar. Don't use normal built-in scrollbars as they are
 * way too large for the visualisation.
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /**
     * Constructor for scrollbar class
     * 
     * @param visualisation
     *            The main visualisation object.
     * @param stack
     *            The stack on which the visualisation is drawn.
     * @param box
     *            The main box.
     * @return A new scrollbar object.
     */
    ThreadVis.Scrollbar = function(visualisation, stack, box) {
        this._visualisation = visualisation;
        this._stack = stack;
        this._box = box;

        this.init(box);

        /**
         * XUL boxes for horizontal scrollbar
         */
        this._boxHorizontal = document
                .getElementById("ThreadVisScrollbarHorizontalBox");
        this._horizontal = document
                .getElementById("ThreadVisScrollbarHorizontal");
        this._arrowLeft = document.getElementById("ThreadVisScrollbarLeft");
        this._arrowRight = document.getElementById("ThreadVisScrollbarRight");

        /**
         * XUL boxes for vertical scrollbar
         */
        this._boxVertical = document
                .getElementById("ThreadVisScrollbarVerticalBox");
        this._vertical = document.getElementById("ThreadVisScrollbarVertical");
        this._arrowDown = document.getElementById("ThreadVisScrollbarDown");
        this._arrowUp = document.getElementById("ThreadVisScrollbarUp");

        // add event listeners
        var ref = this;
        document.addEventListener("mousemove", function(event) {
            ref._onMouseMoveHorizontal(event);
        }, false);
        this._horizontal.addEventListener("mousedown", function(event) {
            ref._onMouseDownHorizontal(event);
        }, false);
        document.addEventListener("mouseup", function(event) {
            ref._onMouseUpHorizontal(event);
        }, false);

        document.addEventListener("mousemove", function(event) {
            ref._onMouseMoveVertical(event);
        }, false);
        this._vertical.addEventListener("mousedown", function(event) {
            ref._onMouseDownVertical(event);
        }, false);
        document.addEventListener("mouseup", function(event) {
            ref._onMouseUpVertical(event);
        }, false);

        // add event listeners for up/down/left/right buttons
        this._arrowUp.addEventListener("click", function(event) {
            clearInterval(ref._upPanInterval);
            ref._panUp();
        }, false);
        this._arrowUp.addEventListener("mousedown", function(event) {
            clearInterval(ref._upPanInterval);
            ref._upPanInterval = setInterval(function() {
                ref._panUp();
            }, 100);
        }, false);
        this._arrowDown.addEventListener("click", function(event) {
            clearInterval(ref._upPanInterval);
            ref._panDown();
        }, false);
        this._arrowDown.addEventListener("mousedown", function(event) {
            clearInterval(ref._downPanInterval);
            ref._downPanInterval = setInterval(function() {
                ref._panDown();
            }, 100);
        }, false);
        this._arrowLeft.addEventListener("click", function(event) {
            clearInterval(ref._upPanInterval);
            ref._panLeft();
        }, false);
        this._arrowLeft.addEventListener("mousedown", function(event) {
            clearInterval(ref._leftPanInterval);
            ref._leftPanInterval = setInterval(function() {
                ref._panLeft();
            }, 100);
        }, false);
        this._arrowRight.addEventListener("click", function(event) {
            clearInterval(ref._upPanInterval);
            ref._panRight();
        }, false);
        this._arrowRight.addEventListener("mousedown", function(event) {
            clearInterval(ref._rightPanInterval);
            ref._rightPanInterval = setInterval(function() {
                ref._panRight();
            }, 100);
        }, false);

        document.addEventListener("mouseup", function(event) {
            clearInterval(ref._upPanInterval);
            clearInterval(ref._downPanInterval);
            clearInterval(ref._leftPanInterval);
            clearInterval(ref._rightPanInterval);
        }, false);

        // on resize, reset size of scrollbars
        window.addEventListener("resize", function(event) {
            ref._resize();
        }, false);
    };

    /**
     * Prototype / instance methods
     */
    ThreadVis.Scrollbar.prototype = {
        /**
         * visualisation object
         */
        _visualisation : null,

        /**
         * XUL stack on which visualisation gets drawn
         */
        _stack : null,

        /**
         * XUL box containing visualisation
         */
        _box : null,

        /**
         * XUL boxes for horizontal scrollbar
         */
        _boxHorizontal : null,
        _horizontal : null,
        _arrowLeft : null,
        _arrowRight : null,

        /**
         * XUL boxes for vertical scrollbar
         */
        _boxVertical : null,
        _vertical : null,
        _arrowDown : null,
        _arrowUp : null,

        /**
         * Pan intervals
         */
        _leftPanInterval : null,
        _upPanInterval : null,
        _downPanInterval : null,
        _rightPanInterval : null,

        _verticalShown : false,
        _horizontalShown : false,

        /**
         * Calculate positions of the scrollbars
         * 
         * @return object.x is the x-position of the horizontal scrollbar
         *         object.y is the y-position of the vertical scrollbar
         */
        _calculatePosition : function() {
            var movedX = Math.abs(parseFloat(this._stack.style.marginLeft));
            var movedY = Math.abs(parseFloat(this._stack.style.marginTop));

            var x = (movedX / this._getStackWidth())
                    * this._getScrollBarHorizontalWidth();
            var y = (movedY / this._getStackHeight())
                    * this._getScrollBarVerticalHeight();

            var position = new Object();
            position.x = x;
            position.y = y;

            return position;
        },

        /**
         * Calculate size of scrollbars. Determine if scrollbars need to be
         * drawn.
         * 
         * @return object.width is the width of the horizontal scrollbar
         *         object.height is the height of the vertical scrollbar
         *         object.hideHorizontal is true to hide the horizontal
         *         scrollbar object.hideVertical is true to hide the vertical
         *         scrollbar
         */
        _calculateSize : function() {
            var width = (this._getTotalWidth() / this._getStackWidth())
                    * this._getScrollBarHorizontalWidth();
            var height = (this._getTotalHeight() / this._getStackHeight())
                    * this._getScrollBarVerticalHeight();

            if (width > this._getScrollBarHorizontalWidth()) {
                width = this._getScrollBarHorizontalWidth();
            }

            if (height > this._getScrollBarVerticalHeight()) {
                height = this._getScrollBarVerticalHeight();
            }

            var hideHorizontal = false;
            if (Math.abs(width - this._getScrollBarHorizontalWidth()) < 2) {
                hideHorizontal = true;
            }

            var hideVertical = false;
            if (Math.abs(height - this._getScrollBarVerticalHeight()) < 2) {
                hideVertical = true;
            }

            var size = new Object();
            size.width = width;
            size.hideHorizontal = hideHorizontal;
            size.height = height;
            size.hideVertical = hideVertical;

            return size;
        },

        /**
         * Draw the scrollbar
         */
        draw : function() {
            this.reset();
            var size = this._calculateSize();
            var position = this._calculatePosition();

            if (size.hideHorizontal) {
                this._boxHorizontal.style.visibility = "hidden";
                this._arrowLeft.style.visibility = "hidden";
                this._arrowRight.style.visibility = "hidden";
            } else {
                this._horizontalShown = true;
                this._boxHorizontal.style.visibility = "visible";
                this._arrowLeft.style.visibility = "visible";
                this._arrowRight.style.visibility = "visible";
                this._horizontal.width = size.width + "px";
                this._horizontal.left = position.x + "px";
            }

            if (size.hideVertical) {
                this._boxVertical.style.visibility = "hidden";
                this._arrowUp.style.visibility = "hidden";
                this._arrowDown.style.visibility = "hidden";
            } else {
                this._verticalShown = true;
                this._boxVertical.style.visibility = "visible";
                this._arrowUp.style.visibility = "visible";
                this._arrowDown.style.visibility = "visible";
                this._vertical.height = size.height + "px";
                this._vertical.top = position.y + "px";
            }
        },

        /**
         * Get width of horizontal scrollbar
         * 
         * @return The width of the horizontal scrollbar in pixel
         */
        _getScrollBarHorizontalWidth : function() {
            return this._boxHorizontal.boxObject.width - 2;
        },

        /**
         * Get vertical scrollbar height
         * 
         * @return The height of the vertical scrollbar in pixel
         */
        _getScrollBarVerticalHeight : function() {
            return this._boxVertical.boxObject.height - 2;
        },

        /**
         * Get height of stack (visualisation)
         * 
         * @return The height of the visualisation stack in pixel
         */
        _getStackHeight : function() {
            return this._stack.boxObject.height;
        },

        /**
         * Get width of stack (visualisation)
         * 
         * @return The width of the visualisation stack in pixel
         */
        _getStackWidth : function() {
            return this._stack.boxObject.width;
        },

        /**
         * Get height of viewport (box)
         * 
         * @return The height of the viewport in pixel
         */
        _getTotalHeight : function() {
            return this._box.boxObject.height;
        },

        /**
         * Get width of viewport (box)
         * 
         * @return The width of the viewport in pixel
         */
        _getTotalWidth : function() {
            return this._box.boxObject.width;
        },

        /**
         * Init height of scrollbars
         * 
         * @param box
         *            The box object (viewport)
         */
        init : function(box) {
            this._box = box;
        },

        /**
         * Return true if scrollbar is shown
         * 
         * @return True if any scrollbar (either horizontal or vertical) is
         *         shown
         */
        isShown : function() {
            return this._verticalShown || this._horizontalShown;
        },

        /**
         * Return true if vertical scrollbar is shown
         * 
         * @return True if the vertical scrollbar is shown, false otherwise
         */
        isShownVertical : function() {
            return this._verticalShown;
        },

        /**
         * Return true if horizontal scrollbar is shown
         * 
         * @return True if the horizontal scrollbar is show, false otherwise
         */
        isShownHorizontal : function() {
            return this._horizontalShown;
        },

        /**
         * React to mousemovement over horizontal scrollbar Do actual scrolling
         * 
         * @param event
         *            The event object
         */
        _onMouseMoveHorizontal : function(event) {
            if (this._panningHorizontal) {
                var x = event.clientX;
                var dx = x - this._startX;
                this._startX = x;
                this._panHorizontal(dx);
            }
        },

        /**
         * React to mousedown event on horizontal scrollbar Start scrolling
         * 
         * @param event
         *            The event object
         */
        _onMouseDownHorizontal : function(event) {
            // only react to left mousebutton
            if (event.button != 0) {
                return;
            }

            this._startX = event.clientX;
            this._panningHorizontal = true;
        },

        /**
         * React to mouseup event on horizontal scrollbar Stop scrolling
         * 
         * @param event
         *            The event object
         */
        _onMouseUpHorizontal : function(event) {
            this._panningHorizontal = false;
        },

        /**
         * React to mousemovement over vertical scrollbar Do actual scrolling
         * 
         * @param event
         *            The event object
         */
        _onMouseMoveVertical : function(event) {
            if (this._panningVertical) {
                var y = event.clientY;
                var dy = y - this._startY;

                this._startY = y;
                this._panVertical(dy);
            }
        },

        /**
         * React to mousedown event on vertical scrollbar Start scrolling
         * 
         * @param event
         *            The event object
         */
        _onMouseDownVertical : function(event) {
            if (event.button != 0) {
                return;
            }

            this._startY = event.clientY;
            this._panningVertical = true;
        },

        /**
         * React to mouseup event on vertical scrollbar Stop scrolling
         * 
         * @param event
         *            The event object
         */
        _onMouseUpVertical : function(event) {
            this._panningVertical = false;
        },

        /**
         * React on click on "down" button Pan vertically by one pixel
         */
        _panDown : function() {
            this._panVertical(1);
        },

        /**
         * Do horizontal panning by dx pixel
         * 
         * @param dx
         *            Amount of panning in pixel
         */
        _panHorizontal : function(dx) {
            var currentX = parseFloat(this._horizontal.left);
            if (currentX == "") {
                currentX = 0;
            }
            dx = parseInt(currentX) + parseInt(dx);

            var barWidth = this._horizontal.boxObject.width;

            if (dx < 0) {
                dx = 0;
            }

            if (dx + barWidth > this._getScrollBarHorizontalWidth()) {
                dx = this._getScrollBarHorizontalWidth() - barWidth;
            }
            this._horizontal.left = dx + "px";

            var multiplicator = -1 * this._getStackWidth()
                    / this._getTotalWidth();

            var position = new Object();
            position.x = dx * multiplicator;
            this._visualisation.moveVisualisationTo(position);
        },

        /**
         * React on click on "left" button Pan left by one pixel
         */
        _panLeft : function() {
            this._panHorizontal(-1);
        },

        /**
         * React on click on "right" button Pan right by one pixel
         */
        _panRight : function() {
            this._panHorizontal(1);
        },

        /**
         * React on click on "up" button Pan up by one pixel
         */
        _panUp : function() {
            this._panVertical(-1);
        },

        /**
         * Do vertical panning by dy pixel
         * 
         * @param dy
         *            The amount to pan in pixel
         */
        _panVertical : function(dy) {
            var currentY = parseFloat(this._vertical.top);
            if (currentY == "") {
                currentY = 0;
            }
            dy = parseInt(currentY) + parseInt(dy);

            var barHeight = this._vertical.boxObject.height;

            if (dy < 0) {
                dy = 0;
            }

            if (dy + barHeight > this._getScrollBarVerticalHeight()) {
                dy = this._getScrollBarVerticalHeight() - barHeight;
            }

            this._vertical.top = dy + "px";

            var boxHeight = this._box.boxObject.height;
            var multiplicator = -1 * this._getStackHeight()
                    / this._getTotalHeight();

            var position = new Object();
            position.y = dy * multiplicator;

            this._visualisation.moveVisualisationTo(position);
        },

        /**
         * Reset size of scrollbar to 0
         */
        reset : function() {
            this._vertical.height = "0px";
            this._vertical.top = "0px";
            this._horizontal.width = "0px";
            this._horizontal.left = "0px";
            this._verticalShown = false;
            this._horizontalShown = false;
        },

        /**
         * Reset size of scrollbar to 0 on window resize. Otherwise, window
         * can't be resized to a size smaller than the scrollbars.
         */
        _resize : function() {
            this.reset();
            this.draw();
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
