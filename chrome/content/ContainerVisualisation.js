/** ****************************************************************************
 * ContainerVisualisation.js
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
function ContainerVisualisation(stack,
                                strings,
                                container,
                                colour,
                                left,
                                top,
                                selected,
                                dotsize,
                                resize,
                                circle,
                                flash)
{
    this.stack_ = stack;
    this.strings_ = strings;
    this.container_ = container;
    this.colour_ = colour;
    this.left_ = left;
    this.top_ = top;
    this.selected_ = selected;
    this.dotsize_ = dotsize;
    this.resize_ = resize;
    this.draw_circle_ = circle;
    this.flashcount_ = 3;
    this.flash_ = flash;

    this.style_ = "full";
    if (! this.container_.isDummy() &&
          this.container_.getMessage().isSent())
        this.style_ = "half";

    if (this.container_.isDummy())
        this.style_ ="dummy";

    LOGGER_.logDebug("ContainerVisualisation()",
                        {"action" : "start",
                         "container" : this.container_.toString(),
                         "colour" : this.colour_,
                         "style" : this.style_,
                         "left" : this.left_,
                         "top" : this.top_});


    this.drawDot();
}



ContainerVisualisation.prototype.drawDot = function()
{
    this.dot_ = document.createElementNS(XUL_NAMESPACE_, "box");

    var style_top = (this.top_ - ((this.dotsize_ / 2) * this.resize_)) + "px";
    var style_left = ((this.left_ - (this.dotsize_ / 2)) * this.resize_) + "px";
    var style_height = (this.dotsize_ * this.resize_) + "px";
    var style_width = (this.dotsize_ * this.resize_) + "px";
    var style_background = "";
    var style_border = "";
    if (this.style_ != "half")
        style_background = this.colour_;
    else
        style_border = (this.dotsize_ / 4 * this.resize_) + 
                           "px solid " + this.colour_;

    LOGGER_.logDebug("Visualisation.drawDot()",
                        {"top" : style_top,
                         "left" : style_left,
                         "height" : style_height,
                         "width" : style_width,
                         "background" : style_background,
                         "border" : style_border});

    this.dot_.style.position = "relative";
    this.dot_.style.top = style_top;
    this.dot_.style.left = style_left;
    this.dot_.style.width = style_width;
    this.dot_.style.height = style_height;
    this.dot_.style.verticalAlign = "top";
    this.dot_.style.background = style_background;
    this.dot_.style.border = style_border;
    if (this.style_ != "dummy")
        this.dot_.style.MozBorderRadius = style_width;
    this.dot_.container = this.container_;


    if (this.selected_ && this.draw_circle_)
    {
        this.drawCircle("black");

        // flash a few times
        if (this.flash_)
            this.flash();
    }


    this.createToolTip();

    this.dot_.addEventListener("click", this.onMouseClick, true);
}



/** ****************************************************************************
 *
 ******************************************************************************/
ContainerVisualisation.prototype.drawCircle = function(colour)
{
    if (! this.circle_)
        this.circle_ = document.createElementNS(XUL_NAMESPACE_, "box");

    var style_top = (this.top_ - ((this.dotsize_ * 4/6) * this.resize_)) + "px";
    var style_left = ((this.left_ - (this.dotsize_ * 4/6)) * this.resize_) + "px";
    var style_height = (this.dotsize_ * 8/6 * this.resize_) + "px";
    var style_width = (this.dotsize_ * 8/6 * this.resize_) + "px";
    var style_background = "";
    var style_border = "";
    style_border = (this.dotsize_ / 6 * this.resize_) + 
                       "px solid " + colour;

    LOGGER_.logDebug("Visualisation.drawDot()",
                        {"action" : "draw selection circle",
                         "top" : style_top,
                         "left" : style_left,
                         "height" : style_height,
                         "width" : style_width,
                         "background" : style_background,
                         "border" : style_border});

    this.circle_.style.position = "relative";
    this.circle_.style.top = style_top;
    this.circle_.style.left = style_left;
    this.circle_.style.width = style_width;
    this.circle_.style.height = style_height;
    this.circle_.style.verticalAlign = "top";
    this.circle_.style.border = style_border;
    this.circle_.style.MozBorderRadius = style_width;
    this.circle_.container = this.container_;
}



/** ****************************************************************************
 *
 ******************************************************************************/
ContainerVisualisation.prototype.createToolTip = function()
{
    var tooltip = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip.setAttribute("orient", "vertical");
    tooltip.setAttribute("id", "ThreadArcsJS_" + this.left_);


    if (! this.container_.isDummy())
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
                                this.container_.getMessage().getFrom());

        var datelabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var datetext = document.createElementNS(XUL_NAMESPACE_, "label");
        var date = document.createElementNS(XUL_NAMESPACE_, "hbox");
        date.appendChild(datelabel);
        date.appendChild(datetext);
        datelabel.setAttribute("value",
                               this.strings_.getString("tooltip.date"));
        datelabel.style.fontWeight = "bold";
        datetext.setAttribute("value",
                              this.container_.getMessage().getDate());

        var subjectlabel = document.createElementNS(XUL_NAMESPACE_, "label");
        var subjecttext = document.createElementNS(XUL_NAMESPACE_, "label");
        var subject = document.createElementNS(XUL_NAMESPACE_, "hbox");
        subject.appendChild(subjectlabel);
        subject.appendChild(subjecttext);
        subjectlabel.setAttribute("value",
                                  this.strings_.getString("tooltip.subject"));
        subjectlabel.style.fontWeight = "bold";
        subjecttext.setAttribute("value",
                                 this.container_.getMessage().getSubject());

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

    this.dot_.setAttribute("tooltip", "ThreadArcsJS_" + this.left_);
    this.stack_.appendChild(this.dot_);
    if (this.circle_)
    {
        this.circle_.setAttribute("tooltip", "ThreadArcsJS_" + this.left_);
        this.stack_.appendChild(this.circle_);
    }
    this.stack_.appendChild(tooltip);
}



/** ****************************************************************************
 * mouse click event handler
 * display message user clicked on
 ******************************************************************************/
ContainerVisualisation.prototype.onMouseClick = function(event)
{
    // only react to left mouse click
    if (event.button != 0)
        return;

    LOGGER_.logDebug("Visualisation.onMouseClick()", {});
    var container = event.target.container;
    if (container && ! container.isDummy())
        THREADARCS_.callback(container.getMessage().getKey(), 
                             container.getMessage().getFolder());
}



/** ****************************************************************************
 *
 ******************************************************************************/
ContainerVisualisation.prototype.flash = function()
{
    if (this.flashcount_ == 0)
        return;

    this.flashcount_--;

    var ref = this;
    setTimeout(function() {ref.flashOn();}, 100);
    setTimeout(function() {ref.flash();}, 1000);
}



/** ****************************************************************************
 *
 ******************************************************************************/
ContainerVisualisation.prototype.flashOn = function()
{
    this.drawCircle("white");

    var ref = this;
    setTimeout(function() {ref.flashOff();}, 500);
}



/** ****************************************************************************
 *
 ******************************************************************************/
ContainerVisualisation.prototype.flashOff = function(old)
{
    this.drawCircle("black");
}