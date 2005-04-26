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
var ARC_HEIGHT_ = new Array();
    ARC_HEIGHT_[1] = 29;
var ARC_WIDTH_ = new Array();
    ARC_WIDTH_[1] = 24;
var ARC_LEFT_PLACEMENT_ = new Array();
    ARC_LEFT_PLACEMENT_[1] = -4;
var ARC_RIGHT_PLACEMENT_ = new Array();
    ARC_RIGHT_PLACEMENT_[1] = 4;
var URL_ = "chrome://threadarcs/content/";


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
    var box = document.getElementById("ThreadArcsBox");
    var stack = document.createElementNS(XUL_NAMESPACE_, "stack");
    box.appendChild(stack);
    this.stack_ = stack;
    this.box_ = box;
}


/**
 * Draw arc
 */
function Visualisation_drawArc(color, vposition, height, left, right)
{
    var arc_top = (this.box_.height / 2) + (DOTSIZE_ / 2);
    if (vposition == "top")
        arc_top = arc_top - ARC_HEIGHT_[height] - DOTSIZE_;

    var div_left = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_left = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_left.style.position = "relative";
    arc_left.style.top = arc_top + "px";
    arc_left.style.left = left + ARC_LEFT_PLACEMENT_[height] + "px";
    arc_left.setAttribute( "src", URL_ + "threadarcs_arc_" + color + "_" + vposition + "_left_" + height + ".png");
    div_left.appendChild(arc_left);
    this.stack_.appendChild(div_left);

    var div_right = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_right = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_right.style.position = "relative";
    arc_right.style.top = arc_top + "px";
    arc_right.style.left = right - ARC_WIDTH_[height] + ARC_RIGHT_PLACEMENT_[height] + "px";
    arc_right.setAttribute( "src", URL_ + "threadarcs_arc_" + color + "_" + vposition + "_right_" + height + ".png");
    div_right.appendChild(arc_right);
    this.stack_.appendChild(div_right);

    var div_middle = document.createElementNS(HTML_NAMESPACE_, "div");
    var arc_middle = document.createElementNS(HTML_NAMESPACE_, "img");
    arc_middle.style.position = "relative";
    arc_middle.style.top = arc_top + "px";
    arc_middle.style.left = left + ARC_LEFT_PLACEMENT_[height] + ARC_WIDTH_[height] + "px";
    arc_middle.style.width = (right - ARC_WIDTH_[height] + ARC_RIGHT_PLACEMENT_[height]) - (left + ARC_LEFT_PLACEMENT_[height] + ARC_WIDTH_[height]) + "px";
    arc_middle.style.height = ARC_HEIGHT_[height] + "px";
    arc_middle.setAttribute( "src", URL_ + "threadarcs_arc_" + color + "_" + vposition + "_middle_" + height + ".png");
    div_middle.appendChild(arc_middle);
    this.stack_.appendChild(div_middle);
}


/**
 * Draw a dot
 */
function Visualisation_drawDot(color, style, left)
{
    var div = document.createElementNS(HTML_NAMESPACE_, "div");
    var dot = document.createElementNS(HTML_NAMESPACE_, "img");

    dot.style.position = "relative";
    dot.style.top = (this.box_.height / 2)  - (DOTSIZE_ / 2) + "px";
    dot.style.left = left - (DOTSIZE_ / 2) + "px";
    dot.style.width = DOTSIZE_ + "px";
    dot.style.height = DOTSIZE_ + "px";
    dot.setAttribute("src", URL_ + "threadarcs_dot_" + color + "_" + style + ".png");

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

    var key = null;
    var x = 20;
    for (key in containers)
    {
        var thiscontainer = containers[key];

        // draw this container
        var color = "grey";
        if (thiscontainer == container)
            color = "blue";

        this.drawDot(color, "full", x);
        thiscontainer.x_position_ = x;

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
            this.drawArc(color, position, 1, parent.x_position_, x);
        }
        x = x + 50;
    }
}
