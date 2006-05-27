/** ****************************************************************************
 * Timeline.js
 *
 * (c) 2006 Alexander C. Hubmann
 *
 * Version: $Id$
 ******************************************************************************/



var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";



/** ****************************************************************************
 * Constructor for timeline class
 ******************************************************************************/
function Timeline(stack, strings, containers, resize, dotsize, top, top_delta)
{
    this.stack_ = stack;
    this.strings_ = strings;
    this.containers_ = containers;
    this.resize_ = resize;
    this.dotsize_ = dotsize;
    this.top_ = top;
    this.top_delta_ = top_delta;
    
    this.times_ = Array();
}



/** ****************************************************************************
 * Draw the timeline
 ******************************************************************************/
Timeline.prototype.draw = function()
{
    // start with second container
    for (var i = 1; i < this.containers_.length; i++)
    {
        // look at two adjacent containers
        var first = this.containers_[i - 1];
        var second = this.containers_[i];
        
        // don't calculate time if one of them is a dummy
        if (first.isDummy() || second.isDummy())
            continue;
        
        var timedifference = first.timedifference_;
        
        // get the formatted strings
        var formatted = this.formatTime(timedifference);
        
        // draw the labels and tooltips
        this.drawTime(first, first.x_position_, second.x_position_, formatted.string, formatted.tooltip);
    }
}



/** ****************************************************************************
 * Draw the label and the tooltip
 ******************************************************************************/
Timeline.prototype.drawTime = function(container, left, right, string, tooltip)
{
    // check to see if we already created the label and the tooltip
    var elem = null;
    var newelem = false;
    if (this.times_[container])
        elem = this.times_[container];
    else
    {
        elem = document.createElementNS(XUL_NAMESPACE_, "description");
        newelem = true;
        this.times_[container] = elem;
    }
    
    // calculate style
    var style_borderbottom = "";
    var style_borderleft = "";
    var style_borderright = "";
    var style_bordertop = "";
    var style_fontsize = "9px";
    var style_left = ((left - this.dotsize_ / 2)* this.resize_) + "px";
    var style_top = (this.top_ - this.top_delta_) * this.resize_ + "px";
    var style_width = ((right - left) * this.resize_) + "px";
    
    // set style
    elem.style.borderBottom = style_borderbottom;
    elem.style.borderLeft = style_borderleft;
    elem.style.borderRight = style_borderright;
    elem.style.borderTop = style_bordertop;
    elem.style.fontSize = style_fontsize;
    elem.style.left = style_left;
    elem.style.position = "relative";
    elem.style.textAlign = "center";
    elem.style.top = style_top;
    elem.style.width = style_width;
    elem.style.zIndex = "1";
    //elem.style.cursor = "move";
    
    elem.setAttribute("value", string);
    elem.setAttribute("tooltiptext", tooltip);
    
    // and add to stack only if we just created the element
    if (newelem)
    {
        this.stack_.appendChild(elem);
        
        // prevent mousedown event from bubbling to box object
        // prevent dragging of visualisation by clicking on message
        elem.addEventListener("mousedown",
            function(event)
            {
                event.stopPropagation();
            },
            true);
    }
    
    // hide if not enough space
    if (((right - left) * this.resize_ < 20) || (this.top_delta_ * this.resize_ < 9))
        elem.hidden = true;
    else
        elem.hidden = false;

}



/** ****************************************************************************
 * Format the time difference for the label and the tooltip
 ******************************************************************************/
Timeline.prototype.formatTime = function(timedifference)
{
    // timedifference is in miliseconds
    timedifference = timedifference - (timedifference % 1000);
    timedifference = timedifference / 1000;
    var seconds = timedifference % 60;
    timedifference = timedifference - seconds;
    timedifference = timedifference / 60;
    var minutes = timedifference % 60;
    timedifference = timedifference - minutes;
    timedifference = timedifference / 60;
    var hours = timedifference % 24;
    timedifference = timedifference - hours;
    timedifference = timedifference / 24;
    var days = timedifference % 365;
    timedifference = timedifference - days;
    timedifference = timedifference / 365;
    var years = timedifference;
    
    var string = "";
    var tooltip = "";
    
    // label
    // only display years if >= 1
    if (years >= 1)
        string = years + this.strings_.getString("visualisation.timedifference.years.short");
    // only display days if >= 1
    else if (days >= 1)
        string = days + this.strings_.getString("visualisation.timedifference.days.short");
    // display hours if >= 1
     else if (hours >= 1)
        string = hours + this.strings_.getString("visualisation.timedifference.hours.short");
    // display minutes otherwise
     else
        string = minutes + this.strings_.getString("visualisation.timedifference.minutes.short");;
     
     
     // tooltip
    if (years == 1)
        tooltip = years + " " + this.strings_.getString("visualisation.timedifference.year");;
    if (years > 1)
        tooltip = years + " " + this.strings_.getString("visualisation.timedifference.years");;
    
    if (days == 1)
        tooltip += " " + days + " " + this.strings_.getString("visualisation.timedifference.day");
    if (days > 1)
        tooltip += " " + days + " " + this.strings_.getString("visualisation.timedifference.days");
    
    if (hours == 1)
        tooltip += " " + hours + " " + this.strings_.getString("visualisation.timedifference.hour");;
    if (hours > 1)
        tooltip += " " + hours + " " + this.strings_.getString("visualisation.timedifference.hours");;
    
    if (minutes == 1)
        tooltip += " " + minutes + " " + this.strings_.getString("visualisation.timedifference.minute");;
    if (minutes > 1)
        tooltip += " " + minutes + " " + this.strings_.getString("visualisation.timedifference.minutes");;
    
    var returnobject = new Object();
    returnobject.string = string;
    returnobject.tooltip = tooltip;
    
    return returnobject;
}



/** ****************************************************************************
 * Re-Draw the timeline
 ******************************************************************************/
Timeline.prototype.redraw = function(resize, vertical)
{
    this.resize_ = resize;
    this.vertical_ = vertical;
    this.draw();
}
