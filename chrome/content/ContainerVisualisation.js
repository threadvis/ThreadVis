/** ****************************************************************************
 * ContainerVisualisation.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to visualise message in threadvis
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor for visualisation class
 ******************************************************************************/
function ContainerVisualisation(stack, strings, container, colour, left, top,
    selected, dotSize, resize, circle, flash, spacing, opacity, messageCircles) {
    /**
     * XUL stack on which container gets drawn
     */
    this.stack = stack;

    /**
     * the stringbundle element to access localised strings
     */
    this.strings = strings;

    /**
     * the container which gets visualised
     */
    this.container = container;

    /**
     * colour of container
     */
    this.colour = colour;

    /**
     * left position of container in px
     */
    this.left = left;

    /**
     * top position of container in px
     */
    this.top = top;

    /**
     * is container selected (boolean)
     */
    this.selected = selected;

    /**
     * size of the dot to draw in px
     */
    this.dotSize = dotSize;

    /**
     * resize multiplicator
     */
    this.resize = resize;

    /**
     * should be draw a circle around the dot to mark it as selected (boolean)
     */
    this.isCircle = circle;

    /**
     * number of times the circle flashes
     */
    this.flashCount = 3;

    /**
     * should the circle be flashing (boolean)
     */
    this.flash = flash;

    /**
     * the spacing between two messages in px
     */
    this.spacing = spacing;

    /**
     * the opacity of the item
     */
    this.opacity = opacity;

    /**
     * if true, draw circle, else draw square
     */
    this.messageCircles = messageCircles;

    // calculate style
    // full == received message
    // half == sent message
    // dummy == unknown message
    this.style = "full";
    if (! this.container.isDummy()) {
        if (this.container.getMessage().isSent()) {
            this.style = "half";
        }
    } else {
        this.style ="dummy";
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "ContainerVisualisation()", {"action" : "start", "container" :
            this.container.toString(), "colour" : this.colour, "style" :
            this.style, "left" : this.left, "top" : this.top});
    }

    this.drawDot();

    this.drawCircle("black");
    if (! (this.selected && this.isCircle)) {
        this.hideCircle();
    } else {
        this.showCircle();
    }

    this.drawClick();

    this.createToolTip();
    this.createMenu();

    if (this.selected && this.isCircle && this.flash) {
        this.startFlash();
    }
}



/** ****************************************************************************
* create popup menu to delete, copy and cut messages
* just create stub menu
 ******************************************************************************/
ContainerVisualisation.prototype.createMenu = function() {
    var menuname = "dot_popup_" + this.left;
    this.click.setAttribute("context", menuname);

    var popupset = document.createElementNS(THREADVIS.XUL_NAMESPACE, "popupset");
    var popup = document.createElementNS(THREADVIS.XUL_NAMESPACE, "popup");
    popup.setAttribute("id", menuname);

    this.popup = popup;

    var ref = this;
    popup.addEventListener("popupshowing", function() { ref.getMenu(); }, true);

    popupset.appendChild(popup);
    this.stack.appendChild(popupset);
}



/** ****************************************************************************
* fill popup menu to delete, copy and cut messages
 ******************************************************************************/
ContainerVisualisation.prototype.getMenu = function() {
    if (this.popup.rendered == true) {
        return;
    }

    var menuitemDelete = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "menuitem");
    var menuitemCut = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "menuitem");
    var menuitemPaste = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "menuitem");

    // delete menu item
    menuitemDelete.setAttribute("label",
        this.strings.getString("copycut.delete"));
    var tooltipDelete = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "tooltip");
    tooltipDelete.setAttribute("orient", "vertical");
    tooltipDelete.setAttribute("id", "dot_popup_tooltip_delete_" + this.left);

    var tooltipLabelDelete = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "description");
    var tooltipTextDelete = document.createTextNode(
        this.strings.getString("copycut.delete.tooltip"));
    tooltipLabelDelete.style.height = "50px";
    tooltipLabelDelete.appendChild(tooltipTextDelete);
    tooltipDelete.appendChild(tooltipLabelDelete);

    menuitemDelete.setAttribute("tooltip", "dot_popup_tooltip_delete_"
        + this.left);

    // cut menu item
    menuitemCut.setAttribute("label", this.strings.getString("copycut.cut"));
    var tooltipCut = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "tooltip");
    tooltipCut.setAttribute("orient", "vertical");
    tooltipCut.setAttribute("id", "dot_popup_tooltip_cut_" + this.left);

    var tooltipLabelCut = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "description");
    var tooltipTextCut = document.createTextNode(
        this.strings.getString("copycut.cut.tooltip"));
    tooltipLabelCut.style.height = "50px";
    tooltipLabelCut.appendChild(tooltipTextCut);
    tooltipCut.appendChild(tooltipLabelCut);

    menuitemCut.setAttribute("tooltip", "dot_popup_tooltip_cut_" + this.left);

    // paste menu item
    menuitemPaste.setAttribute("label",
        this.strings.getString("copycut.paste"));
    var tooltipPaste = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "tooltip");
    tooltipPaste.setAttribute("orient", "vertical");
    tooltipPaste.setAttribute("id", "dot_popup_tooltip_paste_" + this.left);

    var tooltipLabelPaste = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "description");
    var tooltipTextPaste = document.createTextNode(
        this.strings.getString("copycut.paste.tooltip"));
    tooltipLabelPaste.style.height = "50px";
    tooltipLabelPaste.appendChild(tooltipTextPaste);
    tooltipPaste.appendChild(tooltipLabelPaste);

    menuitemPaste.setAttribute("tooltip", "dot_popup_tooltip_paste_"
        + this.left);

    this.popup.appendChild(menuitemDelete);
    this.popup.appendChild(menuitemCut);
    this.popup.appendChild(menuitemPaste);

    var ref = this;
    menuitemDelete.addEventListener("command",
        function() {ref.deleteParent();}, true);
    menuitemCut.addEventListener("command",
        function() {ref.cut();}, true);
    menuitemPaste.addEventListener("command",
        function() {ref.paste();}, true);

    this.popup.rendered = true;
}



/** ****************************************************************************
 * Create tooltip for container containing information about container
 * just create stub menu
 ******************************************************************************/
ContainerVisualisation.prototype.createToolTip = function() {
    var tooltip = document.createElementNS(THREADVIS.XUL_NAMESPACE, "tooltip");
    tooltip.setAttribute("orient", "vertical");
    tooltip.setAttribute("id", "ThreadVis_" + this.left);

    this.tooltip = tooltip;
    var ref = this;
    tooltip.addEventListener("popupshowing",
        function() { ref.getToolTip(); }, true);

    this.stack.appendChild(tooltip);
}



/** ****************************************************************************
 * fill tooltip for container containing information about container
 ******************************************************************************/
ContainerVisualisation.prototype.getToolTip = function() {
    if (this.tooltip.rendered == true) {
        return;
    }

    if (! this.container.isDummy()) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Visualisation.drawDot()", {"action" : "create tooltip start"});
        }

        // if container container message, view details
        var authorLabel = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "label");
        var authorText = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "label");
        var author = document.createElementNS(THREADVIS.XUL_NAMESPACE, "hbox");
        author.appendChild(authorLabel);
        author.appendChild(authorText);
        authorLabel.setAttribute("value",
            this.strings.getString("tooltip.from"));
        authorLabel.style.fontWeight = "bold";
        authorText.setAttribute("value", this.container.getMessage().getFrom());

        var dateLabel = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "label");
        var dateText = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "label");
        var date = document.createElementNS(THREADVIS.XUL_NAMESPACE, "hbox");
        date.appendChild(dateLabel);
        date.appendChild(dateText);
        dateLabel.setAttribute("value", this.strings.getString("tooltip.date"));
        dateLabel.style.fontWeight = "bold";
        dateText.setAttribute("value", this.container.getMessage().getDate());

        var subjectLabel = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "label");
        var subjectText = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "label");
        var subject = document.createElementNS(THREADVIS.XUL_NAMESPACE, "hbox");
        subject.appendChild(subjectLabel);
        subject.appendChild(subjectText);
        subjectLabel.setAttribute("value",
            this.strings.getString("tooltip.subject"));
        subjectLabel.style.fontWeight = "bold";
        subjectText.setAttribute("value",
            this.container.getMessage().getSubject());

        this.tooltip.appendChild(author);
        this.tooltip.appendChild(date);
        this.tooltip.appendChild(subject);

        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Visualisation.drawDot()", {"action" : "create tooltip end"});
        }
    } else {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Visualisation.drawDot()", {"action" :
                "create missing tooltip start"});
        }
        
        // otherwise we display info about missing message
        var desc1 = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "description");
        var desc2 = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "description");
        desc1.setAttribute("value",
            this.strings.getString("tooltip.missingmessage"));
        desc2.setAttribute("value",
            this.strings.getString("tooltip.missingmessagedetail"));
        this.tooltip.appendChild(desc1);
        this.tooltip.appendChild(desc2);

        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Visualisation.drawDot()",
                {"action" : "create missing tooltip end"});
        }
    }
    this.tooltip.rendered = true;
}



/** ****************************************************************************
 * cut message
 * don't do anything until we paste the message
 * just remember which message we have to cut
 ******************************************************************************/
ContainerVisualisation.prototype.cut = function() {
    THREADVIS.copyMessage = this.container;
    var msgKey = THREADVIS.copyMessage.isDummy() ? "DUMMY" : 
                    THREADVIS.copyMessage.getMessage().getKey();
    THREADVIS.logger.log("copycut", {"action" : "cutmessage",
        "msgkey" : msgKey});
}



/** ****************************************************************************
 * delete the parent-child relationship for this message
 * (i.e. delete the reference to the parent)
 ******************************************************************************/
ContainerVisualisation.prototype.deleteParent = function() {
    var parent = this.container.getParent();
    parent.removeChild(this.container);
    parent.getTopContainer().pruneEmptyContainers();

    var msgid = ! this.container.isDummy() ?
        this.container.getMessage().getId() : "";
    var msgkey = ! this.container.isDummy() ?
        this.container.getMessage().getKey() : "";
    var parentmsgid = ! parent.isDummy() ? parent.getMessage().getId() : "";

    if (msgid != "" && parentmsgid != "") {
        THREADVIS.threader.copycut.addCut(msgid + " " + parentmsgid);
        THREADVIS.setSelectedMessage();

        THREADVIS.logger.log("copycut", {"action" : "deletemessage",
            "msgkey" : msgkey});
    }
}



/** ****************************************************************************
 * Draw circle around container if container is selected
 ******************************************************************************/
ContainerVisualisation.prototype.drawCircle = function(colour) {
    if (! this.circle) {
        this.circle = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");
    }

    this.visualiseCircle(colour);

    this.stack.appendChild(this.circle);
}



/** ****************************************************************************
 * Draw container around dot to catch click events and show tooltip
 ******************************************************************************/
ContainerVisualisation.prototype.drawClick = function() {
    if (! this.click) {
        this.click = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");
    }

    this.visualiseClick();

    this.click.container = this.container;
    this.click.setAttribute("tooltip", "ThreadVis_" + this.left);

    this.stack.appendChild(this.click);
    this.click.addEventListener("click", this.onMouseClick, true);

    // prevent mousedown event from bubbling to box object
    // prevent dragging of visualisation by clicking on message
    this.click.addEventListener("mousedown",
        function(event) {event.stopPropagation();},true);
}



/** ****************************************************************************
 * Draw dot for container
 ******************************************************************************/
ContainerVisualisation.prototype.drawDot = function() {
    this.dot = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");

    this.visualiseDot();

    this.stack.appendChild(this.dot);
}



/** ****************************************************************************
 * Flash (show and hide) circle to draw attention to selected container
 ******************************************************************************/
ContainerVisualisation.prototype.flash = function() {
    if (this.flashCount == 0) {
        clearTimeout(this.flashTimeout);
        return;
    }

    this.flashCount--;

    var ref = this;
    this.flashOnTimeout = setTimeout(function() {ref.flashOn();}, 10);
}



/** ****************************************************************************
 * Hide circle
 ******************************************************************************/
ContainerVisualisation.prototype.flashOff = function(old) {
    this.showCircle();
    var ref = this;
    this.flashTimeout = setTimeout(function() {ref.flash();}, 500);
}



/** ****************************************************************************
 * Show circle
 ******************************************************************************/
ContainerVisualisation.prototype.flashOn = function() {
    this.hideCircle();
    var ref = this;
    this.flashOffTimeout = setTimeout(function() {ref.flashOff();}, 500);
}



/** ****************************************************************************
 * Hide circle
 ******************************************************************************/
ContainerVisualisation.prototype.hideCircle = function() {
    this.circle.hidden = true;
}



/** ****************************************************************************
 * mouse click event handler
 * display message user clicked on
 ******************************************************************************/
ContainerVisualisation.prototype.onMouseClick = function(event) {
    // only react to left mouse click
    if (event.button != 0) {
        return;
    }

    // check for double click
    if (event.detail > 1) {
        ThreadPaneDoubleClick();
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.onMouseClick()", {});
    }

    var container = event.target.container;
    if (container && ! container.isDummy()) {
        THREADVIS.callback(container.getMessage().getKey(),
            container.getMessage().getFolder());
    }
}



/** ****************************************************************************
 * paste a previously cut message in this thread
 ******************************************************************************/
ContainerVisualisation.prototype.paste = function() {
    if (THREADVIS.copyMessage) {
        // check to see if user creates a loop
        if (THREADVIS.copyMessage.findChild(this.container)) {
            alert("Action not allowed. This would create a loop.");
            return;
        }
        var copyParent = THREADVIS.copyMessage.getParent();
        this.container.addChild(THREADVIS.copyMessage);

        var thisMsgid = ! this.container.isDummy() ?
            this.container.getMessage().getId() : "";
        var thisMsgkey = ! this.container.isDummy() ?
            this.container.getMessage().getKey() : "";
        var copyMessageMsgid = ! THREADVIS.copyMessage.isDummy() ?
            THREADVIS.copyMessage.getMessage().getId() : "";
        var copyMessageMsgkey = ! THREADVIS.copyMessage.isDummy() ?
            THREADVIS.copyMessage.getMessage().getKey() : "";
        var copyMessageParentMsgid = ! copyParent.isDummy() ?
            copyParent.getMessage().getId() : "";
        var copyMessageParentMsgkey = ! copyParent.isDummy() ?
            copyParent.getMessage().getKey() : "";
        
        if (thisMsgid != "" && copyMessageMsgid != "") {
            THREADVIS.threader.copycut.addCut(copyMessageMsgid + " "
                + copyMessageParentMsgid);
            THREADVIS.threader.copycut.addCopy(copyMessageMsgid + " "
                + thisMsgid);
            THREADVIS.setSelectedMessage();

            THREADVIS.logger.log("copycut", {"action" : "pastemessage",
                "copied-msgkey" : copyMessageMsgkey,
                "pasted-msgkey" : thisMsgkey});
        }
    }
}



/** ****************************************************************************
 * Re-Draw all elements
 ******************************************************************************/
ContainerVisualisation.prototype.redraw = function(resize, left, top, selected,
    flash, colour, opacity) {
    this.resize = resize;
    this.left = left;
    this.top = top;
    this.selected = selected;
    this.flash = flash;
    this.colour = colour;
    this.opacity = opacity;

    this.redrawDot();
    this.redrawCircle("black");
    if (! (this.selected && this.isCircle)) {
        this.hideCircle();
    } else {
        this.showCircle();
    }

    this.redrawClick();

    if (this.selected && this.drawCircle && this.flash) {
        this.startFlash();
    }
}



/** ****************************************************************************
 * Re-Draw circle around container if container is selected
 ******************************************************************************/
ContainerVisualisation.prototype.redrawCircle = function(colour) {
    this.visualiseCircle(colour);
}



/** ****************************************************************************
 * Re-Draw container around dot to catch click events and show tooltip
 ******************************************************************************/
ContainerVisualisation.prototype.redrawClick = function() {
    this.visualiseClick();
}



/** ****************************************************************************
 * Re-Draw dot for container
 ******************************************************************************/
ContainerVisualisation.prototype.redrawDot = function() {
    this.visualiseDot();
}



/** ****************************************************************************
 * Show circle
 ******************************************************************************/
ContainerVisualisation.prototype.showCircle = function() {
    this.circle.hidden = false;
}



/** ****************************************************************************
 * Flash (show and hide) circle to draw attention to selected container
 ******************************************************************************/
ContainerVisualisation.prototype.startFlash = function() {
    this.flashCount = 3;
    this.flash();
}



/** ****************************************************************************
 * Stop flashing
 ******************************************************************************/
ContainerVisualisation.prototype.stopFlash = function() {
    clearInterval(this.flashInterval);
    clearTimeout(this.flashOnTimeout);
    clearTimeout(this.flashOffTimeout);
    this.hideCircle();
}



/** ****************************************************************************
 * Visualise circle around container if container is selected
 ******************************************************************************/
ContainerVisualisation.prototype.visualiseCircle = function(colour) {
    var styleTop = ((this.top - (this.dotSize * 4/6)) * this.resize) + "px";
    var styleLeft = ((this.left - (this.dotSize * 4/6)) * this.resize) + "px";
    var styleHeight = (this.dotSize * 8/6 * this.resize) + "px";
    var styleWidth = (this.dotSize * 8/6 * this.resize) + "px";
    var styleBackground = "";
    var styleBorder = "";
    styleBorder = (this.dotSize / 6 * this.resize) + "px solid " + colour;

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.drawDot()", {"action" : "draw selection circle",
            "top" : styleTop, "left" : styleLeft, "height" : styleHeight,
            "width" : styleWidth, "background" : styleBackground,
            "border" : styleBorder});
    }

    this.circle.style.position = "relative";
    this.circle.style.top = styleTop;
    this.circle.style.left = styleLeft;
    this.circle.style.width = styleWidth;
    this.circle.style.height = styleHeight;
    this.circle.style.verticalAlign = "top";
    this.circle.style.border = styleBorder;
    if (this.messageCircles) {
        this.circle.style.MozBorderRadius = styleWidth;
    } else {
        this.circle.style.MozBorderRadius = "";
    }
}



/** ****************************************************************************
 * Visualise container around dot to catch click events and show tooltip
 ******************************************************************************/
ContainerVisualisation.prototype.visualiseClick = function() {
    var styleTop = ((this.top - (this.spacing / 2)) * this.resize) + "px";
    var styleLeft = ((this.left - this.spacing / 2) * this.resize) + "px";
    var styleHeight = (this.spacing * this.resize) + "px";
    var styleWidth = (this.spacing * this.resize) + "px";
    var styleBackground = "";
    var styleBorder = "";

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.drawClick()", {"top" : styleTop, "left" : styleLeft,
            "height" : styleHeight, "width" : styleWidth, "background" :
            styleBackground, "border" : styleBorder});
    }

    this.click.style.position = "relative";
    this.click.style.top = styleTop;
    this.click.style.left = styleLeft;
    this.click.style.width = styleWidth;
    this.click.style.height = styleHeight;
    this.click.style.verticalAlign = "top";

    if (this.style == "dummy") {
        this.click.style.cursor = "default";
    } else {
        this.click.style.cursor = "pointer";
    }
    this.click.style.zIndex = "2";
}



/** ****************************************************************************
 * Draw dot for container
 ******************************************************************************/
ContainerVisualisation.prototype.visualiseDot = function() {
    var styleTop = ((this.top - (this.dotSize / 2)) * this.resize) + "px";
    var styleLeft = ((this.left - (this.dotSize / 2)) * this.resize) + "px";
    var styleHeight = (this.dotSize * this.resize) + "px";
    var styleWidth = (this.dotSize * this.resize) + "px";
    var styleBackground = "";
    var styleBorder = "";
    var styleOpacity = this.opacity;
    if (this.style != "half") {
        styleBackground = this.colour;
    } else {
        styleBorder = (this.dotSize / 4 * this.resize) + "px solid "
            + this.colour;
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.drawDot()", {"top" : styleTop, "left" : styleLeft,
            "height" : styleHeight, "width" : styleWidth, "background" :
            styleBackground, "border" : styleBorder});
    }

    this.dot.style.position = "relative";
    this.dot.style.top = styleTop;
    this.dot.style.left = styleLeft;
    this.dot.style.width = styleWidth;
    this.dot.style.height = styleHeight;
    this.dot.style.verticalAlign = "top";
    this.dot.style.background = styleBackground;
    this.dot.style.border = styleBorder;
    this.dot.style.opacity = styleOpacity;

    if (this.style != "dummy") {
        if (this.messageCircles) {
            this.dot.style.MozBorderRadius = styleWidth;
        } else {
            this.dot.style.MozBorderRadius = "";
        }
    } else {
        this.dot.style.MozBorderRadius = "";
    }
    this.dot.style.cursor = "default";
}
