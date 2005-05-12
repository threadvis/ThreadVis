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

var URL_ = "chrome://threadarcsjs/content/images/";
var THREADARCSJS_PREF_BRANCH_ = "extensions.threadarcsjs.";
var VISUALISATION_PREF_DOTIMESCALING_ = "timescaling.enabled";
var VISUALISATION_PREF_VISUALISATIONSIZE_ = "visualisationsize";

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
    this.strings_ = null;
    // set default resize parameter
    this.resize_ = 1;
    this.pref_timescaling_ = false;

    this.preferenceObserverRegister();
    this.preferenceReload();
    this.createStack();
}


/**
 * Clear stack
 * delete all children
 */
Visualisation.prototype.clearStack = function()
{
    LOGGER_.logDebug("Visualisation.clearStack()", {});
    while(this.stack_.firstChild != null)
        this.stack_.removeChild(this.stack_.firstChild);
}


/**
 * Create stack
 */
Visualisation.prototype.createStack = function()
{
    LOGGER_.logDebug("Visualisation.createStack()", {});
    this.box_ = document.getElementById("ThreadArcsJSBox");
    this.stack_ = document.getElementById("ThreadArcsJSStack");
    this.strings_ = document.getElementById("ThreadArcsJSStrings");

    if (! this.stack_)
    {
        LOGGER_.logDebug("Visualisation.createStack()", {"action" : "create stack"});
        this.stack_ = document.createElementNS(XUL_NAMESPACE_, "stack");
        this.stack_.setAttribute("id", "ThreadArcsJSStack");
        this.box_.appendChild(this.stack_);
    }
    else
    {
        LOGGER_.logDebug("Visualisation.createStack()", {"action" : "clear stack"});
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
Visualisation.prototype.drawArc = function(color, vposition, height, left, right, top)
{
    LOGGER_.logDebug("Visualisation.drawArc()", {"action" : "start", "color" : color, "vposition" : vposition, "height" : height, "left" : left, "right" : right});
    var arc_top = 0;
    var fill_top = 0;
    height--;
    if (vposition == "top")
    {
        arc_top = top - (((this.dotsize_ / 2) + this.arc_height_ + (this.arc_difference_ * height)) * this.resize_);
        fill_top = arc_top + (this.arc_height_ * this.resize_);
    }
    else
    {
        arc_top = top + (((this.dotsize_ / 2) + (this.arc_difference_ * height)) * this.resize_);
        fill_top = arc_top - (this.arc_difference_ * height * this.resize_);
    }

    var style_top = arc_top + "px";
    var style_left = ((left + this.arc_left_placement_) * this.resize_) + "px";
    var style_height = (this.arc_height_ * this.resize_)+ "px";
    var style_width = (this.arc_width_ * this.resize_)+ "px";
    var style_src = URL_ + this.name_ + "arc_" + color + "_" + vposition + "_left.png";
    LOGGER_.logDebug("Visualisation.drawArc()", {"action" : "draw left arc", "top" : style_top, "left" : style_left, "height" : style_height, "width" : style_width, "src" : style_src});
    var arc_left = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_left.style.position = "relative";
    arc_left.style.top = style_top;
    arc_left.style.left = style_left;
    arc_left.style.height = style_height;
    arc_left.style.width = style_width;
    arc_left.style.verticalAlign = "top";
    arc_left.setAttribute("src", style_src);
    this.stack_.appendChild(arc_left);

    var style_top = arc_top + "px";
    var style_left = ((right - this.arc_width_ + this.arc_right_placement_) * this.resize_) + "px";
    var style_height = (this.arc_height_ * this.resize_)+ "px";
    var style_width = (this.arc_width_ * this.resize_)+ "px";
    var style_src = URL_ + this.name_ + "arc_" + color + "_" + vposition + "_right.png";
    LOGGER_.logDebug("Visualisation.drawArc()", {"action" : "draw right arc", "top" : style_top, "left" : style_left, "height" : style_height, "width" : style_width, "src" : style_src});
    var arc_right = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_right.style.position = "relative";
    arc_right.style.top = style_top;
    arc_right.style.left = style_left;
    arc_right.style.height = style_height;
    arc_right.style.width = style_width;
    arc_right.style.verticalAlign = "top";
    arc_right.setAttribute("src", style_src);
    this.stack_.appendChild(arc_right);

    var style_top = arc_top + "px";
    var style_left = ((left + this.arc_left_placement_ + this.arc_width_) * this.resize_) + "px";
    var style_height = (this.arc_height_ * this.resize_) + "px";
    var style_width = (((right - this.arc_width_ + this.arc_right_placement_) - (left + this.arc_left_placement_ + this.arc_width_)) * this.resize_) + "px";
    var style_src = URL_ + this.name_ + "arc_" + color + "_" + vposition + "_middle.png";
    LOGGER_.logDebug("Visualisation.drawArc()", {"action" : "draw middle arc", "top" : style_top, "left" : style_left, "height" : style_height, "width" : style_width, "src" : style_src});
    var arc_middle = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_middle.style.position = "relative";
    arc_middle.style.top = style_top;
    arc_middle.style.left = style_left;
    arc_middle.style.width = style_width;
    arc_middle.style.height = style_height;
    arc_middle.style.verticalAlign = "top";
    arc_middle.setAttribute("src", style_src);
    this.stack_.appendChild(arc_middle);

    if (height == 0)
        return;

    var style_top = fill_top + "px";
    var style_left = ((left + this.arc_left_placement_) * this.resize_) + "px";
    var style_height = ((this.arc_difference_ * height) * this.resize_) + "px";
    var style_width = (this.arc_width_ * this.resize_) + "px";
    var style_src = URL_ + this.name_ + "arc_" + color + "_left_middle.png";
    LOGGER_.logDebug("Visualisation.drawArc()", {"action" : "draw left middle arc", "top" : style_top, "left" : style_left, "height" : style_height, "width" : style_width, "src" : style_src});
    var arc_left_middle = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_left_middle.style.position = "relative";
    arc_left_middle.style.top = style_top;
    arc_left_middle.style.left = style_left;
    arc_left_middle.style.width = style_width;
    arc_left_middle.style.height = style_height;
    arc_left_middle.style.verticalAlign = "top";
    arc_left_middle.setAttribute("src", style_src);
    this.stack_.appendChild(arc_left_middle);

    var style_top = fill_top + "px";
    var style_left = ((right - this.arc_width_ + this.arc_right_placement_) * this.resize_) + "px";
    var style_height = ((this.arc_difference_ * height) * this.resize_) + "px";
    var style_width = (this.arc_width_ * this.resize_) + "px";
    var style_src = URL_ + this.name_ + "arc_" + color + "_right_middle.png";
    LOGGER_.logDebug("Visualisation.drawArc()", {"action" : "draw right middle arc", "top" : style_top, "left" : style_left, "height" : style_height, "width" : style_width, "src" : style_src});
    var arc_right_middle = document.createElementNS(XUL_NAMESPACE_, "image");
    arc_right_middle.style.position = "relative";
    arc_right_middle.style.top = style_top;
    arc_right_middle.style.left = style_left;
    arc_right_middle.style.width = style_width;
    arc_right_middle.style.height = style_height;
    arc_right_middle.style.verticalAlign = "top";
    arc_right_middle.setAttribute("src", style_src);
    this.stack_.appendChild(arc_right_middle);
}


/**
 * Draw a dot
 */
Visualisation.prototype.drawDot = function(container, color, style, left, top)
{
    LOGGER_.logDebug("Visualisation.drawDot()", {"action" : "start", "container" : container.toString(), "color" : color, "style" : style, "left" : left});
    var dot = document.createElementNS(XUL_NAMESPACE_, "image");

    var style_top = top - ((this.dotsize_ / 2) * this.resize_) + "px";
    var style_left = ((left - (this.dotsize_ / 2)) * this.resize_) + "px";
    var style_height = (this.dotsize_ * this.resize_) + "px";
    var style_width = (this.dotsize_ * this.resize_) + "px";
    var style_src = URL_ + this.name_ + "dot_" + color + "_" + style + ".png";
    LOGGER_.logDebug("Visualisation.drawDot()", {"top" : style_top, "left" : style_left, "height" : style_height, "width" : style_width, "src" : style_src});
    dot.style.position = "relative";
    dot.style.top = style_top;
    dot.style.left = style_left;
    dot.style.width = style_width;
    dot.style.height = style_height;
    dot.style.verticalAlign = "top";
    dot.setAttribute("src", style_src);

    dot.container = container;

    var tooltip = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip.setAttribute("orient", "vertical");
    tooltip.setAttribute("id", "ThreadArcsJS_" + left);

    if (! container.isDummy())
    {
        LOGGER_.logDebug("Visualisation.drawDot()", {"action" : "create tooltip start"});
        // if container container message, view details
        var authorlabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var authortext = document.createElementNS(XUL_NAMESPACE_, "label");
        var author = document.createElementNS(XUL_NAMESPACE_, "hbox");
        author.appendChild(authorlabel);
        author.appendChild(authortext);
        authorlabel.setAttribute("value", this.strings_.getString("tooltip.from"));
        authorlabel.style.fontWeight = "bold";
        authortext.setAttribute("value", container.getMessage().getFrom());
        
        var datelabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var datetext = document.createElementNS(XUL_NAMESPACE_, "label");
        var date = document.createElementNS(XUL_NAMESPACE_, "hbox");
        date.appendChild(datelabel);
        date.appendChild(datetext);
        datelabel.setAttribute("value", this.strings_.getString("tooltip.date"));
        datelabel.style.fontWeight = "bold";
        datetext.setAttribute("value", container.getMessage().getDate());

        var subjectlabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var subjecttext = document.createElementNS(XUL_NAMESPACE_, "label");
        var subject = document.createElementNS(XUL_NAMESPACE_, "hbox");
        subject.appendChild(subjectlabel);
        subject.appendChild(subjecttext);
        subjectlabel.setAttribute("value", this.strings_.getString("tooltip.subject"));
        subjectlabel.style.fontWeight = "bold";
        subjecttext.setAttribute("value", container.getMessage().getSubject());

        tooltip.appendChild(author);
        tooltip.appendChild(date);
        tooltip.appendChild(subject);
        LOGGER_.logDebug("Visualisation.drawDot()", {"action" : "create tooltip end"});
    }
    else
    {
        LOGGER_.logDebug("Visualisation.drawDot()", {"action" : "create missing tooltip start"});
        // otherwise we display info about missing message
        var desc1 = document.createElementNS(XUL_NAMESPACE_, "description");
        var desc2 = document.createElementNS(XUL_NAMESPACE_, "description");
        desc1.setAttribute("value", this.strings_.getString("tooltip.missingmessage"));
        desc2.setAttribute("value", this.strings_.getString("tooltip.missingmessagedetail"));
        tooltip.appendChild(desc1);
        tooltip.appendChild(desc2);
        LOGGER_.logDebug("Visualisation.drawDot()", {"action" : "create missing tooltip end"});
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
    LOGGER_.logDebug("Visualisation.getResize()", {"action" : "start", "xcount" : xcount, "ycount" : ycount, "sizex" : sizex, "sizey" : sizey});
    var spaceperarcavailablex = sizex / (xcount - 1);
    var spaceperarcavailabley = sizey / 2;
    var spaceperarcneededx = this.dotsize_ + (2 * this.arc_width_);
    var spaceperarcneededy = (this.dotsize_ / 2) + this.arc_height_ + ycount * this.arc_difference_;
    
    var resizex = (spaceperarcavailablex / spaceperarcneededx);
    var resizey = (spaceperarcavailabley / spaceperarcneededy);
    
    var resize = 1;
    if (resizex < resizey)
        resize = resizex;
    else
        resize = resizey;
    
    if (resize > 1)
        resize = 1;
    
    LOGGER_.logDebug("Visualisation.getResize()", {"action" : "end", "resize" : resize});
    return resize;
}


/**
 * mouse click event handler
 * display message user clicked on
 */
Visualisation.prototype.onMouseClick = function(event)
{
    LOGGER_.logDebug("Visualisation.onMouseClick()", {});
    var container = event.target.container;
    if (container && ! container.isDummy())
        THREADARCS_.callback(container.getMessage().getKey(), container.getMessage().getFolder());
}


/**
 * If time scaling is enabled, we want to layout the messages so that their
 * horizontal spacing is proportional to the time difference between those
 * two messages
 */
Visualisation.prototype.timeScaling = function(containers, minimaltimedifference, width)
{
    LOGGER_.logDebug("Visualisation.timeScaling()", {"action" : "start", "containers" : containers.toString(), "minimaltimedifference" : minimaltimedifference, "width" : width});
    // if we do not want to do timescaling, reset all scaling info to 1
    if (! this.pref_timescaling_)
    {
        for (var counter = 0; counter < containers.length - 1; counter++)
        {
            var thiscontainer = containers[counter];
            thiscontainer.x_scaled_ = 1;
        }
        return containers;
    }

    // we want to scale the messages horizontally according to their time difference
    // therefore we calculate the overall scale factor
    var total_time_scale = 0;
    for (var counter = 0; counter < containers.length - 1; counter++)
    {
        var thiscontainer = containers[counter];
        // we norm the scale factor to the minimal time
        // (this means, the two messages that are the nearest in time have a difference of 1)
        thiscontainer.x_scaled_ = thiscontainer.timedifference_ / minimaltimedifference;
        // check if we might encounter a dummy container, see above
        if (thiscontainer.x_scaled_ < 1)
            thiscontainer.x_scaled_ = 1;
        total_time_scale += thiscontainer.x_scaled_;
    }

    // max_count_x tells us how many messages we could display if all are laid out
    // with the minimal horizontal spacing
    var max_count_x = width / (this.dotsize_ + (2 * this.arc_width_));
    
    LOGGER_.logDebug("Visualisation.timeScaling()", {"action" : "first pass done", "total_time_scale" : total_time_scale, "max_count_x" : max_count_x});
    
    // if the time scaling factor is bigger than what we can display, we have a problem
    // this means, we have to scale the timing factor down
    var scaling = 0.9;
    while (total_time_scale > max_count_x)
    {
        total_time_scale = 0;
        for (var counter = 0; counter < containers.length - 1; counter++)
        {
            var thiscontainer = containers[counter];
            thiscontainer.x_scaled_ = thiscontainer.x_scaled_ * scaling;
            if (thiscontainer.x_scaled_ < 1)
                thiscontainer.x_scaled_ = 1;
            total_time_scale += thiscontainer.x_scaled_;
        }
        // if the total_time_scale == containers.length, we reduced every
        // horizontal spacing to its minimum and we can't do anything more
        // this means we have to lay out more messages than we can
        // this is dealt with later in resizing
        if (total_time_scale == containers.length - 1)
            break;
    }
    
    LOGGER_.logDebug("Visualisation.timeScaling()", {"action" : "second pass done", "total_time_scale" : total_time_scale});
    
    return containers;
}


/**
 * Visualise a new thread
 */
Visualisation.prototype.visualise = function(container)
{
    LOGGER_.logDebug("Visualisation.visualise()", {"action" : "start", "container" : container.toString()});
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
    // totalmaxheight counts the maximal number of stacked arcs
    var totalmaxheight = 0;
    // minmaltimedifference stores the minimal time between two messages
    var minimaltimedifference = Number.MAX_VALUE;
    for (var counter = 0; counter < containers.length; counter++)
    {
        var thiscontainer = containers[counter];
        thiscontainer.x_index_ = counter;
        thiscontainer.current_arc_height_incoming_ = 0;
        thiscontainer.current_arc_height_outgoing_ = 0;
        // odd_ tells us if we display the arc above or below the messages
        thiscontainer.odd_ = thiscontainer.getDepth() % 2 == 0;
        var parent = thiscontainer.getParent();
        if (parent != null && ! parent.isRoot())
        {
            // calculate the current maximal arc height between the parent message and this one
            // since we want to draw an arc between this message and its parent, and we do 
            // not want any arcs to overlap, we draw this arc higher than the current highest arc
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
        // also keep track of the current maximal stacked arc height, so that we can resize
        // the whole extension
        if (maxheight > totalmaxheight)
            totalmaxheight = maxheight;
        
        // also keep track of the time difference between two adjacent messages
        if (counter < containers.length - 1)
        {
            var timedifference = containers[counter + 1].getDate().getTime() - containers[counter].getDate().getTime();
            // timedifference_ stores the time difference to the _next_ message
            thiscontainer.timedifference_ = timedifference;
            // since we could have dummy containers that have the same time as the next message,
            // skip any time difference of 0
            if (timedifference < minimaltimedifference && timedifference != 0)
                minimaltimedifference = timedifference;
        }
    }

    var width = this.box_.boxObject.width;
    var height = this.box_.boxObject.height;
    containers = this.timeScaling(containers, minimaltimedifference, width);


    var x = this.spacing_ / 2;
    this.box_.style.paddingRight = x + "px";
    this.resize_ = this.getResize(containers.length, totalmaxheight, width, height);

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
        
        this.drawDot(thiscontainer, color, style, x, (height / 2));
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
            this.drawArc(color, position, maxheight, parent.x_position_, x, (height / 2));
        }
        x = x + (thiscontainer.x_scaled_ * this.spacing_);
    }
}


/**
 * Preference changing observer
 */
Visualisation.prototype.preferenceObserverRegister =  function()
{
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    this.pref_branch_ = prefService.getBranch(THREADARCSJS_PREF_BRANCH_);

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
}


Visualisation.prototype.preferenceObserverUnregister = function()
{
    if(!this.pref_branch_)
        return;

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
}


Visualisation.prototype.observe = function(subject, topic, data)
{
    if(topic != "nsPref:changed")
        return;
    // subject is the nsIPrefBranch we're observing
    this.preferenceReload();
}

Visualisation.prototype.preferenceReload = function()
{
    // check if preference is set to do timescaling
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    this.pref_timescaling_ = false;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMESCALING_) == prefs.PREF_BOOL)
        this.pref_timescaling_ = prefs.getBoolPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMESCALING_);
    
    var todecode = "12x12,12,12,12,6,-1,1,24";
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONSIZE_) == prefs.PREF_STRING)
        todecode = prefs.getCharPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONSIZE_);

    todecode = todecode.split(",");
    this.name_ = todecode[0] + "/";
    this.dotsize_ = parseInt(todecode[1]);
    this.arc_height_ = parseInt(todecode[2]);
    this.arc_width_ = parseInt(todecode[3]);
    this.arc_difference_ = parseInt(todecode[4]);
    this.arc_left_placement_ = parseInt(todecode[5]);
    this.arc_right_placement_ = parseInt(todecode[6]);
    this.spacing_ = parseInt(todecode[7]);
}
