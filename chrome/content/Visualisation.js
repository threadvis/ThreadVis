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

var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var DOTSIZE_ = 16;
var ARC_HEIGHT_ = 16;
var ARC_DIFFERENCE_ = 6;
var ARC_WIDTH_ = 16;
var ARC_LEFT_PLACEMENT_ = -1;
var ARC_RIGHT_PLACEMENT_ = 1;
var SPACING_ = 32;
var URL_ = "chrome://threadarcsjs/content/images/";

// ==============================================================================================
// ==============================================================================================
// ==============================================================================================
// FIXXME
// all container variables that are set here should be accessed by functions in the container class
// ==============================================================================================
// ==============================================================================================
// ==============================================================================================

/**
 * Constructor for visualisation class
 */
function Visualisation()
{
    this.box_ = null;
    this.stack_ = null;
    // set default resize parameter
    this.resize_ = 1;

    this.createStack();
}


/**
 * Clear stack
 * delete all children
 */
Visualisation.prototype.clearStack = function()
{
    while(this.stack_.firstChild != null)
        this.stack_.removeChild(this.stack_.firstChild);
}


/**
 * Create stack
 */
Visualisation.prototype.createStack = function()
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
    
    var loading = document.createElementNS(XUL_NAMESPACE_, "image");

    loading.style.marginTop = "20px";
    loading.setAttribute("src", URL_ + "loading.gif");

    this.stack_.appendChild(loading);

    loading = null;
    div = null;
}


/**
 * Draw arc
 */
Visualisation.prototype.drawArc = function(color, vposition, height, left, right)
{
    var arc_top = 0;
    var fill_top = 0;
    height--;
    if (vposition == "top")
    {
        arc_top = (this.box_.boxObject.height / 2) - (((DOTSIZE_ / 2) + ARC_HEIGHT_ + (ARC_DIFFERENCE_ * height)) * this.resize_);
        fill_top = arc_top + (ARC_HEIGHT_ * this.resize_);
    }
    else
    {
        arc_top = (this.box_.boxObject.height / 2) + (((DOTSIZE_ / 2) + (ARC_DIFFERENCE_ * height)) * this.resize_);
        fill_top = arc_top - (ARC_DIFFERENCE_ * height * this.resize_);
    }

    var arc_left = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_left.style.position = "relative";
    arc_left.style.top = arc_top + "px";
    arc_left.style.left = ((left + ARC_LEFT_PLACEMENT_) * this.resize_) + "px";
    arc_left.style.height = (ARC_HEIGHT_ * this.resize_)+ "px";
    arc_left.style.width = (ARC_WIDTH_ * this.resize_)+ "px";
    arc_left.style.verticalAlign = "top";
    arc_left.setAttribute( "src", URL_ + "arc_" + color + "_" + vposition + "_left.png");
    this.stack_.appendChild(arc_left);

    var arc_right = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_right.style.position = "relative";
    arc_right.style.top = arc_top + "px";
    arc_right.style.left = ((right - ARC_WIDTH_ + ARC_RIGHT_PLACEMENT_) * this.resize_) + "px";
    arc_right.style.height = (ARC_HEIGHT_ * this.resize_)+ "px";
    arc_right.style.width = (ARC_WIDTH_ * this.resize_)+ "px";
    arc_right.style.verticalAlign = "top";
    arc_right.setAttribute( "src", URL_ + "arc_" + color + "_" + vposition + "_right.png");
    this.stack_.appendChild(arc_right);

    var arc_middle = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_middle.style.position = "relative";
    arc_middle.style.top = arc_top + "px";
    arc_middle.style.left = ((left + ARC_LEFT_PLACEMENT_ + ARC_WIDTH_) * this.resize_) + "px";
    arc_middle.style.width = (((right - ARC_WIDTH_ + ARC_RIGHT_PLACEMENT_) - (left + ARC_LEFT_PLACEMENT_ + ARC_WIDTH_)) * this.resize_) + "px";
    arc_middle.style.height = (ARC_HEIGHT_ * this.resize_) + "px";
    arc_middle.style.verticalAlign = "top";
    arc_middle.setAttribute( "src", URL_ + "arc_" + color + "_" + vposition + "_middle.png");
    this.stack_.appendChild(arc_middle);

    if (height == 0)
        return;

    var arc_left_middle = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_left_middle.style.position = "relative";
    arc_left_middle.style.top = fill_top + "px";
    arc_left_middle.style.left = ((left + ARC_LEFT_PLACEMENT_) * this.resize_) + "px";
    arc_left_middle.style.width = (ARC_WIDTH_ * this.resize_) + "px";
    arc_left_middle.style.height = ((ARC_DIFFERENCE_ * height) * this.resize_) + "px";
    arc_left_middle.style.verticalAlign = "top";
    arc_left_middle.setAttribute( "src", URL_ + "arc_" + color + "_left_middle.png");
    this.stack_.appendChild(arc_left_middle);
    
    var arc_right_middle = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_right_middle.style.position = "relative";
    arc_right_middle.style.top = fill_top + "px";
    arc_right_middle.style.left = ((right - ARC_WIDTH_ + ARC_RIGHT_PLACEMENT_) * this.resize_) + "px";
    arc_right_middle.style.width = (ARC_WIDTH_ * this.resize_) + "px";
    arc_right_middle.style.height = ((ARC_DIFFERENCE_ * height) * this.resize_) + "px";
    arc_right_middle.style.verticalAlign = "top";
    arc_right_middle.setAttribute("src", URL_ + "arc_" + color + "_right_middle.png");
    this.stack_.appendChild(arc_right_middle);
}


/**
 * Draw a dot
 */
Visualisation.prototype.drawDot = function(container, color, style, left)
{
    var dot = document.createElementNS(XUL_NAMESPACE_, "image");

    dot.style.position = "relative";
    dot.style.top = (this.box_.boxObject.height / 2) - ((DOTSIZE_ / 2) * this.resize_) + "px";
    dot.style.left = ((left - (DOTSIZE_ / 2)) * this.resize_) + "px";
    dot.style.width = (DOTSIZE_ * this.resize_) + "px";
    dot.style.height = (DOTSIZE_ * this.resize_) + "px";
    dot.setAttribute("src", URL_ + "dot_" + color + "_" + style + ".png");

    dot.container = container;

    var tooltip = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip.setAttribute("orient", "vertical");
    tooltip.setAttribute("id", "ThreadArcsJS_" + left);

    if (! container.isDummy())
    {
        // if container container message, view details
        var authorlabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var authortext = document.createElementNS(XUL_NAMESPACE_, "label");
        var author = document.createElementNS(XUL_NAMESPACE_, "hbox");
        author.appendChild(authorlabel);
        author.appendChild(authortext);
        authorlabel.setAttribute("value", "From:");
        authorlabel.style.fontWeight = "bold";
        authortext.setAttribute("value", container.getMessage().getFrom());
        
        var datelabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var datetext = document.createElementNS(XUL_NAMESPACE_, "label");
        var date = document.createElementNS(XUL_NAMESPACE_, "hbox");
        date.appendChild(datelabel);
        date.appendChild(datetext);
        datelabel.setAttribute("value", "Date:");
        datelabel.style.fontWeight = "bold";
        datetext.setAttribute("value", container.getMessage().getDate());

        var subjectlabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var subjecttext = document.createElementNS(XUL_NAMESPACE_, "label");
        var subject = document.createElementNS(XUL_NAMESPACE_, "hbox");
        subject.appendChild(subjectlabel);
        subject.appendChild(subjecttext);
        subjectlabel.setAttribute("value", "Subject:");
        subjectlabel.style.fontWeight = "bold";
        subjecttext.setAttribute("value", container.getMessage().getSubject());

        tooltip.appendChild(author);
        tooltip.appendChild(date);
        tooltip.appendChild(subject);
    }
    else
    {
        // otherwise we display info about missing message
        var desc1 = document.createElementNS(XUL_NAMESPACE_, "description");
        var desc2 = document.createElementNS(XUL_NAMESPACE_, "description");
        desc1.setAttribute("value", "This is a missing message.");
        desc2.setAttribute("value", "Either you never received it or it was deleted.");
        tooltip.appendChild(desc1);
        tooltip.appendChild(desc2);
    }

    dot.setAttribute("tooltip", "ThreadArcsJS_" + left);
    this.stack_.appendChild(dot);
    this.stack_.appendChild(tooltip);
    dot.addEventListener("click", this.onMouseClick, true);
}


/**
 * Get resize multiplicator
 * calculate from box width and height
 * and needed width and height
 */
Visualisation.prototype.getResize = function(xcount, ycount,sizex, sizey)
{
    var spaceperarcavailablex = sizex / (xcount - 1);
    var spaceperarcavailabley = sizey / 2;
    var spaceperarcneededx = DOTSIZE_ + (2 * ARC_WIDTH_);
    var spaceperarcneededy = (DOTSIZE_ / 2) + ARC_HEIGHT_ + ycount * ARC_DIFFERENCE_;
    
    var resizex = (spaceperarcavailablex / spaceperarcneededx);
    var resizey = (spaceperarcavailabley / spaceperarcneededy);
    
    var resize = 1;
    if (resizex < resizey)
        resize = resizex;
    else
        resize = resizey;
    
    if (resize > 1)
        resize = 1;
    
    return resize;
}


/**
 * mouse click event handler
 * display message user clicked on
 */
Visualisation.prototype.onMouseClick = function(event)
{
    var container = event.target.container;
    if (container && ! container.isDummy())
        THREADARCS_.callback(container.getMessage().getKey(), container.getMessage().getFolder());
}


/**
 * Visualise a new thread
 */
Visualisation.prototype.visualise = function(container)
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


    // pre-calculate size
    var totalmaxheight = 0;
    for (var counter = 0; counter < containers.length; counter++)
    {
        var thiscontainer = containers[counter];
        thiscontainer.x_index_ = counter;
        thiscontainer.current_arc_height_incoming_ = 0;
        thiscontainer.current_arc_height_outgoing_ = 0;
        thiscontainer.odd_ = thiscontainer.getDepth() % 2 == 0;
        var parent = thiscontainer.getParent();
        if (parent != null && ! parent.isRoot())
        {
            var maxheight = 0;
            for (var innercounter = parent.x_index_; innercounter < counter; innercounter++)
            {
                var lookatcontainer = containers[innercounter];
                if (lookatcontainer.odd_ == parent.odd_ && lookatcontainer.current_arc_height_outgoing_ > maxheight)
                {
                    maxheight = lookatcontainer.current_arc_height_outgoing_;
                }
                if (lookatcontainer.odd_ != parent.odd_ && lookatcontainer.current_arc_height_incoming_ > maxheight)
                {
                    maxheight = lookatcontainer.current_arc_height_incoming_;
                }
            }
            maxheight++;
            parent.current_arc_height_outgoing_ = maxheight;
            thiscontainer.current_arc_height_incoming_ = maxheight;
        }
        if (maxheight > totalmaxheight)
            totalmaxheight = maxheight;
    }

    var x = SPACING_ / 2;
    this.box_.style.paddingRight = x + "px";
    this.resize_ = this.getResize(containers.length, totalmaxheight, this.box_.boxObject.width, this.box_.boxObject.height);

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
        
        if (thiscontainer.isDummy())
            style ="dummy";
        
        this.drawDot(thiscontainer, color, style, x);
        thiscontainer.x_position_ = x;
        thiscontainer.current_arc_height_incoming_ = 0;
        thiscontainer.current_arc_height_outgoing_ = 0;
        
        // draw arc
        var parent = thiscontainer.getParent()
        if (parent != null && ! parent.isRoot())
        {
            var position = "bottom";
            if (parent.odd_)
                position = "top";

            var color = "grey";
            if (thiscontainer == container || parent == container)
                color = "blue";
            
            var maxheight = 0;
            for (var innercounter = parent.x_index_; innercounter < counter; innercounter++)
            {
                var lookatcontainer = containers[innercounter];
                if (lookatcontainer.odd_ == parent.odd_ && lookatcontainer.current_arc_height_outgoing_ > maxheight)
                {
                    maxheight = lookatcontainer.current_arc_height_outgoing_;
                }
                if (lookatcontainer.odd_ != parent.odd_ && lookatcontainer.current_arc_height_incoming_ > maxheight)
                {
                    maxheight = lookatcontainer.current_arc_height_incoming_;
                }
            }
            maxheight++;
            parent.current_arc_height_outgoing_ = maxheight;
            thiscontainer.current_arc_height_incoming_ = maxheight;
            this.drawArc(color, position, maxheight, parent.x_position_, x);
        }
        x = x + SPACING_;
    }
}
