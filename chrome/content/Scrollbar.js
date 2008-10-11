/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2006-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Display a simple scrollbar. Don't use normal built-in scrollbars as they are
 * way too large for the visualisation.
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor for scrollbar class
 *
 * @param visualisation
 *          The main visualisation object.
 * @param stack
 *          The stack on which the visualisation is drawn.
 * @param box
 *          The main box.
 * @return
 *          A new scrollbar object.
 ******************************************************************************/
ThreadVisNS.Scrollbar = function(visualisation, stack, box) {
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
     * XUL boxes for horizontal scrollbar
     */
    this.boxHorizontal = document.getElementById("ThreadVisScrollbarHorizontalBox");
    this.horizontal = document.getElementById("ThreadVisScrollbarHorizontal");
    this.arrowLeft = document.getElementById("ThreadVisScrollbarLeft");
    this.arrowRight = document.getElementById("ThreadVisScrollbarRight");

    /**
     * XUL boxes for vertical scrollbar
     */
    this.boxVertical = document.getElementById("ThreadVisScrollbarVerticalBox");
    this.vertical = document.getElementById("ThreadVisScrollbarVertical");
    this.arrowDown = document.getElementById("ThreadVisScrollbarDown");
    this.arrowUp = document.getElementById("ThreadVisScrollbarUp");

    this.init(box);

    // add event listeners
    var ref = this;
    document.addEventListener("mousemove",
        function(event) {ref.onMouseMoveHorizontal(event);}, false);
    this.horizontal.addEventListener("mousedown",
        function(event) {ref.onMouseDownHorizontal(event);}, false);
    document.addEventListener("mouseup",
        function(event) { ref.onMouseUpHorizontal(event); }, false);

    document.addEventListener("mousemove",
        function(event) {ref.onMouseMoveVertical(event);}, false);
    this.vertical.addEventListener("mousedown",
        function(event) {ref.onMouseDownVertical(event);}, false);
    document.addEventListener("mouseup",
        function(event) { ref.onMouseUpVertical(event); }, false);

    // add event listeners for up/down/left/right buttons
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
        clearInterval(ref.upPanInterval);
        ref.panRight();
    }, false);
    this.arrowRight.addEventListener("mousedown", function(event) {
        clearInterval(ref.rightPanInterval);
        ref.rightPanInterval = setInterval(function() {
            ref.panRight();
        }, 100);
    }, false);

    document.addEventListener("mouseup", function(event) {
        clearInterval(ref.upPanInterval);
        clearInterval(ref.downPanInterval);
        clearInterval(ref.leftPanInterval);
        clearInterval(ref.rightPanInterval);
    }, false);

    // on resize, reset size of scrollbars
    window.addEventListener("resize", function(event) {
        ref.resize();
    }, false);

    this.verticalShown = false;
    this.horizontalShown = false;
}



/** ****************************************************************************
 * Calculate positions of the scrollbars
 *
 * @return
 *          object.x is the x-position of the horizontal scrollbar
 *          object.y is the y-position of the vertical scrollbar
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.calculatePosition = function() {
    if (THREADVIS.SVG) {
        var matrix = this.stack.transform.baseVal.getConsolidationMatrix();
        var movedX = Math.abs(matrix.e);
        var movedY = Math.abs(matrix.f);
    } else {
        var movedX = Math.abs(parseFloat(this.stack.style.marginLeft));
        var movedY = Math.abs(parseFloat(this.stack.style.marginTop));
    }

    var x = (movedX / this.getStackWidth()) * this.getScrollBarHorizontalWidth();
    var y = (movedY / this.getStackHeight()) * this.getScrollBarVerticalHeight();

    var position = new Object()
    position.x = x;
    position.y = y;

    return position;
}



/** ****************************************************************************
 * Calculate size of scrollbars.
 * Determine if scrollbars need to be drawn.
 *
 * @return
 *          object.width is the width of the horizontal scrollbar
 *          object.height is the height of the vertical scrollbar
 *          object.hideHorizontal is true to hide the horizontal scrollbar
 *          object.hideVertical is true to hide the vertical scrollbar
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.calculateSize = function() {
    var width = (this.getTotalWidth() / this.getStackWidth()) *
        this.getScrollBarHorizontalWidth();
    var height = (this.getTotalHeight() / this.getStackHeight()) *
        this.getScrollBarVerticalHeight();

    if (width > this.getScrollBarHorizontalWidth()) {
        width = this.getScrollBarHorizontalWidth();
    }

    if (height > this.getScrollBarVerticalHeight()) {
        height = this.getScrollBarVerticalHeight();
    }

    var hideHorizontal = false;
    if (Math.abs(width - this.getScrollBarHorizontalWidth()) < 2) {
        hideHorizontal = true;
    }

    var hideVertical = false;
    if (Math.abs(height - this.getScrollBarVerticalHeight()) < 2) {
        hideVertical = true;
    }

    var size = new Object();
    size.width = width;
    size.hideHorizontal = hideHorizontal;
    size.height = height;
    size.hideVertical = hideVertical;

    return size;
}



/** ****************************************************************************
 * Draw the scrollbar
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.draw = function() {
    this.reset();
    var size = this.calculateSize();
    var position = this.calculatePosition();

    if (size.hideHorizontal) {
        this.boxHorizontal.style.visibility = "hidden";
        this.arrowLeft.style.visibility = "hidden";
        this.arrowRight.style.visibility = "hidden";
    } else {
        this.horizontalShown = true;
        this.boxHorizontal.style.visibility = "visible";
        this.arrowLeft.style.visibility = "visible";
        this.arrowRight.style.visibility = "visible";
        this.horizontal.style.position = "relative";
        this.horizontal.style.width = size.width + "px";
        this.horizontal.style.left = position.x + "px";
    }

    if (size.hideVertical) {
        this.boxVertical.style.visibility= "hidden";
        this.arrowUp.style.visibility= "hidden";
        this.arrowDown.style.visibility= "hidden";
    } else {
        this.verticalShown = true;
        this.boxVertical.style.visibility= "visible";
        this.arrowUp.style.visibility= "visible";
        this.arrowDown.style.visibility= "visible";
        this.vertical.style.position = "relative";
        this.vertical.style.height = size.height + "px";
        this.vertical.style.top = position.y + "px";
    }
}



/** ****************************************************************************
 * Get width of horizontal scrollbar
 *
 * @return
 *          The width of the horizontal scrollbar in pixel
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.getScrollBarHorizontalWidth = function() {
    return  this.boxHorizontal.boxObject.width - 2;
}



/** ****************************************************************************
 * Get vertical scrollbar height
 *
 * @return
 *          The height of the vertical scrollbar in pixel
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.getScrollBarVerticalHeight = function() {
    return this.boxVertical.boxObject.height - 2;
}



/** ****************************************************************************
 * Get height of stack (visualisation)
 *
 * @return
 *          The height of the visualisation stack in pixel
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.getStackHeight = function() {
    if (THREADVIS.SVG) {
        return this.stack.getBBox().height;
    } else {
        return this.stack.boxObject.height;
    }
}



/** ****************************************************************************
 * Get width of stack (visualisation)
 *
 * @return
 *          The width of the visualisation stack in pixel
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.getStackWidth = function() {
    if (THREADVIS.SVG) {
        return this.stack.getBBox().width;
    } else {
        return this.stack.boxObject.width;
    }
}



/** ****************************************************************************
 * Get height of viewport (box)
 *
 * @return
 *          The height of the viewport in pixel
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.getTotalHeight = function() {
    return this.box.boxObject.height;
}



/** ****************************************************************************
 * Get width of viewport (box)
 *
 * @return
 *          The width of the viewport in pixel
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.getTotalWidth = function() {
    return this.box.boxObject.width;
}



/** ****************************************************************************
 * Init height of scrollbars
 *
 * @param box
 *          The box object (viewport)
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.init = function(box) {
    this.box = box;
}



/** ****************************************************************************
 * Return true if scrollbar is shown
 *
 * @return
 *          True if any scrollbar (either horizontal or vertical) is shown
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.isShown = function() {
    return this.verticalShown || this.horizontalShown;
}



/** ****************************************************************************
 * Return true if vertical scrollbar is shown
 *
 * @return
 *          True if the vertical scrollbar is shown, false otherwise
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.isShownVertical = function() {
    return this.verticalShown;
}



/** ****************************************************************************
 * Return true if horizontal scrollbar is shown
 *
 * @return
 *          True if the horizontal scrollbar is show, false otherwise
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.isShownHorizontal= function() {
    return this.horizontalShown;
}



/** ****************************************************************************
 * React to mousemovement over horizontal scrollbar
 * Do actual scrolling
 *
 * @param event
 *          The event object
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.onMouseMoveHorizontal = function(event) {
    if (this.panningHorizontal) {
        var x = event.clientX;
        var dx = x - this.startX;
        this.startX = x;
        this.panHorizontal(dx);
    }
}



/** ****************************************************************************
 * React to mousedown event on horizontal scrollbar
 * Start scrolling
 *
 * @param event
 *          The event object
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.onMouseDownHorizontal = function(event) {
    // only react to left mousebutton
    if (event.button != 0) {
        return;
    }

    this.startX = event.clientX;
    this.panningHorizontal = true;
}



/** ****************************************************************************
 * React to mouseup event on horizontal scrollbar
 * Stop scrolling
 *
 * @param event
 *          The event object
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.onMouseUpHorizontal = function(event) {
    this.panningHorizontal = false;
}



/** ****************************************************************************
 * React to mousemovement over vertical scrollbar
 * Do actual scrolling
 *
 * @param event
 *          The event object
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.onMouseMoveVertical = function(event) {
    if (this.panningVertical) {
        var y = event.clientY;
        var dy = y - this.startY;

        this.startY = y;
        this.panVertical(dy);
    }
}



/** ****************************************************************************
 * React to mousedown event on vertical scrollbar
 * Start scrolling
 *
 * @param event
 *          The event object
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.onMouseDownVertical = function(event) {
    if (event.button != 0) {
        return;
    }

    this.startY = event.clientY;
    this.panningVertical = true;
}



/** ****************************************************************************
 * React to mouseup event on vertical scrollbar
 * Stop scrolling
 *
 * @param event
 *          The event object
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.onMouseUpVertical = function(event) {
    this.panningVertical = false;
}



/** ****************************************************************************
 * React on click on "down" button
 * Pan vertically by one pixel
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.panDown = function() {
    this.panVertical(1);
}



/** ****************************************************************************
 * Do horizontal panning by dx pixel
 *
 * @param dx
 *          Amount of panning in pixel
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.panHorizontal = function(dx) {
    var currentX = parseFloat(this.horizontal.style.left);
    if (currentX == "") {
        currentX = 0;
    }
    dx = parseInt(currentX) + parseInt(dx);

    var barWidth = this.horizontal.boxObject.width;

    if (dx < 0) {
        dx = 0;
    }

    if (dx + barWidth > this.getScrollBarHorizontalWidth()) {
        dx = this.getScrollBarHorizontalWidth() - barWidth;
    }
    this.horizontal.style.left = dx + "px";

    var multiplicator = -1 * this.getStackWidth() / this.getTotalWidth();

    var position = new Object();
    position.x = dx * multiplicator;
    this.visualisation.moveVisualisationTo(position);
}



/** ****************************************************************************
 * React on click on "left" button
 * Pan left by one pixel
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.panLeft = function() {
    this.panHorizontal(-1);
}



/** ****************************************************************************
 * React on click on "right" button
 * Pan right by one pixel
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.panRight = function() {
    this.panHorizontal(1);
}



/** ****************************************************************************
 * React on click on "up" button
 * Pan up by one pixel
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.panUp = function() {
    this.panVertical(-1);
}



/** ****************************************************************************
 * Do vertical panning by dy pixel
 *
 * @param dy
 *          The amount to pan in pixel
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.panVertical = function(dy) {
    var currentY = parseFloat(this.vertical.style.top);
    if (currentY == "") {
        currentY = 0;
    }
    dy = parseInt(currentY) + parseInt(dy);

    var barHeight = this.vertical.boxObject.height;

    if (dy < 0) {
        dy = 0;
    }

    if (dy + barHeight > this.getScrollBarVerticalHeight()) {
        dy = this.getScrollBarVerticalHeight() - barHeight;
    }

    this.vertical.style.top = dy + "px";

    var boxHeight = this.box.boxObject.height;
    var multiplicator = -1 * this.getStackHeight() / this.getTotalHeight();

    var position = new Object();
    position.y = dy * multiplicator;

    this.visualisation.moveVisualisationTo(position);
}



/** ****************************************************************************
 * Reset size of scrollbar to 0
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.reset = function() {
    this.vertical.style.height = "0px";
    this.vertical.style.top = "0px";
    this.horizontal.style.width = "0px";
    this.horizontal.style.left = "0px";
    this.verticalShown = false;
    this.horizontalShown = false;}



/** ****************************************************************************
 * Reset size of scrollbar to 0 on window resize.
 * Otherwise, window can't be resized to a size smaller than the
 * scrollbars.
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Scrollbar.prototype.resize = function() {
    this.reset();
    this.draw();
}
