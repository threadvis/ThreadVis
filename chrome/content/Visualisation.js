/** ****************************************************************************
 * Visualisation.js
 *
 * (c) 2005 Alexander C. Hubmann
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
var VISUALISATION_PREF_VISUALISATIONSIZE_ = "visualisationsize";

var ALPHA_ = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];



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

    this.preferenceObserverRegister();
    this.preferenceReload();
    this.createStack();
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
    LOGGER_.logDebug("Visualisation.drawArc()", {"action" : "start",
                                                 "colour" : colour,
                                                 "vposition" : vposition,
                                                 "height" : height,
                                                 "left" : left,
                                                 "right" : right});
    var arc_top = 0;
    var fill_top = 0;
    if (vposition == "top")
        arc_top = top - (((this.dotsize_ / 2) + this.arc_min_height_ + 
                  (this.arc_difference_ * height)) * this.resize_);
    else
        arc_top = top + ((this.dotsize_ / 2) * this.resize_);

    var style_top = (arc_top) + "px";
    var style_left = ((left - (this.arc_width_ / 2)) * this.resize_) + "px";
    var style_height = ((this.arc_min_height_ + this.arc_difference_ * height) * 
                       this.resize_) + "px";
    var style_width = ((right - left + this.arc_width_) * this.resize_)+ "px";
    var style_background = colour;
    LOGGER_.logDebug("Visualisation.drawArc()",
                        {"action" : "draw arc",
                         "top" : style_top,
                         "left" : style_left,
                         "height" : style_height,
                         "width" : style_width,
                         "background" : style_background});

    var arc = document.createElementNS(XUL_NAMESPACE_, "box");
    arc.style.position = "relative";
    arc.style.top = style_top;
    arc.style.left = style_left;
    arc.style.height = style_height;
    arc.style.width = style_width;
    arc.style.verticalAlign = "top";
    if (vposition == "top")
    {
        arc.style.MozBorderRadiusTopleft = this.arc_radius_ + "px";
        arc.style.MozBorderRadiusTopright = this.arc_radius_ + "px"
        arc.style.borderTop = (this.arc_width_ * this.resize_) + 
                              "px solid " + style_background;
        arc.style.borderLeft = (this.arc_width_ * this.resize_) + 
                               "px solid " + style_background;
        arc.style.borderRight = (this.arc_width_ * this.resize_) + 
                                "px solid " + style_background;
    }
    else
    {
        arc.style.MozBorderRadiusBottomleft = this.arc_radius_ + "px";
        arc.style.MozBorderRadiusBottomright = this.arc_radius_ + "px";
        arc.style.borderBottom = (this.arc_width_ * this.resize_) + 
                                 "px solid " + style_background;
        arc.style.borderLeft = (this.arc_width_ * this.resize_) + 
                               "px solid " + style_background;
        arc.style.borderRight = (this.arc_width_ * this.resize_) + 
                                "px solid " + style_background;
    }
    this.stack_.appendChild(arc);
}



/** ****************************************************************************
 * Draw a dot
 ******************************************************************************/
Visualisation.prototype.drawDot = function(container,
                                           colour,
                                           style,
                                           left,
                                           top,
                                           selected)
{
    LOGGER_.logDebug("Visualisation.drawDot()",
                        {"action" : "start",
                         "container" : container.toString(),
                         "colour" : colour,
                         "style" : style,
                         "left" : left,
                         "top" : top});

    var dot = document.createElementNS(XUL_NAMESPACE_, "box");

    var style_top = (top - ((this.dotsize_ / 2) * this.resize_)) + "px";
    var style_left = ((left - (this.dotsize_ / 2)) * this.resize_) + "px";
    var style_height = (this.dotsize_ * this.resize_) + "px";
    var style_width = (this.dotsize_ * this.resize_) + "px";
    var style_background = "";
    var style_border = "";
    if (style != "half")
    {
        style_background = colour;
    }
    else
    {
        style_border = (this.dotsize_ / 4 * this.resize_) + 
                           "px solid " + colour;
    }

    LOGGER_.logDebug("Visualisation.drawDot()",
                        {"top" : style_top,
                         "left" : style_left,
                         "height" : style_height,
                         "width" : style_width,
                         "background" : style_background,
                         "border" : style_border});

    dot.style.position = "relative";
    dot.style.top = style_top;
    dot.style.left = style_left;
    dot.style.width = style_width;
    dot.style.height = style_height;
    dot.style.verticalAlign = "top";
    dot.style.background = style_background;
    dot.style.border = style_border;
    if (style != "dummy")
        dot.style.MozBorderRadius = style_width;
    dot.container = container;


    if (selected)
    {
        var circle = document.createElementNS(XUL_NAMESPACE_, "box");

        var style_top = (top - ((this.dotsize_ * 4/6) * this.resize_)) + "px";
        var style_left = ((left - (this.dotsize_ * 4/6)) * this.resize_) + "px";
        var style_height = (this.dotsize_ * 8/6 * this.resize_) + "px";
        var style_width = (this.dotsize_ * 8/6 * this.resize_) + "px";
        var style_background = "";
        var style_border = "";
        style_border = (this.dotsize_ / 6 * this.resize_) + 
                           "px solid black";

        LOGGER_.logDebug("Visualisation.drawDot()",
                            {"action" : "draw selection circle",
                             "top" : style_top,
                             "left" : style_left,
                             "height" : style_height,
                             "width" : style_width,
                             "background" : style_background,
                             "border" : style_border});

        circle.style.position = "relative";
        circle.style.top = style_top;
        circle.style.left = style_left;
        circle.style.width = style_width;
        circle.style.height = style_height;
        circle.style.verticalAlign = "top";
        circle.style.border = style_border;
        circle.style.MozBorderRadius = style_width;
        circle.container = container;
    }


    var tooltip = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip.setAttribute("orient", "vertical");
    tooltip.setAttribute("id", "ThreadArcsJS_" + left);

    if (! container.isDummy())
    {
        LOGGER_.logDebug("Visualisation.drawDot()",
                            {"action" : "create tooltip start"});

        // if container container message, view details
        var authorlabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var authortext = document.createElementNS(XUL_NAMESPACE_, "label");
        var author = document.createElementNS(XUL_NAMESPACE_, "hbox");
        author.appendChild(authorlabel);
        author.appendChild(authortext);
        authorlabel.setAttribute("value",
                                 this.strings_.getString("tooltip.from"));
        authorlabel.style.fontWeight = "bold";
        authortext.setAttribute("value",
                                container.getMessage().getFrom());

        var datelabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var datetext = document.createElementNS(XUL_NAMESPACE_, "label");
        var date = document.createElementNS(XUL_NAMESPACE_, "hbox");
        date.appendChild(datelabel);
        date.appendChild(datetext);
        datelabel.setAttribute("value",
                               this.strings_.getString("tooltip.date"));
        datelabel.style.fontWeight = "bold";
        datetext.setAttribute("value",
                              container.getMessage().getDate());

        var subjectlabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var subjecttext = document.createElementNS(XUL_NAMESPACE_, "label");
        var subject = document.createElementNS(XUL_NAMESPACE_, "hbox");
        subject.appendChild(subjectlabel);
        subject.appendChild(subjecttext);
        subjectlabel.setAttribute("value",
                                  this.strings_.getString("tooltip.subject"));
        subjectlabel.style.fontWeight = "bold";
        subjecttext.setAttribute("value",
                                 container.getMessage().getSubject());

        tooltip.appendChild(author);
        tooltip.appendChild(date);
        tooltip.appendChild(subject);
        LOGGER_.logDebug("Visualisation.drawDot()",
                            {"action" : "create tooltip end"});
    }
    else
    {
        LOGGER_.logDebug("Visualisation.drawDot()",
                            {"action" : "create missing tooltip start"});

        // otherwise we display info about missing message
        var desc1 = document.createElementNS(XUL_NAMESPACE_, "description");
        var desc2 = document.createElementNS(XUL_NAMESPACE_, "description");
        desc1.setAttribute("value",
                           this.strings_.getString("tooltip.missingmessage"));
        desc2.setAttribute("value",
                           this.strings_.getString("tooltip.missingmessagedetail"));
        tooltip.appendChild(desc1);
        tooltip.appendChild(desc2);
        LOGGER_.logDebug("Visualisation.drawDot()",
                            {"action" : "create missing tooltip end"});
    }

    dot.setAttribute("tooltip", "ThreadArcsJS_" + left);
    this.stack_.appendChild(dot);
    if (circle)
    {
        circle.setAttribute("tooltip", "ThreadArcsJS_" + left);
        this.stack_.appendChild(circle);
    }
    this.stack_.appendChild(tooltip);
    dot.addEventListener("click", this.onMouseClick, true);
}



/** ****************************************************************************
 * Get a colour for the arc
 ******************************************************************************/
Visualisation.prototype.getColour = function(hue, saturation)
{
    rgb = this.convertHSVtoRGB(hue, saturation, 0.7);

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
 * Get hexadecimal representation of a decimal number
 ******************************************************************************/
Visualisation.prototype.DECtoHEX = function(dec)
{
    var n_ = Math.floor(dec / 16)
    var _n = dec - n_*16;
    return ALPHA_[n_] + ALPHA_[_n];
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

    var spaceperarcavailablex = sizex / (xcount - 1);
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
                        "resize" : resize});
    return resize;
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
                         "width" : width});

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
    var max_count_x = width / this.spacing_;

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
    LOGGER_.logDebug("Visualisation.visualise()",
                        {"action" : "start",
                         "container" : container.toString()});

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

    var width = this.box_.boxObject.width;
    var height = this.box_.boxObject.height;
    containers = this.timeScaling(containers,
                                  minimaltimedifference,
                                  width);


    var x = this.spacing_ / 2;
    this.box_.style.paddingRight = x + "px";
    this.resize_ = this.getResize(containers.length,
                                  totalmaxheight,
                                  width,
                                  height);

    // pre-calculate colours for different authors
    var authors = new Object();
    this.lastcolour_ = 0;

    for (var counter = 0;
         counter < containers.length;
         counter++)
    {
        var thiscontainer = containers[counter];

        var selected = thiscontainer == container;

        var colour = "#75756D";
        if (! thiscontainer.isDummy())
        {
            if (authors[thiscontainer.getMessage().getFromEmail()] != null)
            {
                colour = authors[thiscontainer.getMessage().getFromEmail()];
            }
            else
            {
                colour = this.getNewColour();
                authors[thiscontainer.getMessage().getFromEmail()] = colour;
            }
            if (selected)
                colour = this.getColour(colour, 1);
            else
                colour = this.getColour(colour, 0.5);
        }

        var style = "full";
        if (! thiscontainer.isDummy() &&
            thiscontainer.getMessage().isSent())
            style = "half";

        if (thiscontainer.isDummy())
            style ="dummy";

        this.drawDot(thiscontainer, colour, style, x, (height / 2), selected);
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
            this.drawArc(colour,
                         position,
                         maxheight,
                         parent.x_position_,
                         x,
                         (height / 2));
        }
        x = x + (thiscontainer.x_scaled_ * this.spacing_);
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
 * reload all preferences
 ******************************************************************************/
Visualisation.prototype.preferenceReload = function()
{
    // check if preference is set to do timescaling
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
    this.pref_timescaling_ = false;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMESCALING_) == prefs.PREF_BOOL)
        this.pref_timescaling_ = prefs.getBoolPref(THREADARCSJS_PREF_BRANCH_ + VISUALISATION_PREF_DOTIMESCALING_);

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
