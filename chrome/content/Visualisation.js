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



/** ****************************************************************************
 * Constructor for visualisation class
 ******************************************************************************/
function Visualisation()
{
    this.COLOUR_DUMMY_ = "#75756D";
    this.COLOUR_SINGLE_ = "#0000FF";

    this.box_ = null;
    this.stack_ = null;
    this.strings_ = null;
    // set default resize parameter
    this.resize_ = 1;
    this.zoom_ = 1;

    this.authors_ = null;
    this.containers_ = null;
    this.containervisualisations_ = null;
    this.arcvisualisations_ = null;
    this.timeline_ = null;
    this.scrollbar_ = null;
    this.changed_ = false;
}



/** ****************************************************************************
 * Calculate heights for all arcs
 ******************************************************************************/
Visualisation.prototype.calculateArcHeights = function(containers)
{
    // reset all heights
    for (var counter = 0;
         counter < containers.length;
         counter++)
    {
        var thiscontainer = containers[counter];
        thiscontainer.current_arc_height_incoming_ = new Array();
        thiscontainer.current_arc_height_outgoing_ = new Array();
    }
    
    for (var counter = 0;
         counter < containers.length;
         counter++)
    {
        var thiscontainer = containers[counter];
        thiscontainer.x_index_ = counter;

        // odd_ tells us if we display the arc above or below the messages
        thiscontainer.odd_ = thiscontainer.getDepth() % 2 == 0;

        var parent = thiscontainer.getParent();
        if (parent != null && ! parent.isRoot())
        {
            // find a free arc height between the parent message and this one
            // since we want to draw an arc between this message and its parent,
            // and we do not want any arcs to overlap
            var free_height = 1;
            var blocked = true;
            while (blocked)
            {
                blocked = false;
                for (var innercounter = parent.x_index_;
                     innercounter < counter;
                     innercounter++)
                {
                    var lookatcontainer = containers[innercounter];
                    
                    /*
                    if (lookatcontainer.getParent() == parent &&
                        lookatcontainer.x_index_ == thiscontainer.x_index_ - 1)
                    {
                        free_height = lookatcontainer.arc_height_;
                        break;
                    }
                    */
                    
                    if (lookatcontainer.odd_ == parent.odd_ && 
                        lookatcontainer.current_arc_height_outgoing_[free_height] == 1)
                    {
                        free_height++;
                        blocked = true;
                        break;
                    }
                    if (lookatcontainer.odd_ != parent.odd_ &&
                        lookatcontainer.current_arc_height_incoming_[free_height] == 1)
                    {
                        free_height++;
                        blocked = true;
                        break;
                    }
                }
            }
            parent.current_arc_height_outgoing_[free_height] = 1;
            thiscontainer.current_arc_height_incoming_[free_height] = 1;
            
            thiscontainer.arc_height_ = free_height;
        }
    }
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

    this.calculateArcHeights(containers);

    for (var counter = 0; counter < containers.length; counter++)
    {
        var thiscontainer = containers[counter];

        // odd_ tells us if we display the arc above or below the messages
        thiscontainer.odd_ = thiscontainer.getDepth() % 2 == 0;

        var parent = thiscontainer.getParent();
        if (parent != null && ! parent.isRoot())
        {
        // also keep track of the current maximal stacked arc height, so that we can resize
        // the whole extension
        if (parent.odd_ && thiscontainer.arc_height_ > topheight)
        {
            topheight = thiscontainer.arc_height_;
        }
        
        if (! parent.odd_ && thiscontainer.arc_height_ > bottomheight)
            bottomheight = thiscontainer.arc_height_;
        }
        
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
    
    totalmaxheight = Math.max(topheight, bottomheight);
    
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
    if (this.box_.boxObject.height != this.box_height_ || 
        this.box_.boxObject.width != this.box_width_)
    {
        this.resetStack();
        this.visualise();
    }
    
    this.box_height_ = this.box_.boxObject.height;
    this.box_width_ = this.box_.boxObject.width;
}



/** ****************************************************************************
 * Clear stack
 * delete all children
 ******************************************************************************/
Visualisation.prototype.clearStack = function()
{
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.clearStack()",
                               {});
    
    while(this.stack_.firstChild != null)
        this.stack_.removeChild(this.stack_.firstChild);
    
    // reset move
    this.stack_.style.marginLeft = "0px";
    this.stack_.style.marginTop = "0px";
    this.stack_.style.padding = "5px";
}



/** ****************************************************************************
 * Underline authors in header view
 ******************************************************************************/
Visualisation.prototype.colourAuthors = function(authors)
{
    var pref_highlight = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_HIGHLIGHT_);
    
    // colour links
    var emailfields = new Array();

    // check to see if we have the element expandedHeaderView
    if (document.getElementById("expandedHeaderView") == null)
        return;

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
        var author = authors[emailfield.attributes["emailAddress"].value];
        var hsv = null;
        if (author)
            hsv = author.hsv;
        
        if (hsv && pref_highlight)
            emailfield.style.borderBottom = "2px solid " + this.getColour(hsv.hue, 100, hsv.value);
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
    var h = hue / 360;
    var s = saturation / 100;
    var v = value / 100;
    
    if (s == 0)
    {
        return {"r" : v * 255, "g" : v * 255, "b" : v * 255};
    }
    else
    {
        var var_h = h * 6;
        var var_i = Math.floor(var_h);
        var var_1 = v * (1 - s);
        var var_2 = v * (1 - s * (var_h - var_i));
        var var_3 = v * (1 - s * (1 - (var_h - var_i)));
        
        switch(var_i)
        {
            case 0:
                var var_r = v;
                var var_g = var_3;
                var var_b = var_1;
                break;
            case 1:
                var var_r = var_2;
                var var_g = v;
                var var_b = var_1;
                break;
            case 2:
                var var_r = var_1;
                var var_g = v;
                var var_b = var_3;
                break;
            case 3:
                var var_r = var_1;
                var var_g = var_2;
                var var_b = v;
                break;
            case 4:
                var var_r = var_3;
                var var_g = var_1;
                var var_b = v;
            default:
                var var_r = v;
                var var_g = var_1;
                var var_b = var_2;
        }
        
        return {"r" : var_r * 255, "g" : var_g * 255, "b" : var_b * 255};
    }
}



/** ****************************************************************************
 * Build legend popup containing all authors of current thread
 ******************************************************************************/
Visualisation.prototype.createLegend = function(authors)
{
    this.legend_ = document.createElementNS(THREADVIS.XUL_NAMESPACE_, "vbox");
    
    for (var email in authors)
    {
        var hsv = authors[email].hsv;
        var name = authors[email].name;
        var count = authors[email].count;
        this.legend_.appendChild(this.createLegendBox(hsv, name, count));
    }
}



/** ****************************************************************************
 * Build one row for legend
 ******************************************************************************/
Visualisation.prototype.createLegendBox = function(hsv, name, count)
{
    var box = document.createElementNS(THREADVIS.XUL_NAMESPACE_, "hbox");
    
    var colourbox = document.createElementNS(THREADVIS.XUL_NAMESPACE_, "hbox");
    colourbox.style.background = this.getColour(hsv.hue, 100, hsv.value);
    colourbox.style.width = "20px";
    box.appendChild(colourbox);
    
    var namebox = document.createElementNS(THREADVIS.XUL_NAMESPACE_, "description");
    var nametext = document.createTextNode(name + " (" + count + ")");
    namebox.appendChild(nametext)
    
    box.appendChild(namebox);
    
    return box;
}



/** ****************************************************************************
 * Create stack
 ******************************************************************************/
Visualisation.prototype.createStack = function()
{
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.createStack()",
                               {});
    
    this.box_ = document.getElementById("ThreadVisBox");
    this.stack_ = document.getElementById("ThreadVisStack");
    this.strings_ = document.getElementById("ThreadVisStrings");

    var ref = this;
    if (! this.stack_)
    {
        THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                                   "Visualisation.createStack()",
                                   {"action" : "create stack"});
        
        this.stack_ = document.createElementNS(THREADVIS.XUL_NAMESPACE_, "stack");
        this.stack_.setAttribute("id", "ThreadVisStack");
        this.stack_.style.position = "relative";
        this.box_.appendChild(this.stack_);
        this.box_.addEventListener("mousemove", function(event) {ref.onMouseMove(event);}, false);
        this.box_.addEventListener("mousedown", function(event) {ref.onMouseDown(event);}, false);
        this.box_.addEventListener("mouseup", function(event) { ref.onMouseUp(event); }, false);
        this.box_.addEventListener("DOMMouseScroll", function(event) {ref.onScroll(event);}, false);
    }
    else
    {
        THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                                   "Visualisation.createStack()",
                                   {"action" : "clear stack"});
        this.clearStack();
    }

    var loading = document.createElementNS(THREADVIS.XUL_NAMESPACE_, "description");
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
    var alpha = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
    var n_ = Math.floor(dec / 16)
    var _n = dec - n_*16;
    return alpha[n_] + alpha[_n];
}



/** ****************************************************************************
 * Draw arc
 ******************************************************************************/
Visualisation.prototype.drawArc = function(colour,
                                           vposition,
                                           height,
                                           left,
                                           right,
                                           top,
                                           opacity)
{
    var pref_dotsize = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_DOTSIZE_);
    var pref_arc_minheight = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_MINHEIGHT_);
    var pref_arc_difference = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_DIFFERENCE_);
    var pref_arc_radius = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_RADIUS_);
    var pref_arc_width = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_WIDTH_);
    
    var arc = new ArcVisualisation(this.stack_,
                                   pref_dotsize,
                                   this.resize_,
                                   pref_arc_minheight,
                                   pref_arc_difference,
                                   pref_arc_radius,
                                   pref_arc_width,
                                   colour,
                                   vposition,
                                   height,
                                   left,
                                   right,
                                   top,
                                   opacity);
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
                                           flash,
                                           opacity)
{
    var pref_dotsize = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_DOTSIZE_);
    var pref_spacing = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_SPACING_);
    
    var msg = new ContainerVisualisation(this.stack_,
                                         this.strings_,
                                         container,
                                         colour,
                                         left,
                                         top,
                                         selected,
                                         pref_dotsize,
                                         this.resize_,
                                         circle,
                                         flash,
                                         pref_spacing,
                                         opacity);
    return msg;
}



/** ****************************************************************************
 * Get a colour for the arc
 ******************************************************************************/
Visualisation.prototype.getColour = function(hue, saturation, value)
{
    /*
    if (! value)
        value = 100;
    if (! saturation)
        saturation = 100;
    */
    rgb = this.convertHSVtoRGB(hue, saturation, value);

    return "#" + this.DECtoHEX(Math.floor(rgb.r)) + 
                 this.DECtoHEX(Math.floor(rgb.g)) + 
                 this.DECtoHEX(Math.floor(rgb.b));
}



/** ****************************************************************************
 * Get a new colour for the arc
 ******************************************************************************/
Visualisation.prototype.getNewColour = function()
{
    var hues = new Array(0,90,180,270,45,135,225,315,0,90,180,270,45,135,225,315,0,90,180,270,45,135,225,315,0,90,180,270,45,135,225,315);
    var values = new Array(100,100,100,100,60,60,60,60,60,60,60,60,100,100,100,100,80,80,80,80,40,40,40,40,40,40,40,40,80,80,80,80);
    this.lastcolour_ = (this.lastcolour_ + 1) % hues.length;
    
    return {"hue" : hues[this.lastcolour_], "value" : values[this.lastcolour_]};
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
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.getResize()",
                               {"action" : "start",
                                "xcount" : xcount,
                                "ycount" : ycount,
                                "sizex" : sizex,
                                "sizey" : sizey});

    var pref_arc_difference = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_DIFFERENCE_);
    var pref_arc_minheight = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_MINHEIGHT_);
    var pref_dotsize = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_DOTSIZE_);
    var pref_spacing = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_SPACING_);

    var spaceperarcavailablex = sizex / xcount;
    var spaceperarcavailabley = sizey / 2;
    var spaceperarcneededx = pref_spacing;
    var spaceperarcneededy = (pref_dotsize / 2) + pref_arc_minheight + 
                             (ycount + 1) * pref_arc_difference;

    var resizex = (spaceperarcavailablex / spaceperarcneededx);
    var resizey = (spaceperarcavailabley / spaceperarcneededy);

    var resize = 1;
    if (resizex < resizey)
        resize = resizex;
    else
        resize = resizey;

    if (resize > 1)
        resize = 1;

    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.getResize()",
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
    var pref_spacing = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_SPACING);
    var pref_default_zoom_height = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_ZOOM_HEIGHT_);

    // get current left margin
    var old_margin = this.stack_.style.marginLeft;
    old_margin = parseInt(old_margin.replace(/px/, ""));
    var new_margin = old_margin;
    
    var original_width = this.box_.boxObject.width;
    var original_height = this.box_.boxObject.height;
    var height = original_height * this.zoom_ * pref_default_zoom_height;
    
    if (container.x_position_ * this.resize_ + old_margin > original_width)
    {
        // calculate necessary margin
        new_margin = - (container.x_position_ * this.resize_ - original_width) 
                     - (pref_spacing * this.resize_);
        
        // if we already see the selected message, don't move any further
        if (new_margin > old_margin)
        {
            new_margin = old_margin;
        }
    }
    if (container.x_position_ * this.resize_ + old_margin < (pref_spacing / 2) * this.resize_)
    {
        // calculate necessary margin
        new_margin = (- container.x_position_ + (pref_spacing / 2))* this.resize_;
    }
    
    this.stack_.style.marginLeft = new_margin + "px";
}



/** ****************************************************************************
 * Move visualisation by given delta
 ******************************************************************************/
Visualisation.prototype.moveVisualisationTo = function(position)
{
    if (position.x)
        this.stack_.style.marginLeft = position.x + "px";
    if (position.y)
        this.stack_.style.marginTop = position.y + "px";
}



/** ****************************************************************************
 * mouse click event handler
 * display message user clicked on
 ******************************************************************************/
Visualisation.prototype.onMouseClick = function(event)
{
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.onMouseClick()",
                               {});
    
    var container = event.target.container;
    if (container && ! container.isDummy())
        THREADVIS.callback(container.getMessage().getKey(), 
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
    
    // remember box size now
    this.box_width_ = this.box_.boxObject.width;
    this.box_height = this.box_.boxObject.height;
    this.stack_width_ = this.stack_.boxObject.width;
    this.stack_height_ = this.stack_.boxObject.height;
    
    this.startx_ = event.clientX;
    this.starty_ = event.clientY;
    this.panning_ = true;
    
    // set mouse cursor
    this.box_.style.cursor = "-moz-grabbing";
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
        
        // set mininum dx to a little less than available to prevent overpanning
        var mindx = Math.min(this.box_width_ - this.stack_width_ + 4, 0);
        var mindy = Math.min(this.box_height_ - this.stack_height_, 0);
        
        // don't move more to the right than necessary
        if (dx > 0)
            dx = 0;
        
        // don't move more to the left than necessary
        if (dx < mindx)
            dx = mindx;
        
         // don't move more to the bottom than necessary
        if (dy > 0)
            dy = 0;
        
        // don't move more to the top than necessary
        if (dy < mindy)
            dy = mindy;
        
        var position = new Object;
        position.x = dx;
        position.y = dy;
        
        this.moveVisualisationTo(position);
        
        this.scrollbar_.init(this.box_);
        this.scrollbar_.draw();
    }
}



/** ****************************************************************************
 * OnMouseUp event handler
 * disable panning when mouse button is released
 ******************************************************************************/
Visualisation.prototype.onMouseUp = function(event)
{
    this.panning_ = false;
    
    // reset mouse cursor
    this.box_.style.cursor = "-moz-grab";
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
 * Reset stack
 * set all margins to zero
 ******************************************************************************/
Visualisation.prototype.resetStack = function()
{
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.resetStack()",
                               {});
    
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
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.timeScaling()",
                               {"action" : "start",
                                "containers" : containers.toString(),
                                "minimaltimedifference" : minimaltimedifference,
                                "width" : width,
                                "no. containers:" : containers.length});

    var pref_spacing = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_SPACING_);
    var pref_timescaling = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_TIMESCALING_);

    // if we do not want to do timescaling, reset all scaling info to 1
    if (! pref_timescaling)
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
    // width / spacing would lead to 3, but in effect we can only
    // fit 2, since we want some spacing between the messages and the border
    var max_count_x = (width / pref_spacing) - 1;

    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.timeScaling()", 
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

    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.timeScaling()",
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

    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                               "Visualisation.visualise()",
                               {"action" : "start",
                                "container" : container.toString()});

    var pref_arc_difference = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_DIFFERENCE_);
    var pref_arc_minheight = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_MINHEIGHT_);
    var pref_arc_width = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_WIDTH_);
    var pref_spacing = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_SPACING_);
    var pref_dotsize = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_DOTSIZE_);
    var pref_default_zoom_height = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_ZOOM_HEIGHT_);
    var pref_default_zoom_width = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_ZOOM_WIDTH_);
    var pref_colour = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_COLOUR_);
    var pref_timeline = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_TIMELINE_);
    var pref_opacity = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_OPACITY_) / 100;

    // check if we are still in the same thread as last time
    // check if visualisation parameters changed
    // if not, reset zoom level
    if (this.currentcontainer_ &&
        container.getTopContainer() == this.currentcontainer_.getTopContainer() &&
        ! this.changed_)
    {
        this.visualiseExisting(container);
        return;
    }

    // clear stack before drawing
    this.createStack();
    this.zoomReset();
    this.resetStack();
    this.clearStack();


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

    var topheight = pref_dotsize / 2 + pref_arc_minheight + presize.topheight * pref_arc_difference;
    var bottomheight = pref_dotsize / 2 + pref_arc_minheight + presize.bottomheight * pref_arc_difference;

    // do time scaling
    var original_width = this.box_.boxObject.width;
    var original_height = this.box_.boxObject.height;

    var width = original_width * this.zoom_ * pref_default_zoom_width;
    var height = original_height * this.zoom_ * pref_default_zoom_height;

    this.containers_ = this.timeScaling(this.containers_,
                                        minimaltimedifference,
                                        width);

    // do final resizing
    var x = pref_spacing / 2;
    this.resize_ = this.getResize(this.containers_.length,
                                  totalmaxheight,
                                  width,
                                  height);

    // set cursor
    this.box_.style.cursor = "-moz-grab";

    // pre-calculate colours for different authors
    this.authors_ = new Object();
    this.lastcolour_ = -1;

    this.containervisualisations_ = new Array();
    this.arcvisualisations_ = new Array();
    
    for (var counter = 0;
         counter < this.containers_.length;
         counter++)
    {
        var thiscontainer = this.containers_[counter];

        var selected = thiscontainer == container;

        var colour = this.COLOUR_DUMMY_;
        var opacity = 1;
        var hsv = {"hue" : 60, "saturation" : 6.8, "value" : 45.9};
        if (! thiscontainer.isDummy())
        {
            if (pref_colour == "single")
            {
                if (selected)
                    colour = this.COLOUR_SINGLE_;
                else
                    colour = this.COLOUR_DUMMY_;
            }
            else
            {
                if (this.authors_[thiscontainer.getMessage().getFromEmail()] != null)
                {
                    hsv = this.authors_[thiscontainer.getMessage().getFromEmail()].hsv;
                    this.authors_[thiscontainer.getMessage().getFromEmail()].count = 
                    this.authors_[thiscontainer.getMessage().getFromEmail()].count + 1;
                }
                else
                {
                    hsv = this.getNewColour();
                    this.authors_[thiscontainer.getMessage().getFromEmail()] = {"hsv" : hsv,
                                                                                "name" : thiscontainer.getMessage().getFrom(),
                                                                                "count" : 1};
                }
                colour = this.getColour(hsv.hue, 100, hsv.value);
                if (selected || thiscontainer.findChild(container) || container.findChild(thiscontainer))
                    opacity = 1;
                else
                    opacity = pref_opacity;
            }
        }

        // only display black circle to highlight selected message
        // if we are using more than one colour
        var circle = pref_colour == "single" ? false : true;

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
                         flash,
                         opacity);

        thiscontainer.x_position_ = x;

        // draw arc
        var parent = thiscontainer.getParent()
        if (parent != null && ! parent.isRoot())
        {
            var position = "bottom";
            if (parent.odd_)
                position = "top";
            
            var arc_height = thiscontainer.arc_height_;
            // if we are using a single colour, display all arcs from
            // a selected message in this colour
            if (pref_colour == "single")
            {
                if (selected || thiscontainer.findChild(container) || container.findChild(thiscontainer))
                    colour = this.COLOUR_SINGLE_;
                else
                    colour = this.COLOUR_DUMMY_;
            }
            else
            {
                // get colour for arc
                colour = this.getColour(hsv.hue, 100, hsv.value);
                if (selected || thiscontainer.findChild(container) || container.findChild(thiscontainer))
                    opacity = 1;
                else
                    opacity = pref_opacity;
            }

            this.arcvisualisations_[thiscontainer] =
                this.drawArc(colour,
                             position,
                             arc_height,
                             parent.x_position_,
                             x,
                             topheight,
                             opacity);
        }
        x = x + (thiscontainer.x_scaled_ * pref_spacing);
    }
    
    // underline authors if enabled
    this.colourAuthors(this.authors_);
    this.createLegend(this.authors_);
    THREADVIS.displayLegend();
    
    // calculate if we have to move the visualisation so that the
    // selected message is visible
    this.moveVisualisation(container);
    
    // create a new box and overlay over all other elements to catch
    // all clicks and drags
    var popupbox = document.createElementNS(THREADVIS.XUL_NAMESPACE_, "box");
    popupbox.style.width = "100%";
    popupbox.style.height = "100%";
    popupbox.setAttribute("context", "ThreadVisPopUp");
    this.stack_.appendChild(popupbox);
    
    // check for resize of box
    
    this.box_height_ = this.box_.boxObject.height;
    this.box_width_ = this.box_.boxObject.width;
    var ref = this;
    clearInterval(this.check_resize_interval_);
    this.check_resize_interval_ = setInterval(function() {ref.checkSize();}, 100);
    
    if (pref_timeline)
    {
        this.timeline_ = new Timeline(this.stack_,
                                      this.strings_,
                                      this.containers_,
                                      this.resize_,
                                      pref_dotsize,
                                      topheight,
                                      pref_arc_minheight + pref_dotsize - pref_arc_width - 2);
        this.timeline_.draw();
    }
    else
    {
        this.timeline_ = null;
    }
    
    if (! this.scrollbar_)
        this.scrollbar_ = new Scrollbar(this,
                                        this.stack_,
                                        this.box_);
    this.scrollbar_.init(this.box_);
    this.scrollbar_.draw();
    
    this.changed_ = false;
}



/** ****************************************************************************
 * Visualise an existing thread
 ******************************************************************************/
Visualisation.prototype.visualiseExisting = function(container)
{
    var pref_arc_difference = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_DIFFERENCE_);
    var pref_arc_minheight = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_MINHEIGHT_);
    var pref_arc_width = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_ARC_WIDTH_);
    var pref_dotsize = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_DOTSIZE_);
    var pref_spacing = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_SPACING_);
    var pref_default_zoom_height = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_ZOOM_HEIGHT_);
    var pref_default_zoom_width = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_ZOOM_WIDTH_);
    var pref_colour = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_VIS_COLOUR_);
    var pref_timeline = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_TIMELINE_);
    var pref_opacity = THREADVIS.preferences_.getPreference(THREADVIS.preferences_.PREF_OPACITY_) / 100;

    // remember current container to redraw after zoom
    this.currentcontainer_ = container;
    
    // pre-calculate size
    var presize = this.calculateSize(this.containers_);
    this.containers_ = presize.containers;
    // totalmaxheight counts the maximal number of stacked arcs
    var totalmaxheight = presize.totalmaxheight;
    // minmaltimedifference stores the minimal time between two messages
    var minimaltimedifference = presize.minimaltimedifference;

    var topheight = pref_dotsize / 2 + pref_arc_minheight + presize.topheight * pref_arc_difference;
    var bottomheight = pref_dotsize / 2 + pref_arc_minheight + presize.bottomheight * pref_arc_difference;

    var original_width = this.box_.boxObject.width;
    var original_height = this.box_.boxObject.height;
    var width = original_width * this.zoom_ * pref_default_zoom_width;
    var height = original_height * this.zoom_ * pref_default_zoom_height;
    
    this.containers_ = this.timeScaling(this.containers_,
                                        minimaltimedifference,
                                        width);
    
    // do final resizing
    var x = pref_spacing / 2;
    this.resize_ = this.getResize(this.containers_.length,
                                  totalmaxheight,
                                  width,
                                  height);

    // set cursor
    this.box_.style.cursor = "-moz-grab";

    for (var counter = 0;
         counter < this.containers_.length;
         counter++)
    {
        var thiscontainer = this.containers_[counter];

        var selected = thiscontainer == container;

        // only display black circle to highlight selected message
        // if we are using more than one colour
        var circle = pref_colour == "single" ? false : true;

        // at the moment, don't flash
        // note: dot only flashes if circle == true
        var flash = false;

        // if thread has changed and we don't have all container visualisations
        if (this.containervisualisations_[thiscontainer] == null)
        {
            THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_VIS_,
                                       "Visualisation.visualiseExisting()",
                                       {"action" : "cached visualisation does not contain this message, redraw"});
            // do a full redraw
            this.currentcontainer_ = null;
            this.visualise(container);
            return;
        }

        var colour = this.COLOUR_DUMMY_;
        var opacity = 1;
        var hsv = {"hue" : 60, "saturation" : 6.8, "value" : 45.9};
        if (! thiscontainer.isDummy())
        {
            // get colour for dot
            if (pref_colour == "single")
            {
                if (selected)
                    colour = this.COLOUR_SINGLE_;
                else
                    colour = this.COLOUR_DUMMY_;
            }
            else
            {
                hsv = this.authors_[thiscontainer.getMessage().getFromEmail()].hsv;
                colour = this.getColour(hsv.hue, 100, hsv.value);
                if (selected || container.findChild(thiscontainer) || thiscontainer.findChild(container))
                    opacity = 1;
                else
                    opacity = pref_opacity;
            }
        }

        // draw dot
        this.containervisualisations_[thiscontainer].redraw(this.resize_,
                                                            x,
                                                            topheight,
                                                            selected,
                                                            flash,
                                                            colour,
                                                            opacity);

        thiscontainer.x_position_ = x;

        // get colour for arc
        if (pref_colour == "single")
        {
            if (selected || thiscontainer.findChild(container) || container.findChild(thiscontainer))
                colour = this.COLOUR_SINGLE_;
            else
                colour = this.COLOUR_DUMMY_;
        }
        else
        {
            colour = this.getColour(hsv.hue, 100, hsv.value);
            if (selected || thiscontainer.findChild(container) || container.findChild(thiscontainer))
                opacity = 1;
            else
                opacity = pref_opacity;
        }

        // draw arc
        var parent = thiscontainer.getParent()
        if (parent != null && ! parent.isRoot())
        {
            this.arcvisualisations_[thiscontainer].redrawArc(this.resize_,
                                                             parent.x_position_,
                                                             x,
                                                             topheight,
                                                             colour,
                                                             opacity)
        }
        
        x = x + (thiscontainer.x_scaled_ * pref_spacing);
    }
    
    // calculate if we have to move the visualisation so that the
    // selected message is visible
    this.moveVisualisation(container);
    
    // underline authors if enabled
    this.colourAuthors(this.authors_);
    this.createLegend(this.authors_);
    
    if (pref_timeline && this.timeline_)
        this.timeline_.redraw(this.resize_,
                              topheight,
                              pref_arc_minheight + pref_dotsize - pref_arc_width - 2);
    
    this.scrollbar_.draw();
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
    
    THREADVIS.logger_.log("zoom",
                          {"action" : "in",
                           "zoomlevel" : this.zoom_,
                           "delta" : amount});
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
    
    THREADVIS.logger_.log("zoom",
                          {"action" : "out",
                           "zoomlevel" : this.zoom_,
                           "delta" : amount});
}



/** ****************************************************************************
 * Reset Zoom level
 ******************************************************************************/
Visualisation.prototype.zoomReset = function()
{
    this.zoom_ = 1.0;
}
