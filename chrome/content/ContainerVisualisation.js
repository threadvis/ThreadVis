/** ****************************************************************************
 * ContainerVisualisation.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file to visualise message in threadvis
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
                                flash,
                                spacing)
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
    this.spacing_ = spacing;

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

    this.drawCircle("black");
    if (! (this.selected_ && this.draw_circle_))
        this.hideCircle();
    else
        this.showCircle();

    this.drawClick();

    this.createToolTip();
    this.createMenu();
    
    if (this.selected_ && this.draw_circle_ && this.flash_)
        this.startFlash();
}



/** ****************************************************************************
 * create popup menu to delete, copy and cut messages
 ******************************************************************************/
ContainerVisualisation.prototype.createMenu = function()
{
    var popupset = document.createElementNS(XUL_NAMESPACE_, "popupset");
    var popup = document.createElementNS(XUL_NAMESPACE_, "popup");
    var menuitem_delete = document.createElementNS(XUL_NAMESPACE_, "menuitem");
    var menuitem_cut = document.createElementNS(XUL_NAMESPACE_, "menuitem");
    var menuitem_paste = document.createElementNS(XUL_NAMESPACE_, "menuitem");
    
    var menuname = "dot_popup_" + this.left_;
    
    popup.setAttribute("id", menuname);
    
    // delete menu item
    menuitem_delete.setAttribute("label", this.strings_.getString("copycut.delete"));
    var tooltip_delete = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip_delete.setAttribute("orient", "vertical");
    tooltip_delete.setAttribute("id", "dot_popup_tooltip_delete_" + this.left_);
    
    var tooltiplabel_delete = document.createElementNS(XUL_NAMESPACE_, "description");
    var tooltiptext_delete = document.createTextNode(this.strings_.getString("copycut.delete.tooltip"));
    tooltiplabel_delete.style.height = "50px";
    tooltiplabel_delete.appendChild(tooltiptext_delete);
    tooltip_delete.appendChild(tooltiplabel_delete);
    
    popupset.appendChild(tooltip_delete);
    menuitem_delete.setAttribute("tooltip", "dot_popup_tooltip_delete_" + this.left_);

    
    // cut menu item
    menuitem_cut.setAttribute("label", this.strings_.getString("copycut.cut"));
    var tooltip_cut = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip_cut.setAttribute("orient", "vertical");
    tooltip_cut.setAttribute("id", "dot_popup_tooltip_cut_" + this.left_);
    
    var tooltiplabel_cut = document.createElementNS(XUL_NAMESPACE_, "description");
    var tooltiptext_cut = document.createTextNode(this.strings_.getString("copycut.cut.tooltip"));
    tooltiplabel_cut.style.height = "50px";
    tooltiplabel_cut.appendChild(tooltiptext_cut);
    tooltip_cut.appendChild(tooltiplabel_cut);
    
    popupset.appendChild(tooltip_cut);
    menuitem_cut.setAttribute("tooltip", "dot_popup_tooltip_cut_" + this.left_);
    
    
    // paste menu item
    menuitem_paste.setAttribute("label", this.strings_.getString("copycut.paste"));
    var tooltip_paste = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip_paste.setAttribute("orient", "vertical");
    tooltip_paste.setAttribute("id", "dot_popup_tooltip_paste_" + this.left_);
    
    var tooltiplabel_paste = document.createElementNS(XUL_NAMESPACE_, "description");
    var tooltiptext_paste = document.createTextNode(this.strings_.getString("copycut.paste.tooltip"));
    tooltiplabel_paste.style.height = "50px";
    tooltiplabel_paste.appendChild(tooltiptext_paste);
    tooltip_paste.appendChild(tooltiplabel_paste);
    
    popupset.appendChild(tooltip_paste);
    menuitem_paste.setAttribute("tooltip", "dot_popup_tooltip_paste_" + this.left_);
    
    
    popup.appendChild(menuitem_delete);
    popup.appendChild(menuitem_cut);
    popup.appendChild(menuitem_paste);
    
    popupset.appendChild(popup);
    this.stack_.appendChild(popupset);
    this.click_.setAttribute("context", menuname);
    
    var ref = this;
    menuitem_delete.addEventListener("command", function() {ref.deleteParent();}, true);
    menuitem_cut.addEventListener("command", function() {ref.cut();}, true);
    menuitem_paste.addEventListener("command", function() {ref.paste();}, true);
}



/** ****************************************************************************
 * Create tooltip for container containing information about container
 ******************************************************************************/
ContainerVisualisation.prototype.createToolTip = function()
{
    var tooltip = document.createElementNS(XUL_NAMESPACE_, "tooltip");
    tooltip.setAttribute("orient", "vertical");
    tooltip.setAttribute("id", "ThreadVis_" + this.left_);

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
    
    this.stack_.appendChild(tooltip);
}



/** ****************************************************************************
 * cut message
 * don't do anything until we paste the message
 * just remember which message we have to cut
 ******************************************************************************/
ContainerVisualisation.prototype.cut = function()
{
    COPY_MESSAGE_ = this.container_;
    var msgkey = COPY_MESSAGE_.isDummy() ? 
                    "DUMMY" : 
                    COPY_MESSAGE_.getMessage().getKey();
    LOGGER_.log("copycut", {"action" : "cutmessage",
                            "msgkey" : msgkey});
}



/** ****************************************************************************
 * delete the parent-child relationship for this message
 * (i.e. delete the reference to the parent)
 ******************************************************************************/
ContainerVisualisation.prototype.deleteParent = function()
{
    var parent = this.container_.getParent();
    parent.removeChild(this.container_);
    parent.getTopContainer().pruneEmptyContainers();
    var msgid = ! this.container_.isDummy() ? this.container_.getMessage().getId() : "";
    var msgkey = ! this.container_.isDummy() ? this.container_.getMessage().getKey() : "";
    var parentmsgid = ! parent.isDummy() ? parent.getMessage().getId() : "";
    if (msgid != "" && parentmsgid != "")
    {
        THREADVIS_.threader_.copycut_.addCut(msgid + " " + parentmsgid);
        THREADVIS_.setSelectedMessage();
        
        LOGGER_.log("copycut", {"action" : "deletemessage",
                                "msgkey" : msgkey});
    }
}



/** ****************************************************************************
 * Draw circle around container if container is selected
 ******************************************************************************/
ContainerVisualisation.prototype.drawCircle = function(colour)
{
    if (! this.circle_)
        this.circle_ = document.createElementNS(XUL_NAMESPACE_, "box");

    this.visualiseCircle(colour);

    this.stack_.appendChild(this.circle_);
}



/** ****************************************************************************
 * Draw container around dot to catch click events and show tooltip
 ******************************************************************************/
ContainerVisualisation.prototype.drawClick = function()
{
    if (! this.click_)
        this.click_ = document.createElementNS(XUL_NAMESPACE_, "box");

    this.visualiseClick();

    this.click_.container = this.container_;
    this.click_.setAttribute("tooltip", "ThreadVis_" + this.left_);

    this.stack_.appendChild(this.click_);
    this.click_.addEventListener("click", this.onMouseClick, true);
    
    // prevent mousedown event from bubbling to box object
    // prevent dragging of visualisation by clicking on message
    this.click_.addEventListener("mousedown",
        function(event)
        {
            event.stopPropagation();
        },
        true);
}



/** ****************************************************************************
 * Draw dot for container
 ******************************************************************************/
ContainerVisualisation.prototype.drawDot = function()
{
    this.dot_ = document.createElementNS(XUL_NAMESPACE_, "box");

    this.visualiseDot();

    this.stack_.appendChild(this.dot_);
}



/** ****************************************************************************
 * Flash (show and hide) circle to draw attention to selected container
 ******************************************************************************/
ContainerVisualisation.prototype.flash = function()
{
    if (this.flashcount_ == 0)
    {
        clearTimeout(this.flashtimeout_);
        return;
    }

    this.flashcount_--;

    var ref = this;
    this.flashontimout_ = setTimeout(function() {ref.flashOn();}, 10);
}



/** ****************************************************************************
 * Hide circle
 ******************************************************************************/
ContainerVisualisation.prototype.flashOff = function(old)
{
    this.showCircle();
    var ref = this;
    this.flashtimeout_ = setTimeout(function() {ref.flash();}, 500);
}



/** ****************************************************************************
 * Show circle
 ******************************************************************************/
ContainerVisualisation.prototype.flashOn = function()
{
    this.hideCircle();
    var ref = this;
    this.flashofftimeout_ = setTimeout(function() {ref.flashOff();}, 500);
}



/** ****************************************************************************
 * Hide circle
 ******************************************************************************/
ContainerVisualisation.prototype.hideCircle = function()
{
    this.circle_.hidden = true;
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

    // check for double click
    if (event.detail > 1)
        ThreadPaneDoubleClick();

    LOGGER_.logDebug("Visualisation.onMouseClick()", {});
    var container = event.target.container;
    if (container && ! container.isDummy())
        THREADVIS_.callback(container.getMessage().getKey(), 
                             container.getMessage().getFolder());
}



/** ****************************************************************************
 * paste a previously cut message in this thread
 ******************************************************************************/
ContainerVisualisation.prototype.paste = function()
{
    if (COPY_MESSAGE_)
    {
        var copy_parent = COPY_MESSAGE_.getParent();
        this.container_.addChild(COPY_MESSAGE_);
        
        var this_msgid = ! this.container_.isDummy() ? this.container_.getMessage().getId() : "";
        var this_msgkey = ! this.container_.isDummy() ? this.container_.getMessage().getKey() : "";
        var copy_message_msgid = ! COPY_MESSAGE_.isDummy() ? COPY_MESSAGE_.getMessage().getId() : "";
        var copy_message_msgkey = ! COPY_MESSAGE_.isDummy() ? COPY_MESSAGE_.getMessage().getKey() : "";
        var copy_message_parent_msgid = ! copy_parent.isDummy() ? copy_parent.getMessage().getId() : "";
        var copy_message_parent_msgkey = ! copy_parent.isDummy() ? copy_parent.getMessage().getKey() : "";
        
        if (this_msgid != "" && copy_message_msgid != "")
        {
            THREADVIS_.threader_.copycut_.addCut(copy_message_msgid + " " + copy_message_parent_msgid);
            THREADVIS_.threader_.copycut_.addCopy(copy_message_msgid + " " + this_msgid);
            THREADVIS_.setSelectedMessage();
            
            LOGGER_.log("copycut", {"action" : "pastemessage",
                                    "copied-msgkey" : copy_message_msgkey,
                                    "pasted-msgkey" : this_msgkey});
        }
    }
}



/** ****************************************************************************
 * Re-Draw all elements
 ******************************************************************************/
ContainerVisualisation.prototype.redraw = function(resize,
                                                   left,
                                                   top,
                                                   selected,
                                                   flash)
{
    this.resize_ = resize;
    this.left_ = left;
    this.top_ = top;
    this.selected_ = selected;
    this.flash_ = flash;
    
    this.redrawDot();
    this.redrawCircle("black");
    if (! (this.selected_ && this.draw_circle_))
        this.hideCircle();
    else
        this.showCircle();

    this.redrawClick();

    if (this.selected_ && this.draw_circle_ && this.flash_)
        this.startFlash();
}



/** ****************************************************************************
 * Re-Draw circle around container if container is selected
 ******************************************************************************/
ContainerVisualisation.prototype.redrawCircle = function(colour)
{
    this.visualiseCircle(colour);
}



/** ****************************************************************************
 * Re-Draw container around dot to catch click events and show tooltip
 ******************************************************************************/
ContainerVisualisation.prototype.redrawClick = function()
{
    this.visualiseClick();
}



/** ****************************************************************************
 * Re-Draw dot for container
 ******************************************************************************/
ContainerVisualisation.prototype.redrawDot = function()
{
    this.visualiseDot();
}



/** ****************************************************************************
 * Show circle
 ******************************************************************************/
ContainerVisualisation.prototype.showCircle = function()
{
    this.circle_.hidden = false;
}



/** ****************************************************************************
 * Flash (show and hide) circle to draw attention to selected container
 ******************************************************************************/
ContainerVisualisation.prototype.startFlash = function()
{
    this.flashcount_ = 3;
    this.flash();
}



/** ****************************************************************************
 * Stop flashing
 ******************************************************************************/
ContainerVisualisation.prototype.stopFlash = function()
{
    clearInterval(this.flashinterval_);
    clearTimeout(this.flashontimeout_);
    clearTimeout(this.flashofftimeout_);
    this.hideCircle();
}



/** ****************************************************************************
 * Visualise circle around container if container is selected
 ******************************************************************************/
ContainerVisualisation.prototype.visualiseCircle = function(colour)
{
    var style_top = ((this.top_ - (this.dotsize_ * 4/6)) * this.resize_) + "px";
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
}



/** ****************************************************************************
 * Visualise container around dot to catch click events and show tooltip
 ******************************************************************************/
ContainerVisualisation.prototype.visualiseClick = function()
{
    var style_top = ((this.top_ - (this.spacing_ / 2)) * this.resize_) + "px";
    var style_left = ((this.left_ - this.spacing_ / 2) * this.resize_) + "px";
    var style_height = (this.spacing_ * this.resize_) + "px";
    var style_width = (this.spacing_ * this.resize_) + "px";
    var style_background = "";
    var style_border = "";

    LOGGER_.logDebug("Visualisation.drawClick()",
                        {"top" : style_top,
                         "left" : style_left,
                         "height" : style_height,
                         "width" : style_width,
                         "background" : style_background,
                         "border" : style_border});

    this.click_.style.position = "relative";
    this.click_.style.top = style_top;
    this.click_.style.left = style_left;
    this.click_.style.width = style_width;
    this.click_.style.height = style_height;
    this.click_.style.verticalAlign = "top";
    if (this.style_ == "dummy")
        this.click_.style.cursor = "default";
    else
        this.click_.style.cursor = "pointer";
    this.click_.style.zIndex = "2";
}



/** ****************************************************************************
 * Draw dot for container
 ******************************************************************************/
ContainerVisualisation.prototype.visualiseDot = function()
{
    var style_top = ((this.top_ - (this.dotsize_ / 2)) * this.resize_) + "px";
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
    else
        this.dot_.style.MozBorderRadius = "";
    this.dot_.style.cursor = "default";
}
