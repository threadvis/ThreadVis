/** ****************************************************************************
 * ArcVisualisation.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file to visualise message in thread arcs
 *
 * Version: $Id$
 ******************************************************************************/



var XUL_NAMESPACE_ =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";



/** ****************************************************************************
 * Constructor for visualisation class
 ******************************************************************************/
function ArcVisualisation(stack,
                          dotsize,
                          resize,
                          arc_min_height,
                          arc_difference,
                          arc_radius,
                          arc_width,
                          colour,
                          vposition,
                          height,
                          left,
                          right,
                          top)
{
    this.stack_ = stack;
    this.dotsize_ = dotsize;
    this.resize_ = resize;
    this.arc_min_height_ = arc_min_height;
    this.arc_difference_ = arc_difference;
    this.arc_radius_ = arc_radius;
    this.arc_width_ = arc_width;

    this.colour_ = colour;
    this.vposition_ = vposition;
    this.height_ = height;
    this.left_ = left;
    this.right_ = right;
    this.top_ = top;


    LOGGER_.logDebug("ArcVisualisation()", {"action" : "start",
                                            "colour" : this.colour_,
                                            "vposition" : this.vposition_,
                                            "height" : this.height_,
                                            "left" : this.left_,
                                            "right" : this.right_});

    this.drawArc();
}



/** ****************************************************************************
 * Draw arc
 ******************************************************************************/
ArcVisualisation.prototype.drawArc = function()
{
    var arc_top = 0;
    var fill_top = 0;
    if (this.vposition_ == "top")
        arc_top = this.top_ - (((this.dotsize_ / 2) + this.arc_min_height_ + 
                  (this.arc_difference_ * this.height_)) * this.resize_);
    else
        arc_top = this.top_ + ((this.dotsize_ / 2) * this.resize_);

    var style_top = (arc_top) + "px";
    var style_left = ((this.left_ - (this.arc_width_ / 2)) * this.resize_) + "px";
    var style_height = ((this.arc_min_height_ + this.arc_difference_ * this.height_) * 
                       this.resize_) + "px";
    var style_width = ((this.right_ - this.left_ + this.arc_width_) * this.resize_)+ "px";
    var style_background = this.colour_;
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
    if (this.vposition_ == "top")
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
