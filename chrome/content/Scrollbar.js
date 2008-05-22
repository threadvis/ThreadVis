/** ****************************************************************************
 * Scrollbar.js
 *
 * (c) 2006-2007 Alexander C. Hubmann
 * (c) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor for scrollbar class
 ******************************************************************************/
function Scrollbar(visualisation, stack, box) {
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
}



/** ****************************************************************************
 * Calculate positions of the scrollbars
 ******************************************************************************/
Scrollbar.prototype.calculatePosition = function() {
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
 * Calculate size of scrollbars
 * Determine if scrollbars need to be drawn
 ******************************************************************************/
Scrollbar.prototype.calculateSize = function() {
    var width = (this.getTotalWidth() / this.getStackWidth()) * this.getScrollBarHorizontalWidth();
    var height = (this.getTotalHeight() / this.getStackHeight()) * this.getScrollBarVerticalHeight();

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
 ******************************************************************************/
Scrollbar.prototype.draw = function() {
    this.reset();
    var size = this.calculateSize();
    var position = this.calculatePosition();

    if (size.hideHorizontal) {
        this.boxHorizontal.style.visibility = "hidden";
        this.arrowLeft.style.visibility = "hidden";
        this.arrowRight.style.visibility = "hidden";
    } else {
        this.boxHorizontal.style.visibility = "visible";
        this.arrowLeft.style.visibility = "visible";
        this.arrowRight.style.visibility = "visible";
    }
    this.horizontal.style.position = "relative";
    this.horizontal.style.width = size.width + "px";
    this.horizontal.style.left = position.x + "px";

    if (size.hideVertical) {
        this.boxVertical.style.visibility= "hidden";
        this.arrowUp.style.visibility= "hidden";
        this.arrowDown.style.visibility= "hidden";
    } else {
        this.boxVertical.style.visibility= "visible";
        this.arrowUp.style.visibility= "visible";
        this.arrowDown.style.visibility= "visible";
    }
    this.vertical.style.position = "relative";
    this.vertical.style.height = size.height + "px";
    this.vertical.style.top = position.y + "px";
}



/** ****************************************************************************
 * Get width of horizontal scrollbar
 ******************************************************************************/
Scrollbar.prototype.getScrollBarHorizontalWidth = function() {
    return  this.boxHorizontal.boxObject.width - 2;
}



/** ****************************************************************************
 * Get vertical scrollbar height
 ******************************************************************************/
Scrollbar.prototype.getScrollBarVerticalHeight = function() {
    return this.boxVertical.boxObject.height - 2;
}



/** ****************************************************************************
 * Get height of stack (visualisation)
 ******************************************************************************/
Scrollbar.prototype.getStackHeight = function() {
    if (THREADVIS.SVG) {
        return this.stack.getBBox().height;
    } else {
        return this.stack.boxObject.height;
    }
}



/** ****************************************************************************
 * Get width of stack (visualisation)
 ******************************************************************************/
Scrollbar.prototype.getStackWidth = function() {
    if (THREADVIS.SVG) {
        return this.stack.getBBox().width;
    } else {
        return this.stack.boxObject.width;
    }
}



/** ****************************************************************************
 * Get height of viewport (box)
 ******************************************************************************/
Scrollbar.prototype.getTotalHeight = function() {
    return this.box.boxObject.height;
}



/** ****************************************************************************
 * Get width of viewport (box)
 ******************************************************************************/
Scrollbar.prototype.getTotalWidth = function() {
    return this.box.boxObject.width;
}



/** ****************************************************************************
 * Init height of scrollbars
 ******************************************************************************/
Scrollbar.prototype.init = function(box) {
    this.box = box;
}



/** ****************************************************************************
 * React to mousemovement over horizontal scrollbar
 * Do actual scrolling
 ******************************************************************************/
Scrollbar.prototype.onMouseMoveHorizontal = function(event) {
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
 ******************************************************************************/
Scrollbar.prototype.onMouseDownHorizontal = function(event) {
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
 ******************************************************************************/
Scrollbar.prototype.onMouseUpHorizontal = function(event) {
    this.panningHorizontal = false;
}



/** ****************************************************************************
 * React to mousemovement over vertical scrollbar
 * Do actual scrolling
 ******************************************************************************/
Scrollbar.prototype.onMouseMoveVertical = function(event) {
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
 ******************************************************************************/
Scrollbar.prototype.onMouseDownVertical = function(event) {
    if (event.button != 0) {
        return;
    }

    this.startY = event.clientY;
    this.panningVertical = true;
}



/** ****************************************************************************
 * React to mouseup event on vertical scrollbar
 * Stop scrolling
 ******************************************************************************/
Scrollbar.prototype.onMouseUpVertical = function(event) {
    this.panningVertical = false;
}



/** ****************************************************************************
 * React on click on "down" button
 ******************************************************************************/
Scrollbar.prototype.panDown = function() {
    this.panVertical(1);
}



/** ****************************************************************************
 * Do horizontal panning by dx
 ******************************************************************************/
Scrollbar.prototype.panHorizontal = function(dx) {
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
 ******************************************************************************/
Scrollbar.prototype.panLeft = function() {
    this.panHorizontal(-1);
}



/** ****************************************************************************
 * React on click on "right" button
 ******************************************************************************/
Scrollbar.prototype.panRight = function() {
    this.panHorizontal(1);
}



/** ****************************************************************************
 * React on click on "up" button
 ******************************************************************************/
Scrollbar.prototype.panUp = function() {
    this.panVertical(-1);
}



/** ****************************************************************************
 * Do vertical panning by dy
 ******************************************************************************/
Scrollbar.prototype.panVertical = function(dy) {
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
 ******************************************************************************/
Scrollbar.prototype.reset = function() {
    this.vertical.style.height = "0px";
    this.horizontal.style.width = "0px";
}



/** ****************************************************************************
 * Reset size of scrollbar to 0 on window resize.
 * Otherwise, window can't be resized to a size smaller than the
 * scrollbars.
 ******************************************************************************/
Scrollbar.prototype.resize = function() {
    this.reset();
    this.draw();
}
