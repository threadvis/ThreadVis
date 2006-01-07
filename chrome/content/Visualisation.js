/** ****************************************************************************
 * Visualisation.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file to visualise thread arcs
 * Re-implementation from Java
 *
 * Version: $Id$
 ******************************************************************************/



var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var URL_ = "chrome://threadarcsjs/content/images/";
var THREADARCSJS_PREF_BRANCH_ = "extensions.threadarcsjs.";
var VISUALISATION_PREF_DOTIMESCALING_ = "timescaling.enabled";
var VISUALISATION_PREF_DOTIMELINE_ = "timeline.enabled";
var VISUALISATION_PREF_VISUALISATIONSIZE_ = "visualisation.size";
var VISUALISATION_PREF_VISUALISATIONCOLOUR_ = "visualisation.colour";
var VISUALISATION_PREF_VISUALISATIONHIGHLIGHT_ = "visualisation.highlight";
var VISUALISATION_PREF_DEFAULTZOOM_HEIGHT_ = "defaultzoom.height";
var VISUALISATION_PREF_DEFAULTZOOM_WIDTH_ = "defaultzoom.width";

var ALPHA_ = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];

var COLOUR_DUMMY_ = "#75756D";
var COLOUR_SINGLE_ = "blue";



// =============================================================================
// =============================================================================
// =============================================================================
// FIXXME
// all container variables that are set here should be accessed by functions
// in the container class
// =============================================================================
// =============================================================================
// =============================================================================



/** ****************************************************************************
 * Constructor for visualisation class
 ******************************************************************************/
function Visualisation()
{
    this.box_ = null;
    this.stack_ = null;
    this.strings_ = null;
    // set default resize parameter
    this.resize_ = 1;
    this.pref_timescaling_ = false;
    this.pref_timeline_ = false;
    this.pref_colour = "single";
    this.pref_highlight_ = false;
    this.pref_defaultzoom_height_ = 1;
    this.pref_defaultzoom_width_ = 1;
    this.zoom_ = 1;

    this.preferenceObserverRegister();
    this.preferenceReload();

    this.authors_ = null;
    this.containers_ = null;
    this.containervisualisations_ = null;
    this.arcvisualisations_ = null;
    this.timeline_ = null;
}



/** ****************************************************************************
 * Calculate size
 ******************************************************************************/
Visualisation.prototype.calculateSize = function(containers)
{
    // totalmaxheight counts the maximal number of stacked arcs
    var totalmaxheight = 0;
    
    // topheight counts the maximal number of stacked arcs on top
    var topheight = 0;
    
    // bottomheight counts the maximal number of stacked arcs on bottom
    var bottomheight = 0;
    
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
            // calculate the current maximal arc height between the parent 
            // message and this one since we want to draw an arc between this 
            // message and its parent, and we do not want any arcs to overlap, 
            // we draw this arc higher than the current highest arc
            var maxheight = 0;
            for (var innercounter = parent.x_index_;
                 innercounter < counter;
                 innercounter++)
            {
                var lookatcontainer = containers[innercounter];
                if (lookatcontainer.odd_ == parent.odd_ && 
                    lookatcontainer.current_arc_height_outgoing_ > maxheight)
                {
                    maxheight = lookatcontainer.current_arc_height_outgoing_;
                }
                if (lookatcontainer.odd_ != parent.odd_ &&
                    lookatcontainer.current_arc_height_incoming_ > maxheight)
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
        
        if (parent.odd_ && maxheight > topheight)
            topheight = maxheight;
        
        if (! parent.odd_ && maxheight > bottomheight)
            bottomheight = maxheight;
        
        // also keep track of the time difference between two adjacent messages
        if (counter < containers.length - 1)
        {
            var timedifference = containers[counter + 1].getDate().getTime() - 
                                 containers[counter].getDate().getTime();
            // timedifference_ stores the time difference to the _next_ message
            thiscontainer.timedifference_ = timedifference;
            // since we could have dummy containers that have the same time as 
            // the next message, skip any time difference of 0
            if (timedifference < minimaltimedifference &&
                timedifference != 0)
                minimaltimedifference = timedifference;
        }
    }

    return {"containers" : containers,
            "totalmaxheight" : totalmaxheight,
            "minimaltimedifference" : minimaltimedifference,
            "topheight": topheight,
            "bottomheight" : bottomheight};
}



/** ****************************************************************************
 * Check size of stack
 * if resized, resize visualisation
 ******************************************************************************/
Visualisation.prototype.checkSize = function()
{
    if (this.box_.boxObject.height != this.box_height_)
        this.visualise();
    
    this.box_height_ = this.box_.boxObject.height;
}



/** ****************************************************************************
 * Clear stack
 * delete all children
 ******************************************************************************/
Visualisation.prototype.clearStack = function()
{
    LOGGER_.logDebug("Visualisation.clearStack()", {});
    while(this.stack_.firstChild != null)
        this.stack_.removeChild(this.stack_.firstChild);
    
    // reset move
    this.stack_.style.marginLeft = "0px";
    this.stack_.style.marginTop = "0px";

}



/** ****************************************************************************
 * Underline authors in header view
 ******************************************************************************/
Visualisation.prototype.colourAuthors = function(authors)
{
    // colour links
    var emailfields = new Array();

    // from, reply-to, ... (single value fields)
    var singlefields = document.getElementById("expandedHeaderView").getElementsByTagName("mail-emailheaderfield");
    for (var i = 0; i < singlefields.length; i++)
    {
        if (singlefields[i].emailAddressNode.attributes["emailAddress"])
            emailfields.push(singlefields[i].emailAddressNode);
    }

    // to, cc, bcc, ... (multi value fields)
    var multifields = document.getElementById("expandedHeaderView").getElementsByTagName("mail-multi-emailHeaderField");
    for (var i = 0; i < multifields.length; i++)
    {
        // get "normal" header fields (i.e. non expanded cc and to)
        var multifield = multifields[i].emailAddresses.childNodes;
        for (var j = 0; j < multifield.length; j++)
        {
            if (multifield[j].attributes["emailAddress"])
                emailfields.push(multifield[j]);
        }
        
        // get "expanded" header fields
        multifield = multifields[i].longEmailAddresses.childNodes;
        for (var j = 0; j < multifield.length; j++)
        {
            if (multifield[j].attributes["emailAddress"])
                emailfields.push(multifield[j]);
        }
    }

    var emailfield = null;
    while (emailfield = emailfields.pop())
    {
        var colour = authors[emailfield.attributes["emailAddress"].value];
        if (colour && this.pref_highlight_)
            emailfield.style.borderBottom = "2px solid " + this.getColour(colour, 1.0, 1.0);
        else
            emailfield.style.borderBottom = "";
    }
}



/** ****************************************************************************
 * Convert a HSV colour to a RGB colour
 *******************************************************************************/
Visualisation.prototype.convertHSVtoRGB = function(hue,
                                                   saturation,
                                                   value)
{
    // hue in [0..6]
    // saturation, value in [0..1]
    var i = Math.floor(hue);
    var f = hue - i;
    if (! i % 2 == 1)
        f = 1 - f;
    var m = value * (1 - saturation);
    var n = value * (1 - saturation * f);
    switch(i)
    {
        case 6:
        case 0:
            return {"r" : value, "g" : n, "b" : m};
        case 1:
            return {"r" : n, "g" : value, "b" : m};
        case 2:
            return {"r" : m, "g" : value, "b" : n};
        case 3:
            return {"r" : m, "g" : n, "b" : value};
        case 4:
            return {"r" : n, "g" : m, "b" : value};
        case 5:
            return {"r" : value, "g" : m, "b" : n};
    }
}



/** ****************************************************************************
 * Create stack
 ******************************************************************************/
Visualisation.prototype.createStack = function()
{
    LOGGER_.logDebug("Visualisation.createStack()", {});
    this.box_ = document.getElementById("ThreadArcsJSBox");
    this.stack_ = document.getElementById("ThreadArcsJSStack");
    this.strings_ = document.getElementById("ThreadArcsJSStrings");

    var ref = this;
    if (! this.stack_)
    {
        LOGGER_.logDebug("Visualisation.createStack()", {"action" : "create stack"});
        this.stack_ = document.createElementNS(XUL_NAMESPACE_, "stack");
        this.stack_.setAttribute("id", "ThreadArcsJSStack");
        this.stack_.style.position = "relative";
        this.box_.appendChild(this.stack_);
        this.box_.addEventListener("mousemove", function(event) {ref.onMouseMove(event);}, false);
        this.box_.addEventListener("mousedown", function(event) {ref.onMouseDown(event);}, false);
        this.box_.addEventListener("mouseup", function(event) { ref.onMouseUp(event); }, false);
        this.box_.addEventListener("DOMMouseScroll", function(event) {ref.onScroll(event);}, false);
    }
    else
    {
        LOGGER_.logDebug("Visualisation.createStack()", {"action" : "clear stack"});
        this.clearStack();
    }

    var loading = document.createElementNS(XUL_NAMESPACE_, "description");
    loading.setAttribute("value", this.strings_.getString("visualisation.loading"));
    loading.style.position = "relative";
    loading.style.top = "20px"
    loading.style.left = "20px"
    loading.style.color = "#999999";
    this.stack_.appendChild(loading);
}



/** ****************************************************************************
 * Get hexadecimal representation of a decimal number
 ******************************************************************************/
Visualisation.prototype.DECtoHEX = function(dec)
{
    var n_ = Math.floor(dec / 16)
    var _n = dec - n_*16;
    return ALPHA_[n_] + ALPHA_[_n];
}



/** ****************************************************************************
 * Draw arc
 ******************************************************************************/
Visualisation.prototype.drawArc = function(colour,
                                           vposition,
                                           height,
                                           left,
                                           right,
                                           top)
{
    var arc = new ArcVisualisation(this.stack_,
                                   this.dotsize_,
                                   this.resize_,
                                   this.arc_min_height_,
                                   this.arc_difference_,
                                   this.arc_radius_,
                                   this.arc_width_,
                                   colour,
                                   vposition,
                                   height,
                                   left,
                                   right,
                                   top);
    return arc;
}



/** ****************************************************************************
 * Draw a dot
 ******************************************************************************/
Visualisation.prototype.drawDot = function(container,
                                           colour,
                                           left,
                                           top,
                                           selected,
                                           circle,
                                           flash)
{
    var msg = new ContainerVisualisation(this.stack_,
                                         this.strings_,
                                         container,
                                         colour,
                                         left,
                                         top,
                                         selected,
                                         this.dotsize_,
                                         this.resize_,
                                         circle,
                                         flash,
                                         this.spacing_);
    return msg;
}



/** ****************************************************************************
 * Get a colour for the arc
 ******************************************************************************/
Visualisation.prototype.getColour = function(hue, saturation, value)
{
    if (! value)
        value = 1.0;
    if (! saturation)
        saturation = 1.0;

    rgb = this.convertHSVtoRGB(hue, saturation, value);

    return "#" + this.DECtoHEX(Math.floor(rgb.r * 255)) + 
                 this.DECtoHEX(Math.floor(rgb.g * 255)) + 
                 this.DECtoHEX(Math.floor(rgb.b * 255));
}



/** ****************************************************************************
 * Get a new colour for the arc
 ******************************************************************************/
Visualisation.prototype.getNewColour = function()
{
    this.lastcolour_ = (this.lastcolour_ + 1.3) % 6;
    return this.lastcolour_
}



/** ****************************************************************************
 * Get resize multiplicator
 * calculate from box width and height
 * and needed width and height
 *******************************************************************************/
Visualisation.prototype.getResize = function(xcount,
                                             ycount,
                                             sizex,
                                             sizey)
{
    LOGGER_.logDebug("Visualisation.getResize()",
                        {"action" : "start",
                         "xcount" : xcount,
                         "ycount" : ycount,
                         "sizex" : sizex,
                         "sizey" : sizey});

    var spaceperarcavailablex = sizex / xcount;
    var spaceperarcavailabley = sizey / 2;
    var spaceperarcneededx = this.spacing_;
    var spaceperarcneededy = (this.dotsize_ / 2) + this.arc_min_height_ + 
                             (ycount + 1) * this.arc_difference_;

    var resizex = (spaceperarcavailablex / spaceperarcneededx);
    var resizey = (spaceperarcavailabley / spaceperarcneededy);

    var resize = 1;
    if (resizex < resizey)
        resize = resizex;
    else
        resize = resizey;

    if (resize > 1)
        resize = 1;

    LOGGER_.logDebug("Visualisation.getResize()",
                        {"action" : "end",
                        "resize" : resize,
                        "resizex" : resizex,
                        "resizey" : resizey,
                        "spaceperarcavailablex" : spaceperarcavailablex,
                        "spaceperarcavailabley" : spaceperarcavailabley,
                        "spaceperarcneededx" : spaceperarcneededx,
                        "spaceperarcneededy" : spaceperarcneededy});
    return resize;
}



/** ****************************************************************************
 * Move visualisation to show current message
 ******************************************************************************/
Visualisation.prototype.moveVisualisation = function(container)
{
    // get current left margin
    var old_margin = this.stack_.style.marginLeft;
    old_margin = parseInt(old_margin.replace(/px/, ""));
    var new_margin = old_margin;
    
    var original_width = this.box_.boxObject.width;
    var original_height = this.box_.boxObject.height;
    var height = original_height * this.zoom_ * this.pref_defaultzoom_height_;
    
    if (container.x_position_ * this.resize_ + old_margin > original_width)
    {
        // calculate necessary margin
        new_margin = - (container.x_position_ * this.resize_ - original_width) 
                     - (this.spacing_ * this.resize_);
        
        // if we already see the selected message, don't move any further
        if (new_margin > old_margin)
        {
            new_margin = old_margin;
        }
    }
    if (container.x_position_ * this.resize_ + old_margin < (this.spacing_ / 2) * this.resize_)
    {
        // calculate necessary margin
        new_margin = (- container.x_position_ + (this. spacing_ / 2))* this.resize_;
    }
    
    this.stack_.style.marginLeft = new_margin + "px";
}



/** ****************************************************************************
 * observe preferences change
 ******************************************************************************/
Visualisation.prototype.observe = function(subject, topic, data)
{
    if(topic != "nsPref:changed")
        return;
    // subject is the nsIPrefBranch we're observing
    this.preferenceReload();
}



/** ****************************************************************************
 * mouse click event handler
 * display message user clicked on
 ******************************************************************************/
Visualisation.prototype.onMouseClick = function(event)
{
    LOGGER_.logDebug("Visualisation.onMouseClick()", {});
    var container = event.target.container;
    if (container && ! container.isDummy())
        THREADARCS_.callback(container.getMessage().getKey(), 
                             container.getMessage().getFolder());
}



/** ****************************************************************************
 * OnMouseDown event handler
 * on left mouse button down, remember mouse position and enable panning
 ******************************************************************************/
Visualisation.prototype.onMouseDown = function(event)
{
    // only pan on left click
    if (event.button != 0)
        return;
    
    this.startx_ = event.clientX;
    this.starty_ = event.clientY;
    this.panning_ = true;
}



/** ****************************************************************************
 * OnMouseMove event handler
 * if panning is enabled, read new mouse position and move box accordingly
 ******************************************************************************/
Visualisation.prototype.onMouseMove = function(event)
{
    if (this.panning_)
    {
        var x = event.clientX;
        var y = event.clientY;
        var dx = x - this.startx_;
        var dy = y - this.starty_;
        var currentx = this.stack_.style.marginLeft.replace(/px/, "");
        if (currentx == "") currentx = 0;
        var currenty = this.stack_.style.marginTop.replace(/px/, "");
        if (currenty == "") currenty = 0;
        dx = parseInt(currentx) + parseInt(dx);
        dy = parseInt(currenty) + parseInt(dy);
        this.startx_ = x;
        this.starty_ = y;
        
        var boxwidth = this.box_.boxObject.width;
        var boxheight = this.box_.boxObject.height;
        var stackwidth = this.stack_.boxObject.width;
        var stackheight = this.stack_.boxObject.height;
        
        // don't move more to the right than necessary
        if (dx > 0)
            dx = 0;
        
        // don't move more to the left than necessary
        if (stackwidth > boxwidth && dx < boxwidth - stackwidth)
            dx = boxwidth - stackwidth;
        
        // don't move more to the top than necessary
        if (stackheight < boxheight && dy < 0)
            dy = 0;
        if (stackheight > boxheight && dy < boxheight - stackheight)
            dy = boxheight - stackheight;
        
         // don't move more to the bottom than necessary
        if (dy > 0)
            dy = 0;

        this.stack_.style.marginLeft = dx + "px";
        this.stack_.style.marginTop = dy + "px";
    }
}



/** ****************************************************************************
 * OnMouseUp event handler
 * disable panning when mouse button is released
 ******************************************************************************/
Visualisation.prototype.onMouseUp = function(event)
{
    this.panning_ = false;
}



/** ****************************************************************************
 * OnScroll event handler
 * if mouse wheel is moved, zoom in and out of visualisation
 ******************************************************************************/
Visualisation.prototype.onScroll = function(event)
{
    // event.detail gives number of lines to scroll
    // positive number means scroll down
    if (event.detail > 0)
    {
        this.zoomIn();
    }
    else
    {
        this.zoomOut();
    }
}



/** ****************************************************************************
 * Preference changing observer
 ******************************************************************************/
Visualisation.prototype.preferenceObserverRegister =  function()
{
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);
    this.pref_branch_ = prefService.getBranch(THREADARCSJS_PREF_BRANCH_);

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
}



/** ****************************************************************************
 * unregister observer
 ******************************************************************************/
Visualisation.prototype.preferenceObserverUnregister = function()
{
    if(!this.pref_branch_)
        return;

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
}



/** ****************************************************************************
 * reload all preferences
 ******************************************************************************/
Visualisation.prototype.preferenceReload = function()
{
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);

    this.pref_timescaling_ = false;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMESCALING_) == prefs.PREF_BOOL)
        this.pref_timescaling_ = prefs.getBoolPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMESCALING_);

    this.pref_timeline_ = false;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMELINE_) == prefs.PREF_BOOL)
        this.pref_timeline_ = prefs.getBoolPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMELINE_);

    this.pref_colour_ = "single";
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONCOLOUR_) == prefs.PREF_STRING)
        this.pref_colour_ = prefs.getCharPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONCOLOUR_);

    this.pref_highlight_ = false;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONHIGHLIGHT_) == prefs.PREF_BOOL)
        this.pref_highlight_ = prefs.getBoolPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONHIGHLIGHT_);

    this.pref_defaultzoom_height_ = 1;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DEFAULTZOOM_HEIGHT_) == prefs.PREF_INT)
        this.pref_defaultzoom_height_ = prefs.getIntPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DEFAULTZOOM_HEIGHT_);

    this.pref_defaultzoom_width_ = 1;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DEFAULTZOOM_WIDTH_) == prefs.PREF_INT)
        this.pref_defaultzoom_width_ = prefs.getIntPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DEFAULTZOOM_WIDTH_);

    var todecode = "12x12,12,12,32,6,2,24";
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONSIZE_) == prefs.PREF_STRING)
        todecode = prefs.getCharPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_VISUALISATIONSIZE_);

    todecode = todecode.split(",");
    this.name_ = todecode[0] + "/";
    this.dotsize_ = parseInt(todecode[1]);
    this.arc_min_height_ = parseInt(todecode[2]);
    this.arc_radius_ = parseInt(todecode[3]);
    this.arc_difference_ = parseInt(todecode[4]);
    this.arc_width_ = parseInt(todecode[5]);
    this.spacing_ = parseInt(todecode[6]);
}



/** ****************************************************************************
 * Reset stack
 * set all margins to zero
 ******************************************************************************/
Visualisation.prototype.resetStack = function()
{
    LOGGER_.logDebug("Visualisation.resetStack()", {});
    this.stack_.style.marginLeft = "0px";
    this.stack_.style.marginTop = "0px";
}



/** ****************************************************************************
 * If time scaling is enabled, we want to layout the messages so that their 
 * horizontal spacing is proportional to the time difference between 
 * those two messages
 ******************************************************************************/
Visualisation.prototype.timeScaling = function(containers,
                                               minimaltimedifference,
                                               width)
{
    LOGGER_.logDebug("Visualisation.timeScaling()",
                        {"action" : "start",
                         "containers" : containers.toString(),
                         "minimaltimedifference" : minimaltimedifference,
                         "width" : width,
                         "no. containers:" : containers.length});

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

    // we want to scale the messages horizontally according to their 
    // time difference
    // therefore we calculate the overall scale factor
    var total_time_scale = 0;
    for (var counter = 0; counter < containers.length - 1; counter++)
    {
        var thiscontainer = containers[counter];
        // we norm the scale factor to the minimal time
        // (this means, the two messages that are the nearest in time 
        // have a difference of 1)
        thiscontainer.x_scaled_ = thiscontainer.timedifference_ / minimaltimedifference;
        // check if we might encounter a dummy container, see above
        if (thiscontainer.x_scaled_ < 1)
            thiscontainer.x_scaled_ = 1;
        total_time_scale += thiscontainer.x_scaled_;
    }

    // max_count_x tells us how many messages we could display if all are 
    // laid out with the minimal horizontal spacing
    // e.g.
    // |---|---|---|
    // width / this.spacing_ would lead to 3, but in effect we can only
    // fit 2, since we want some spacing between the messages and the border
    var max_count_x = (width / this.spacing_) - 1;

    LOGGER_.logDebug("Visualisation.timeScaling()", 
                        {"action" : "first pass done",
                         "total_time_scale" : total_time_scale,
                         "max_count_x" : max_count_x});

    // if the time scaling factor is bigger than what we can display, we have 
    // a problem
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

    LOGGER_.logDebug("Visualisation.timeScaling()",
                        {"action" : "second pass done", 
                         "total_time_scale" : total_time_scale});

    return containers;
}



/** ****************************************************************************
 * Visualise a new thread
 ******************************************************************************/
Visualisation.prototype.visualise = function(container)
{
    if (container == null)
        container = this.currentcontainer_;

    LOGGER_.logDebug("Visualisation.visualise()",
                        {"action" : "start",
                         "container" : container.toString()});

    // check if we are still in the same thread as last time
    // if not, reset zoom level
    if (! this.currentcontainer_ || 
        container.getTopContainer() != this.currentcontainer_.getTopContainer())
    {
        this.createStack();
        this.clearStack();
        this.zoomReset();
        this.resetStack();
    }
    else
    {
        this.visualiseExisting(container);
        return;
    }

    // remember current container to redraw after zoom
    this.currentcontainer_ = container;

    // get topmost container
    var topcontainer = container.getTopContainer();

    // get all containers in thread as array
    this.containers_ = new Array();
    this.containers_.push(topcontainer);
    this.containers_ = this.containers_.concat(topcontainer.getChildren());

    // sort containers by date
    this.containers_.sort(Container_sortFunction);


    // pre-calculate size
    var presize = this.calculateSize(this.containers_);
    this.containers_ = presize.containers;
    // totalmaxheight counts the maximal number of stacked arcs
    var totalmaxheight = presize.totalmaxheight;
    // minmaltimedifference stores the minimal time between two messages
    var minimaltimedifference = presize.minimaltimedifference;

    var topheight = this.dotsize_ / 2 + this.arc_min_height_ + presize.topheight * this.arc_difference_;
    var bottomheight = this.dotsize_ / 2 + this.arc_min_height_ + presize.bottomheight * this.arc_difference_;

    // do time scaling
    var original_width = this.box_.boxObject.width;
    var original_height = this.box_.boxObject.height;

    var width = original_width * this.zoom_ * this.pref_defaultzoom_width_;
    var height = original_height * this.zoom_ * this.pref_defaultzoom_height_;

    this.containers_ = this.timeScaling(this.containers_,
                                        minimaltimedifference,
                                        width);

    // do final resizing
    var x = this.spacing_ / 2;
    this.resize_ = this.getResize(this.containers_.length,
                                  totalmaxheight,
                                  width,
                                  height);

    // pre-calculate colours for different authors
    this.authors_ = new Object();
    this.lastcolour_ = 2;

    this.containervisualisations_ = new Array();
    this.arcvisualisations_ = new Array();
    
    for (var counter = 0;
         counter < this.containers_.length;
         counter++)
    {
        var thiscontainer = this.containers_[counter];

        var selected = thiscontainer == container;

        var colour = COLOUR_DUMMY_;
        if (! thiscontainer.isDummy())
        {
            if (this.pref_colour_ == "single")
            {
                if (selected)
                    colour = COLOUR_SINGLE_;
                else
                    colour = COLOUR_DUMMY_;
            }
            else
            {
                if (this.authors_[thiscontainer.getMessage().getFromEmail()] != null)
                {
                    colour = this.authors_[thiscontainer.getMessage().getFromEmail()];
                }
                else
                {
                    colour = this.getNewColour();
                    this.authors_[thiscontainer.getMessage().getFromEmail()] = colour;
                }
                if (selected)
                    colour = this.getColour(colour, 1, 0.8);
                else
                    colour = this.getColour(colour, 0.8, 0.8);
            }
        }

        // only display black circle to highlight selected message
        // if we are using more than one colour
        var circle = this.pref_colour_ == "single" ? false : true;

        // at the moment, don't flash
        // note: dot only flashes if circle == true
        var flash = false;

        this.containervisualisations_[thiscontainer] =
            this.drawDot(thiscontainer,
                         colour,
                         x,
                         topheight,
                         selected,
                         circle,
                         flash);

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

            var maxheight = 0;
            for (var innercounter = parent.x_index_;
                 innercounter < counter;
                 innercounter++)
            {
                var lookatcontainer = this.containers_[innercounter];
                if (lookatcontainer.odd_ == parent.odd_ && 
                    lookatcontainer.current_arc_height_outgoing_ > maxheight)
                {
                    maxheight = lookatcontainer.current_arc_height_outgoing_;
                }
                if (lookatcontainer.odd_ != parent.odd_ &&
                    lookatcontainer.current_arc_height_incoming_ > maxheight)
                {
                    maxheight = lookatcontainer.current_arc_height_incoming_;
                }
            }
            maxheight++;
            parent.current_arc_height_outgoing_ = maxheight;
            thiscontainer.current_arc_height_incoming_ = maxheight;

            // if we are using a single colour, display all arcs from
            // a selected message in this colour
            if (this.pref_colour_ == "single")
                colour = parent == container || selected ? COLOUR_SINGLE_ : COLOUR_DUMMY_;

            this.arcvisualisations_[thiscontainer] =
                this.drawArc(colour,
                             position,
                             maxheight,
                             parent.x_position_,
                             x,
                             topheight);
        }
        x = x + (thiscontainer.x_scaled_ * this.spacing_);
    }
    
    // underline authors if enabled
    this.colourAuthors(this.authors_);
    
    // calculate if we have to move the visualisation so that the
    // selected message is visible
    this.moveVisualisation(container);
    
    // create a new box and overlay over all other elements to catch
    // all clicks and drags
    var popupbox = document.createElementNS(XUL_NAMESPACE_, "box");
    popupbox.style.width = "100%";
    popupbox.style.height = "100%";
    popupbox.setAttribute("context", "ThreadArcsJSPopUp");
    this.stack_.appendChild(popupbox);
    
    // check for resize of box
    
    this.box_height_ = this.box_.boxObject.height;
    var ref = this;
    clearInterval(this.check_resize_interval_);
    this.check_resize_interval_ = setInterval(function() {ref.checkSize();}, 100);
    
    if (this.pref_timeline_)
    {
        this.timeline_ = new Timeline(this.stack_,
                                      this.strings_,
                                      this.containers_,
                                      this.resize_,
                                      this.dotsize_,
                                      topheight - this.arc_min_height_ - this.dotsize_ + this.arc_width_ + 2);
        this.timeline_.draw();
    }
}



/** ****************************************************************************
 * Visualise an existing thread
 ******************************************************************************/
Visualisation.prototype.visualiseExisting = function(container)
{
    // remember current container to redraw after zoom
    this.currentcontainer_ = container;
    
    // pre-calculate size
    var presize = this.calculateSize(this.containers_);
    this.containers_ = presize.containers;
    // totalmaxheight counts the maximal number of stacked arcs
    var totalmaxheight = presize.totalmaxheight;
    // minmaltimedifference stores the minimal time between two messages
    var minimaltimedifference = presize.minimaltimedifference;

    var topheight = this.dotsize_ / 2 + this.arc_min_height_ + presize.topheight * this.arc_difference_;
    var bottomheight = this.dotsize_ / 2 + this.arc_min_height_ + presize.bottomheight * this.arc_difference_;

    var original_width = this.box_.boxObject.width;
    var original_height = this.box_.boxObject.height;
    var width = original_width * this.zoom_ * this.pref_defaultzoom_width_;
    var height = original_height * this.zoom_ * this.pref_defaultzoom_height_;
    
    this.containers_ = this.timeScaling(this.containers_,
                                        minimaltimedifference,
                                        width);
    
    // do final resizing
    var x = this.spacing_ / 2;
    this.resize_ = this.getResize(this.containers_.length,
                                  totalmaxheight,
                                  width,
                                  height);


    for (var counter = 0;
         counter < this.containers_.length;
         counter++)
    {
        var thiscontainer = this.containers_[counter];

        var selected = thiscontainer == container;

        // only display black circle to highlight selected message
        // if we are using more than one colour
        var circle = this.pref_colour_ == "single" ? false : true;

        // at the moment, don't flash
        // note: dot only flashes if circle == true
        var flash = false;

        this.containervisualisations_[thiscontainer].redraw(this.resize_, x, topheight, selected, flash);

        thiscontainer.x_position_ = x;
        
        var parent = thiscontainer.getParent()
        if (parent != null && ! parent.isRoot())
        {
            this.arcvisualisations_[thiscontainer].redrawArc(this.resize_, parent.x_position_, x, topheight)
        }
        
        x = x + (thiscontainer.x_scaled_ * this.spacing_);
    }
    
    // calculate if we have to move the visualisation so that the
    // selected message is visible
    this.moveVisualisation(container);
    
    // underline authors if enabled
    this.colourAuthors(this.authors_);
    
    if (this.pref_timeline_ && this.timeline_)
        this.timeline_.redraw(this.resize_,
                              topheight - this.arc_min_height_ - this.dotsize_ + this.arc_width_ + 2);
}



/** ****************************************************************************
 * Zoom in and draw new visualisation
 ******************************************************************************/
Visualisation.prototype.zoomIn = function(amount)
{
    if (! isFinite(amount) || amount == 0)
        amount = 1;

    this.zoom_ = this.zoom_ + 0.1 * amount;
    
    clearTimeout(this.zoom_timeout_);
    var ref = this;
    this.zoom_timeout_ = setTimeout(function() {ref.visualise();}, 500);
    
    LOGGER_.log("zoom", {"action" : "in", "zoomlevel" : this.zoom_, "delta" : amount});
}



/** ****************************************************************************
 * Zoom out and draw new visualisation
 ******************************************************************************/
Visualisation.prototype.zoomOut = function(amount)
{
    if (! isFinite(amount) || amount == 0)
        amount = 1;
    
    this.zoom_ = this.zoom_ - 0.1 * amount;
    //if (this.zoom_ < 1)
    //    this.zoom_ = 1;
    if (this.zoom_ < 0.1)
        this.zoom_ = 0.1;
    
    clearTimeout(this.zoom_timeout_);
    var ref = this;
    this.zoom_timeout_ = setTimeout(function() {ref.visualise();}, 500);
    
    LOGGER_.log("zoom", {"action" : "out", "zoomlevel" : this.zoom_, "delta" : amount});
}



/** ****************************************************************************
 * Reset Zoom level
 ******************************************************************************/
Visualisation.prototype.zoomReset = function()
{
    this.zoom_ = 1.0;
}



/** ****************************************************************************
 * Zoom function to call from user click
 ******************************************************************************/
function zoomIn()
{
    THREADARCS_.visualisation_.zoomIn();
}



/** ****************************************************************************
 * Zoom function to call from user click
 ******************************************************************************/
function zoomOut()
{
    THREADARCS_.visualisation_.zoomOut();
}
