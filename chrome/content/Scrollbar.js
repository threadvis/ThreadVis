/** ****************************************************************************
 * Scrollbar.js
 *
 * (c) 2006 Alexander C. Hubmann
 *
 * Version: $Id: Timeline.js 267 2006-01-07 19:19:38Z sascha $
 ******************************************************************************/



var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";



/** ****************************************************************************
 * Constructor for scrollbar class
 ******************************************************************************/
function Scrollbar(visualisation, stack, box)
{
    this.visualisation_ = visualisation;
    this.stack_ = stack;
    this.box_ = box;
    
    this.init(box);
    
    this.box_horizontal_ = document.getElementById("ThreadArcsJSScrollbarHorizontalBox");
    this.horizontal_ = document.getElementById("ThreadArcsJSScrollbarHorizontal");
    
    this.box_vertical_ = document.getElementById("ThreadArcsJSScrollbarVerticalBox");
    this.vertical_ = document.getElementById("ThreadArcsJSScrollbarVertical");
    
    var ref = this;
    this.horizontal_.addEventListener("mousemove", function(event) {ref.onMouseMoveHorizontal(event);}, false);
    this.horizontal_.addEventListener("mousedown", function(event) {ref.onMouseDownHorizontal(event);}, false);
    this.horizontal_.addEventListener("mouseup", function(event) { ref.onMouseUpHorizontal(event); }, false);
    
    this.vertical_.addEventListener("mousemove", function(event) {ref.onMouseMoveVertical(event);}, false);
    this.vertical_.addEventListener("mousedown", function(event) {ref.onMouseDownVertical(event);}, false);
    this.vertical_.addEventListener("mouseup", function(event) { ref.onMouseUpVertical(event); }, false);
}



Scrollbar.prototype.init = function(box)
{
    this.box_ = box;
    this.total_height_ = this.box_.boxObject.height - 4;
    this.total_width_ = this.box_.boxObject.width;
}


/** ****************************************************************************
 * Draw the scrollbar
 ******************************************************************************/
Scrollbar.prototype.draw = function()
{
    var size = this.calculateSize();
    var position = this.calculatePosition();
    
    this.box_horizontal_.hidden = size.hidehorizontal;
    this.horizontal_.style.position = "relative";
    this.horizontal_.style.width = size.width + "px";
    this.horizontal_.style.left = position.x + "px";
    
    this.box_vertical_.hidden = size.hidevertical;
    this.vertical_.style.position = "relative";
    this.vertical_.style.height = size.height + "px";
    this.vertical_.style.top = position.y + "px";
}



Scrollbar.prototype.calculateSize = function()
{
    var boxwidth = this.box_.boxObject.width;
    //var boxheight = this.box_.boxObject.height;
    var boxheight = this.total_height_;
    var stackwidth = this.stack_.boxObject.width;
    var stackheight = this.stack_.boxObject.height;
    
    var width = (boxwidth / stackwidth) * boxwidth;
    var height = (boxheight / stackheight) * boxheight;
    
    if (width > boxwidth)
        width = boxwidth;
    
    if (height > boxheight)
        height = boxheight;
    
    var hidehorizontal = false;
    if (width == boxwidth)
        hidehorizontal = true;
    
    var hidevertical = false;
    if (height == boxheight)
        hidevertical = true;
    
    var size = new Object();
    size.width = width;
    size.hidehorizontal = hidehorizontal;
    size.height = height;
    size.hidevertical = hidevertical;
    
    return size;
}



Scrollbar.prototype.calculatePosition = function()
{
    var boxwidth = this.box_.boxObject.width;
    //var boxheight = this.box_.boxObject.height;
    var boxheight = this.total_height_;
    var stackwidth = this.stack_.boxObject.width;
    var stackheight = this.stack_.boxObject.height;
    
    var movedx = Math.abs(this.stack_.style.marginLeft.replace(/px/, ""));
    var movedy = Math.abs(this.stack_.style.marginTop.replace(/px/, ""));
    
    var x = (movedx / stackwidth) * boxwidth;
    var y = (movedy / stackheight) * boxheight;
    
    var position = new Object()
    position.x = x;
    position.y = y;
    
    return position;
}



Scrollbar.prototype.onMouseMoveHorizontal = function(event)
{
    if (this.panning_horizontal_)
    {
        var x = event.clientX;
        var dx = x - this.startx_;
        var currentx = this.horizontal_.style.left.replace(/px/, "");
        if (currentx == "")
            currentx = 0;
        dx = parseInt(currentx) + parseInt(dx);
        this.startx_ = x;
        
        var barwidth = this.horizontal_.boxObject.width;
        var totalwidth = this.box_.boxObject.width;
        
        if (dx < 0)
            dx = 0;
        
        if (dx + barwidth > totalwidth)
            dx = totalwidth - barwidth;
        
        this.horizontal_.style.left = dx + "px";
        
        
        var boxwidth = this.box_.boxObject.width;
        var stackwidth = this.stack_.boxObject.width;
        var multiplicator = -1 * stackwidth / boxwidth;
        
        var position = new Object();
        position.x = dx * multiplicator;
        
        this.visualisation_.moveVisualisationTo(position);
    }
}



Scrollbar.prototype.onMouseDownHorizontal = function(event)
{
    if (event.button != 0)
        return;
    
    this.startx_ = event.clientX;
    this.panning_horizontal_ = true;
}



Scrollbar.prototype.onMouseUpHorizontal = function(event)
{
    this.panning_horizontal_ = false;
}



Scrollbar.prototype.onMouseMoveVertical = function(event)
{
    if (this.panning_vertical_)
    {
        var y = event.clientY;
        var dy = y - this.starty_;
        var currenty = this.vertical_.style.top.replace(/px/, "");
        if (currenty == "")
            currenty = 0;
        dy = parseInt(currenty) + parseInt(dy);
        this.starty_ = y;
        
        var barheight = this.vertical_.boxObject.height;
        //var totalheight = this.box_.boxObject.height;
        var totalheight = this.total_height_;
        
        if (dy < 0)
            dy = 0;
        
        if (dy + barheight > totalheight)
            dy = totalheight - barheight;
        
        this.vertical_.style.top = dy + "px";
        
        
        var boxheight = this.box_.boxObject.height;
        var stackheight = this.stack_.boxObject.height;
        var multiplicator = -1 * stackheight / boxheight;
        
        var position = new Object();
        position.y = dy * multiplicator;
        
        this.visualisation_.moveVisualisationTo(position);
    }
}



Scrollbar.prototype.onMouseDownVertical = function(event)
{
    if (event.button != 0)
        return;
    
    this.starty_ = event.clienty;
    this.panning_vertical_ = true;
}



Scrollbar.prototype.onMouseUpVertical = function(event)
{
    this.panning_vertical_ = false;
}
