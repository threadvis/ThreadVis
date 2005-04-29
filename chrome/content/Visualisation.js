/* *******************************************************
 * Visualisation.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file to visualise thread arcs
 * Re-implementation from Java
 *
 * Version: $Id$
 ********************************************************/

var HTML_NAMESPACE_ =
    "http://www.w3.org/1999/xhtml";

var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var DOTSIZE_ = 20;
var ARC_HEIGHT_ = 29;
var ARC_DIFFERENCE_ = 6;
var ARC_WIDTH_ = 24;
var ARC_LEFT_PLACEMENT_ = -4;
var ARC_RIGHT_PLACEMENT_ = 4;
var URL_ = "chrome://threadarcsjs/content/";

var RESIZE_ = 0.75;


/**
 * Constructor for visualisation class
 */
function Visualisation()
{
    this.box_ = null;
    this.stack_ = null;

    // needed for JavaScript
    // link functions to this object
    this.clearStack = Visualisation_clearStack;
    this.createStack = Visualisation_createStack;
    this.drawArc = Visualisation_drawArc;
    this.drawDot = Visualisation_drawDot;
    this.visualise = Visualisation_visualise;

    this.createStack();
}


/**
 * Clear stack
 * delete all children
 */
function Visualisation_clearStack()
{
    while(this.stack_.firstChild != null)
        this.stack_.removeChild(this.stack_.firstChild);
}


/**
 * Create stack
 */
function Visualisation_createStack()
{
    this.box_ = document.getElementById("ThreadArcsJSBox");
    this.stack_ = document.getElementById("ThreadArcsJSStack");
    
    if (! this.stack_)
    {
        this.stack_ = document.createElementNS(XUL_NAMESPACE_, "stack");
        this.stack_.setAttribute("id", "ThreadArcsJSStack");
        this.box_.appendChild(this.stack_);
    }
    else
    {
        this.clearStack();
    }
    
    var div = document.createElementNS(HTML_NAMESPACE_, "div");
    var loading = document.createElementNS(HTML_NAMESPACE_, "img");

    loading.style.marginTop = "20px";
    loading.setAttribute("src", URL_ + "threadarcs_loading.gif");

    div.appendChild(loading);
    this.stack_.appendChild(div);

    loading = null;
    div = null;
}


/**
 * Draw arc
 */
function Visualisation_drawArc(color, vposition, height, left, right)
{
    var arc_top = 0;
    var fill_top = 0;
    if (vposition == "top")
    {
        arc_top = (this.box_.height / 2) - (DOTSIZE_ / 2) - ARC_HEIGHT_ - (ARC_DIFFERENCE_ * height);
        fill_top = arc_top + ARC_HEIGHT_;
    }
    else
    {
        arc_top = (this.box_.height / 2) + (DOTSIZE_ / 2) + (ARC_DIFFERENCE_ * height);
        fill_top = arc_top - (ARC_DIFFERENCE_ * height);
    }

    var div_left = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_left = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_left.style.position = "relative";
    arc_left.style.top = (arc_top * RESIZE_) + "px";
    arc_left.style.left = ((left + ARC_LEFT_PLACEMENT_) * RESIZE_) + "px";
    arc_left.style.height = (ARC_HEIGHT_ * RESIZE_)+ "px";
    arc_left.style.width = (ARC_WIDTH_ * RESIZE_)+ "px";
    arc_left.style.verticalAlign = "top";
    arc_left.setAttribute( "src", URL_ + "threadarcs_arc_" + color + "_" + vposition + "_left.png");
    div_left.appendChild(arc_left);
    this.stack_.appendChild(div_left);

    var div_right = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_right = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_right.style.position = "relative";
    arc_right.style.top = (arc_top * RESIZE_) + "px";
    arc_right.style.left = ((right - ARC_WIDTH_ + ARC_RIGHT_PLACEMENT_) * RESIZE_) + "px";
    arc_right.style.height = (ARC_HEIGHT_ * RESIZE_)+ "px";
    arc_right.style.width = (ARC_WIDTH_ * RESIZE_)+ "px";
    arc_right.style.verticalAlign = "top";
    arc_right.setAttribute( "src", URL_ + "threadarcs_arc_" + color + "_" + vposition + "_right.png");
    div_right.appendChild(arc_right);
    this.stack_.appendChild(div_right);

    var div_middle = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_middle = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_middle.style.position = "relative";
    arc_middle.style.top = (arc_top * RESIZE_)+ "px";
    arc_middle.style.left = ((left + ARC_LEFT_PLACEMENT_ + ARC_WIDTH_) * RESIZE_) + "px";
    arc_middle.style.width = (((right - ARC_WIDTH_ + ARC_RIGHT_PLACEMENT_) - (left + ARC_LEFT_PLACEMENT_ + ARC_WIDTH_)) * RESIZE_) + "px";
    arc_middle.style.height = (ARC_HEIGHT_ * RESIZE_) + "px";
    arc_middle.style.verticalAlign = "top";
    arc_middle.setAttribute( "src", URL_ + "threadarcs_arc_" + color + "_" + vposition + "_middle.png");
    div_middle.appendChild(arc_middle);
    this.stack_.appendChild(div_middle);

    if (height == 0)
        return;

    var div_left_middle = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_left_middle = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_left_middle.style.position = "relative";
    arc_left_middle.style.top = (fill_top * RESIZE_) + "px";
    arc_left_middle.style.left = ((left + ARC_LEFT_PLACEMENT_) * RESIZE_) + "px";
    arc_left_middle.style.width = (ARC_WIDTH_ * RESIZE_) + "px";
    arc_left_middle.style.height = ((ARC_DIFFERENCE_ * height) * RESIZE_) + "px";
    arc_left_middle.style.verticalAlign = "top";
    arc_left_middle.setAttribute( "src", URL_ + "threadarcs_arc_" + color + "_left_middle.png");
    div_left_middle.appendChild(arc_left_middle);
    this.stack_.appendChild(div_left_middle);
    
    var div_right_middle = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_right_middle = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_right_middle.style.position = "relative";
    arc_right_middle.style.top = (fill_top * RESIZE_) + "px";
    arc_right_middle.style.left = ((right - ARC_WIDTH_ + ARC_RIGHT_PLACEMENT_) * RESIZE_) + "px";
    arc_right_middle.style.width = (ARC_WIDTH_ * RESIZE_) + "px";
    arc_right_middle.style.height = ((ARC_DIFFERENCE_ * height) * RESIZE_) + "px";
    arc_right_middle.style.verticalAlign = "top";
    arc_right_middle.setAttribute("src", URL_ + "threadarcs_arc_" + color + "_right_middle.png");
    div_right_middle.appendChild(arc_right_middle);
    this.stack_.appendChild(div_right_middle);
}


/**
 * Draw a dot
 */
function Visualisation_drawDot(container, color, style, left)
{
    var div = document.createElementNS(HTML_NAMESPACE_, "div");
    var dot = document.createElementNS(HTML_NAMESPACE_, "img");

    dot.style.position = "relative";
    dot.style.top = (((this.box_.height / 2)  - (DOTSIZE_ / 2)) * RESIZE_) + "px";
    dot.style.left = ((left - (DOTSIZE_ / 2)) * RESIZE_) + "px";
    dot.style.width = (DOTSIZE_ * RESIZE_) + "px";
    dot.style.height = (DOTSIZE_ * RESIZE_) + "px";
    dot.setAttribute("src", URL_ + "threadarcs_dot_" + color + "_" + style + ".png");

    dot.container = container;
    
    dot.setAttribute("tooltiptext", container.getToolTipText());
    div.setAttribute("tooltiptext", "");

    div.addEventListener("click", ThreadArcs_onMouseClick, true);

    div.appendChild(dot);
    this.stack_.appendChild(div);
}


/**
 * Visualise a new thread
 */
function Visualisation_visualise(container)
{
    // clear visualisation
    this.clearStack();

    // get topmost container
    var topcontainer = container.getTopContainer();

    // get all containers in thread as array
    var containers = new Array();
    containers.push(topcontainer);
    containers = containers.concat(topcontainer.getChildren());

    // sort containers by date
    containers.sort(Container_sortFunction);

    var x = 20;
    for (var counter = 0; counter < containers.length; counter++)
    {
        var thiscontainer = containers[counter];

        // draw this container
        var color = "grey";
        if (thiscontainer == container)
            color = "blue";

        var style = "full";
        if (! thiscontainer.isDummy() && thiscontainer.getMessage().isSent())
            style = "half";
        
        this.drawDot(thiscontainer, color, style, x);
        thiscontainer.x_position_ = x;
        thiscontainer.y_position = 0;

        // draw arc
        var parent = thiscontainer.getParent()
        if (parent != null && ! parent.isRoot())
        {
            var odd = parent.getDepth() % 2 == 0;
            var position = "bottom";
            if (odd)
                position = "top";

            var color = "grey";
            if (thiscontainer == container || parent == container)
                color = "blue";
            
            //var count = parent.getChildPosition(thiscontainer);
            var count = parent.y_position++;
            
            this.drawArc(color, position, count, parent.x_position_, x);
        }
        x = x + 50;
    }
}
