/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.mozdev.org/
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with ThreadVis. If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *****************************************************************************
 * JavaScript file to visualise message in threadvis
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor for visualisation class
 *
 * @param stack
 *          The stack on which to draw
 * @param strings
 *          The strings object
 * @param container
 *          The container to visualise
 * @param colour
 *          The colour for the container
 * @param left
 *          The left position
 * @param top
 *          The top position
 * @param selected
 *          True if the message is selected
 * @param dotSize
 *          The size of the dot
 * @param resize
 *          The resize parameter
 * @param circle
 *          True to draw a circle
 * @param flash
 *          True to flash
 * @param spacing
 *          The spacing
 * @param opacity
 *          The opacity
 * @param messageCircles
 *          True to draw circle, false to draw square
 * @return
 *          A new container visualisation
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation = function(stack, strings, container, colour,
    left, top, selected, dotSize, resize, circle, flash, spacing, opacity,
    messageCircles) {
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
 * Create popup menu
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.createMenu = function() {
    var menuname = "dot_popup_" + this.left;
    this.click.setAttribute("context", menuname);

    var popupset = document.getElementById("ThreadVisPopUpSet");
    var popup = document.createElementNS(THREADVIS.XUL_NAMESPACE, "popup");
    popup.setAttribute("id", menuname);

    this.popup = popup;

    var ref = this;
    popup.addEventListener("popupshowing", function() { ref.getMenu(); }, true);

    popupset.appendChild(popup);
}



/** ****************************************************************************
 * Fill popup menu
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.getMenu = function() {
    if (this.popup.rendered == true) {
        return;
    }

    // include normal menu items
    var separator = document.createElementNS(THREADVIS.XUL_NAMESPACE,
        "menuseparator");
    this.popup.appendChild(separator);
    var defaultPopup = document.getElementById("ThreadVisPopUp");
    var items = defaultPopup.getElementsByTagName("menuitem");
    for (var i = 0; i < items.length; i++) {
        var item = document.createElementNS(THREADVIS.XUL_NAMESPACE,
            "menuitem");
        item.setAttribute("label",
            items[i].getAttribute("label"));
        item.setAttribute("oncommand",
            items[i].getAttribute("oncommand"));
        this.popup.appendChild(item);
    }

    this.popup.rendered = true;
}



/** ****************************************************************************
 * Create tooltip for container containing information about container
 * Just create stub menu
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.createToolTip = function() {
    var tooltip = document.createElementNS(THREADVIS.XUL_NAMESPACE, "tooltip");
    tooltip.setAttribute("orient", "vertical");
    tooltip.setAttribute("id", "ThreadVis_" + this.left);

    this.tooltip = tooltip;
    var ref = this;
    tooltip.addEventListener("popupshowing",
        function() { ref.getToolTip(); }, true);

    var popupset = document.getElementById("ThreadVisPopUpSet");
    popupset.appendChild(tooltip);
}



/** ****************************************************************************
 * Format a datetime
 *
 * @param date
 *          The date
 * @return
 *          The formatted date
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.formatDate = function(date) {
    var dateFormatService = Components.classes["@mozilla.org/intl/scriptabledateformat;1"]
        .getService(Components.interfaces.nsIScriptableDateFormat);
    var dateString = dateFormatService.FormatDateTime("",
        dateFormatService.dateFormatShort,
        dateFormatService.timeFormatNoSeconds,
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds());

    return dateString;
}



/** ****************************************************************************
 * Fill tooltip for container containing information about container
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.getToolTip = function() {
    if (this.tooltip.rendered == true) {
        return;
    }

    if (! this.container.isDummy()) {
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
        dateText.setAttribute("value", this.formatDate(
            this.container.getMessage().getDate()));

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
    } else {
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
    }
    this.tooltip.rendered = true;
}



/** ****************************************************************************
 * Draw circle around container if container is selected
 *
 * @param colour
 *          The colour of the message
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.drawCircle = function(colour) {
    if (! this.circle) {
        this.circle = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");
    }

    this.visualiseCircle(colour);

    this.stack.appendChild(this.circle);
}



/** ****************************************************************************
 * Draw container around dot to catch click events and show tooltip
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.drawClick = function() {
    if (! this.click) {
        this.click = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");
    }

    this.visualiseClick();

    this.click.container = this.container;
    this.click.setAttribute("tooltip", "ThreadVis_" + this.left);

    this.stack.appendChild(this.click);
    var ref = this;
    this.click.addEventListener("click", function(event) {
        ref.onMouseClick(event);
    }, true);

    // prevent mousedown event from bubbling to box object
    // prevent dragging of visualisation by clicking on message
    this.click.addEventListener("mousedown",
        function(event) {event.stopPropagation();},true);
}



/** ****************************************************************************
 * Draw dot for container
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.drawDot = function() {
    this.dot = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");

    this.visualiseDot();

    this.stack.appendChild(this.dot);
}



/** ****************************************************************************
 * Flash (show and hide) circle to draw attention to selected container
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.flash = function() {
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
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.flashOff = function() {
    this.showCircle();
    var ref = this;
    this.flashTimeout = setTimeout(function() {ref.flash();}, 500);
}



/** ****************************************************************************
 * Show circle
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.flashOn = function() {
    this.hideCircle();
    var ref = this;
    this.flashOffTimeout = setTimeout(function() {ref.flashOff();}, 500);
}



/** ****************************************************************************
 * Hide circle
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.hideCircle = function() {
    this.circle.hidden = true;
}



/** ****************************************************************************
 * Mouse click event handler
 * Display message user clicked on
 *
 * @param event
 *          The mouse event
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.onMouseClick = function(event) {
    // only react to left mouse click
    if (event.button != 0) {
        return;
    }

    // check for double click
    if (event.detail > 1) {
        clearTimeout(this.clickTimeout);
        if (THREADVIS.hasPopupVisualisation()) {
            THREADVIS.getMainWindow().ThreadPaneDoubleClick();
        } else {
            ThreadPaneDoubleClick();
        }
    } else {
        var ref = this;
        this.clickTimeout = setTimeout(function() {
            ref.onMouseClickDelayed(event);
        }, 100);
    }
}



/** ****************************************************************************
 * Mouse click delayed, to catch for double click
 *
 * @param event
 *          The mouse event
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.onMouseClickDelayed = function(event) {
    var container = event.target.container;
    if (container && ! container.isDummy()) {
        // check to see if this visualisation is in the popup window
        // if so, call functions in opener
        var elem = window;
        if (THREADVIS.isPopupVisualisation()) {
            elem = window.opener;
        }
        elem.THREADVIS.callback(container.getMessage(), elem.THREADVIS.isMessageWindow());
    }
}



/** ****************************************************************************
 * Re-Draw all elements
 *
 * @param resize
 *          The resize parameter
 * @param left
 *          The left position
 * @param top
 *          The top position
 * @param selected
 *          True if container is selected
 * @param flash
 *          True to flash
 * @param colour
 *          The colour
 * @param opacity
 *          The opacity
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.redraw = function(resize, left,
    top, selected, flash, colour, opacity) {
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
 *
 * @param colour
 *          The colour
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.redrawCircle = function(colour) {
    this.visualiseCircle(colour);
}



/** ****************************************************************************
 * Re-Draw container around dot to catch click events and show tooltip
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.redrawClick = function() {
    this.visualiseClick();
}



/** ****************************************************************************
 * Re-Draw dot for container
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.redrawDot = function() {
    this.visualiseDot();
}



/** ****************************************************************************
 * Show circle
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.showCircle = function() {
    this.circle.hidden = false;
}



/** ****************************************************************************
 * Flash (show and hide) circle to draw attention to selected container
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.startFlash = function() {
    this.flashCount = 3;
    this.flash();
}



/** ****************************************************************************
 * Stop flashing
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.stopFlash = function() {
    clearInterval(this.flashInterval);
    clearTimeout(this.flashOnTimeout);
    clearTimeout(this.flashOffTimeout);
    this.hideCircle();
}



/** ****************************************************************************
 * Visualise circle around container if container is selected
 *
 * @param colour
 *          The colour
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.visualiseCircle = function(colour) {
    var styleTop = ((this.top - (this.dotSize * 4/6)) * this.resize) + "px";
    var styleLeft = ((this.left - (this.dotSize * 4/6)) * this.resize) + "px";
    var styleHeight = (this.dotSize * 8/6 * this.resize) + "px";
    var styleWidth = (this.dotSize * 8/6 * this.resize) + "px";
    var styleBackground = "";
    var styleBorder = "";
    styleBorder = (this.dotSize / 6 * this.resize) + "px solid " + colour;

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
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.visualiseClick = function() {
    var styleTop = ((this.top - (this.spacing / 2)) * this.resize) + "px";
    var styleLeft = ((this.left - this.spacing / 2) * this.resize) + "px";
    var styleHeight = (this.spacing * this.resize) + "px";
    var styleWidth = (this.spacing * this.resize) + "px";
    var styleBackground = "";
    var styleBorder = "";

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
    this.click.style.zIndex = "2"
}



/** ****************************************************************************
 * Draw dot for container
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.ContainerVisualisation.prototype.visualiseDot = function() {
    var styleTop = ((this.top - (this.dotSize / 2)) * this.resize);
    var styleLeft = ((this.left - (this.dotSize / 2)) * this.resize);
    var styleHeight = (this.dotSize * this.resize);
    var styleWidth = (this.dotSize * this.resize);
    var styleBackground = "";
    var styleBorder = "";
    var styleOpacity = this.opacity;
    if (this.style != "half") {
        styleBackground = this.colour;
    } else {
        styleBorder = (this.dotSize / 4 * this.resize) + "px solid "
            + this.colour;
    }

    this.dot.style.position = "relative";
    this.dot.style.top = styleTop + "px";
    this.dot.style.left = styleLeft + "px";
    this.dot.style.width = styleWidth + "px";
    this.dot.style.height = styleHeight + "px";
    this.dot.style.verticalAlign = "top";
    this.dot.style.background = styleBackground;
    this.dot.style.border = styleBorder;
    this.dot.style.opacity = styleOpacity;

    if (this.style != "dummy") {
        if (this.messageCircles) {
            this.dot.style.MozBorderRadius = styleWidth + "px";
        } else {
            this.dot.style.MozBorderRadius = "";
        }
    } else {
        this.dot.style.MozBorderRadius = "";
    }
    this.dot.style.cursor = "default";
}
