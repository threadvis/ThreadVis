/** ****************************************************************************
 * Scrollbar.js
 *
 * (c) 2006-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * $Id: Timeline.js 267 2006-01-07 19:19:38Z sascha $
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
    
    this.init(box);
    
    this.boxHorizontal = document.getElementById("ThreadVisScrollbarHorizontalBox");
    this.horizontal = document.getElementById("ThreadVisScrollbarHorizontal");
    
    this.boxVertical = document.getElementById("ThreadVisScrollbarVerticalBox");
    this.vertical = document.getElementById("ThreadVisScrollbarVertical");
    
    var ref = this;
    this.horizontal.addEventListener("mousemove", function(event) {ref.onMouseMoveHorizontal(event);}, false);
    this.horizontal.addEventListener("mousedown", function(event) {ref.onMouseDownHorizontal(event);}, false);
    this.horizontal.addEventListener("mouseup", function(event) { ref.onMouseUpHorizontal(event); }, false);
    
    this.vertical.addEventListener("mousemove", function(event) {ref.onMouseMoveVertical(event);}, false);
    this.vertical.addEventListener("mousedown", function(event) {ref.onMouseDownVertical(event);}, false);
    this.vertical.addEventListener("mouseup", function(event) { ref.onMouseUpVertical(event); }, false);
}



/** ****************************************************************************
 * Init height of scrollbars
 ******************************************************************************/
Scrollbar.prototype.init = function(box) {
    this.box = box;
    this.totalHeight = this.box.boxObject.height - 4;
    this.totalWidth = this.box.boxObject.width - 4;
}


/** ****************************************************************************
 * Draw the scrollbar
 ******************************************************************************/
Scrollbar.prototype.draw = function() {
    var size = this.calculateSize();
    var position = this.calculatePosition();
    
    this.boxHorizontal.hidden = size.hideHorizontal;
    this.horizontal.style.position = "relative";
    this.horizontal.style.width = size.width + "px";
    this.horizontal.style.left = position.x + "px";
    
    this.boxVertical.hidden = size.hideVertical;
    this.vertical.style.position = "relative";
    this.vertical.style.height = size.height + "px";
    this.vertical.style.top = position.y + "px";
}



/** ****************************************************************************
 * Calculate size of scrollbars
 * Determine if scrollbars need to be drawn
 ******************************************************************************/
Scrollbar.prototype.calculateSize = function() {
    var boxWidth = this.box.boxObject.width;
    var boxHeight = this.totalHeight;
    var stackWidth = this.stack.boxObject.width;
    var stackHeight = this.stack.boxObject.height;
    
    var width = (boxWidth / stackWidth) * boxWidth;
    var height = (boxHeight / stackHeight) * boxHeight;
    
    if (width > boxWidth) {
        width = boxWidth;
    }
    
    if (height > boxHeight) {
        height = boxHeight;
    }
    
    var hideHorizontal = false;
    if (Math.abs(width - boxWidth) < 2) {
        hideHorizontal = true;
    }
    
    var hideVertical = false;
    if (Math.abs(height - boxHeight) < 2) {
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
 * Calculate positions of the scrollbars
 ******************************************************************************/
Scrollbar.prototype.calculatePosition = function() {
    var boxWidth = this.box.boxObject.width;
    var boxHeight = this.totalHeight;
    var stackWidth = this.stack.boxObject.width;
    var stackHeight = this.stack.boxObject.height;
    
    var movedX = Math.abs(this.stack.style.marginLeft.replace(/px/, ""));
    var movedY = Math.abs(this.stack.style.marginTop.replace(/px/, ""));
    
    var x = (movedX / stackWidth) * boxWidth;
    var y = (movedY / stackHeight) * boxHeight;
    
    var position = new Object()
    position.x = x;
    position.y = y;
    
    return position;
}



/** ****************************************************************************
 * React to mousemovement over horizontal scrollbar
 * Do actual scrolling
 ******************************************************************************/
Scrollbar.prototype.onMouseMoveHorizontal = function(event) {
    if (this.panningHorizontal) {
        var x = event.clientX;
        var dx = x - this.startX;
        var currentX = this.horizontal.style.left.replace(/px/, "");
        if (currentX == "") {
            currentX = 0;
        }
        dx = parseInt(currentx) + parseInt(dx);
        this.startX = x;
        
        var barWidth = this.horizontal.boxObject.width;
        var totalWidth = this.totalWidth;
        
        if (dx < 0) {
            dx = 0;
        }
        
        if (dx + barWidth > totalWidth) {
            dx = totalWidth - barWidth;
        }
        
        this.horizontal.style.left = dx + "px";
        
        var boxWidth = this.box.boxObject.width;
        var stackWidth = this.stack.boxObject.width;
        var multiplicator = -1 * stackWidth / boxWidth;
        
        var position = new Object();
        position.x = dx * multiplicator;
        
        this.visualisation.moveVisualisationTo(position);
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
        var currentY = this.vertical.style.top.replace(/px/, "");
        if (currentY == "") {
            currentY = 0;
        }
        dy = parseInt(currentY) + parseInt(dy);
        this.startY = y;
        
        var barHeight = this.vertical.boxObject.height;
        var totalHeight = this.totalHeight;
        
        if (dy < 0) {
            dy = 0;
        }
        
        if (dy + baHeight > totalHeight) {
            dy = totalHeight - barHeight;
        }
        
        this.vertical.style.top = dy + "px";
        
        
        var boxHeight = this.box.boxObject.height;
        var stackHeight = this.stack.boxObject.height;
        var multiplicator = -1 * stackHeight / boxHeight;
        
        var position = new Object();
        position.y = dy * multiplicator;
        
        this.visualisation.moveVisualisationTo(position);
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
