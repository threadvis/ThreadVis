/* *********************************************************************************************************************
 * This file is part of ThreadVis.
 * https://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis titled
 * "ThreadVis for Thunderbird: A Thread Visualisation Extension for the Mozilla Thunderbird Email Client"
 * at Graz University of Technology, Austria. An electronic version of the thesis is available online at
 * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with ThreadVis.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *********************************************************************************************************************
 * JavaScript file to visualise message in threadvis
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "ContainerVisualisation" ];

const { Strings } = ChromeUtils.import("chrome://threadvis/content/strings.js");
const { Util } = ChromeUtils.import("chrome://threadvis/content/util.js");

class ContainerVisualisation {
    /**
     * Constructor for visualisation class
     * 
     * @constructor
     * @param {ThreadVis} threadvis Main element
     * @param {DOMElement} document The document this visualisation is drawn in
     * @param {DOMElement} stack The stack on which to draw
     * @param {Container} container The container to visualise
     * @param {String} colour The colour for the container
     * @param {Number} left The left position
     * @param {Number} top The top position
     * @param {Boolean} selected True if the message is selected
     * @param {Number} dotSize The size of the dot
     * @param {Number} resize The resize parameter
     * @param {Boolean} circle True to draw a circle
     * @param {Number} spacing The spacing
     * @param {Number} opacity The opacity
     * @param {Boolean} messageCircles True to draw circle, false to draw square
     * @return {ContainerVisualisation} A new container visualisation
     * @type ContainerVisualisation
     */
    constructor(threadvis, document, stack, container, colour, left, top, selected, dotSize, resize, circle, spacing,
            opacity, messageCircles) {
        /**
         * Main object
         */
        this.threadvis = threadvis;

        /**
         * The XUL/DOM document the visualisation is drawn on
         */
        this.document = document;

        /**
         * XUL stack on which container gets drawn
         */
        this.stack = stack;

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
         * should we draw a circle around the dot to mark it as selected (boolean)
         */
        this.isCircle = circle;

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

        /**
         * DOM element to handle the context popup
         */
        this.popup = null;

        /**
         * Style of container (default == full)
         */
        this.style = "full";

        // calculate style
        // full == received message
        // half == sent message
        // dummy == unknown message
        if (!this.container.isDummy()) {
            if (this.container.getMessage().isSent()) {
                this.style = "half";
            }
        } else {
            this.style = "dummy";
        }

        this.drawDot();

        this.drawCircle("AliceBlue");
        if (!(this.selected && this.isCircle)) {
            this.hideCircle();
        } else {
            this.showCircle();
        }

        this.drawClick();

        this.createToolTip();
        this.createMenu();
    };

    /**
     * Create popup menu
     */
    createMenu() {
        let menuname = "dot_popup_" + this.left;
        this.click.setAttribute("context", menuname);

        let popupset = this.document.getElementById("ThreadVisPopUpSet");
        let popup = this.document.createXULElement("popup");
        popup.setAttribute("id", menuname);

        this.popup = popup;

        popup.addEventListener("popupshowing", function() {
            this.getMenu();
        }.bind(this), true);

        popupset.appendChild(popup);
    }

    /**
     * Fill popup menu
     */
    getMenu() {
        if (this.popup.rendered == true) {
            return;
        }

        // include normal menu items
        let defaultPopup = this.document.getElementById("ThreadVisPopUp");
        let items = defaultPopup.getElementsByTagName("menuitem");
        for (let i = 0; i < items.length; i++) {
            let item = this.document.createXULElement("menuitem");
            item.setAttribute("label", items[i].getAttribute("label"));
            item.setAttribute("oncommand", items[i].getAttribute("oncommand"));
            this.popup.appendChild(item);
        }

        this.popup.rendered = true;
    }

    /**
     * Create tooltip for container containing information about container.
     * Just create stub menu
     */
    createToolTip() {
        let tooltip = this.document.createXULElement("tooltip");
        tooltip.setAttribute("orient", "vertical");
        tooltip.setAttribute("id", "ThreadVis_" + this.left);

        this.tooltip = tooltip;
        tooltip.addEventListener("popupshowing", function() {
            this.getToolTip();
        }.bind(this), true);

        let popupset = this.document.getElementById("ThreadVisPopUpSet");
        popupset.appendChild(tooltip);
    }

    /**
     * Fill tooltip for container containing information about container
     */
    getToolTip() {
        if (this.tooltip.rendered == true) {
            return;
        }

        if (!this.container.isDummy()) {
            // if container container message, view details
            let authorLabel = this.document.createXULElement("label");
            let authorText = this.document.createXULElement("label");
            let author = this.document.createXULElement("hbox");
            author.appendChild(authorLabel);
            author.appendChild(authorText);
            authorLabel.setAttribute("value", Strings.getString("tooltip.from"));
            authorLabel.style.fontWeight = "bold";
            authorText.setAttribute("value", this.container.getMessage().getFrom());

            let dateLabel = this.document.createXULElement("label");
            let dateText = this.document.createXULElement("label");
            let date = this.document.createXULElement("hbox");
            date.appendChild(dateLabel);
            date.appendChild(dateText);
            dateLabel.setAttribute("value", Strings.getString("tooltip.date"));
            dateLabel.style.fontWeight = "bold";
            dateText.setAttribute("value", Util.formatDate(this.container.getMessage().getDate()));

            let subjectLabel = this.document.createXULElement("label");
            let subjectText = this.document.createXULElement("label");
            let subject = this.document.createXULElement("hbox");
            subject.appendChild(subjectLabel);
            subject.appendChild(subjectText);
            subjectLabel.setAttribute("value", Strings.getString("tooltip.subject"));
            subjectLabel.style.fontWeight = "bold";
            subjectText.setAttribute("value", this.container.getMessage().getSubject());

            let body = this.document.createXULElement("description");
            let bodyText = this.document.createTextNode(this.container.getMessage().getBody());
            body.appendChild(bodyText);

            this.tooltip.appendChild(author);
            this.tooltip.appendChild(date);
            this.tooltip.appendChild(subject);
            this.tooltip.appendChild(this.document.createXULElement("separator"));
            this.tooltip.appendChild(body);
        } else {
            // otherwise we display info about missing message
            let desc1 = this.document.createXULElement("description");
            let desc2 = this.document.createXULElement("description");
            desc1.setAttribute("value", Strings.getString("tooltip.missingmessage"));
            desc2.setAttribute("value", Strings.getString("tooltip.missingmessagedetail"));
            this.tooltip.appendChild(desc1);
            this.tooltip.appendChild(desc2);
        }
        this.tooltip.rendered = true;
    }

    /**
     * Draw circle around container if container is selected
     * 
     * @param {String}
     *            colour The colour of the message
     */
    drawCircle(colour) {
        if (!this.circle) {
            this.circle = this.document.createXULElement("box");
            this.circle.style.position = "relative";
        }

        this.visualiseCircle(colour);

        this.stack.appendChild(this.circle);
    }

    /**
     * Draw container around dot to catch click events and show tooltip
     */
    drawClick() {
        if (!this.click) {
            this.click = this.document.createXULElement("box");
            this.click.style.position = "relative";
        }

        this.visualiseClick();

        this.click.container = this.container;
        this.click.setAttribute("tooltip", "ThreadVis_" + this.left);

        this.stack.appendChild(this.click);
        this.click.addEventListener("click", function(event) {
            this.onMouseClick(event);
        }.bind(this), true);

        // prevent mousedown event from bubbling to box object
        // prevent dragging of visualisation by clicking on message
        this.click.addEventListener("mousedown", function(event) {
            event.stopPropagation();
        }, true);
    }

    /**
     * Draw dot for container
     */
    drawDot() {
        this.dot = this.document.createXULElement("box");
        this.dot.style.position = "relative";

        this.visualiseDot();

        this.stack.appendChild(this.dot);
    }

    /**
     * Hide circle
     */
    hideCircle() {
        this.circle.hidden = true;
    }

    /**
     * Mouse click event handler Display message user clicked on
     * 
     * @param {DOMEvent} event The mouse event
     */
    onMouseClick(event) {
        // only react to left mouse click
        if (event.button != 0) {
            return;
        }

        // check for double click
        let elem = this.threadvis;
        if (elem.isPopupVisualisation()) {
            elem = window.opener.ThreadVis;
        }
        if (event.detail > 1) {
            elem.openNewMessage(this.container.getMessage().getMsgDbHdr());
        } else {
            if (!this.container.isDummy()) {
                // check to see if this visualisation is in the popup window
                // if so, call functions in opener
                elem.callback(this.container.getMessage());
            }
        }
    }

    /**
     * Re-Draw all elements
     * 
     * @param {Number} resize The resize parameter
     * @param {Number} left The left position
     * @param {Number} top The top position
     * @param {Boolean} selected True if container is selected
     * @param {String} colour The colour
     * @param {Number} opacity The opacity
     */
    redraw(resize, left, top, selected, colour, opacity) {
        this.resize = resize;
        this.left = left;
        this.top = top;
        this.selected = selected;
        this.colour = colour;
        this.opacity = opacity;

        this.redrawDot();
        this.redrawCircle("AliceBlue");
        if (!(this.selected && this.isCircle)) {
            this.hideCircle();
        } else {
            this.showCircle();
        }

        this.redrawClick();
    }

    /**
     * Re-Draw circle around container if container is selected
     * 
     * @param {String} colour The colour
     */
    redrawCircle(colour) {
        this.visualiseCircle(colour);
    }

    /**
     * Re-Draw container around dot to catch click events and show tooltip
     */
    redrawClick() {
        this.visualiseClick();
    }

    /**
     * Re-Draw dot for container
     */
    redrawDot() {
        this.visualiseDot();
    }

    /**
     * Show circle
     */
    showCircle() {
        this.circle.hidden = false;
    }

    /**
     * Visualise circle around container if container is selected
     * 
     * @param {String} colour The colour
     */
    visualiseCircle(colour) {
        let posTop = ((this.top - (this.dotSize * 2 / 3)) * this.resize);
        let posLeft = ((this.left - (this.dotSize * 2 / 3)) * this.resize);
        let posHeight = (this.dotSize * 4 / 3 * this.resize);
        let posWidth = (this.dotSize * 4 / 3 * this.resize);
        let styleBorder = (this.dotSize / 4 * this.resize ) + "px solid " + colour;

        this.circle.style.top = posTop + "px";
        this.circle.style.left = posLeft + "px";
        this.circle.style.width = posWidth + "px";
        this.circle.style.height = posHeight + "px";
        this.circle.style.border = styleBorder;
        if (this.messageCircles) {
            this.circle.style.borderRadius = posWidth + "px";
        } else {
            this.circle.style.borderRadius = "";
        }
    }

    /**
     * Visualise container around dot to catch click events and show tooltip
     */
    visualiseClick() {
        let posTop = ((this.top - (this.spacing / 2)) * this.resize);
        let posLeft = ((this.left - this.spacing / 2) * this.resize);
        let posHeight = (this.spacing * this.resize);
        let posWidth = (this.spacing * this.resize);

        this.click.style.top = posTop + "px";
        this.click.style.left = posLeft + "px";
        this.click.style.width = posWidth + "px";
        this.click.style.height = posHeight + "px";

        if (this.style == "dummy") {
            this.click.style.cursor = "default";
        } else {
            this.click.style.cursor = "pointer";
        }
        this.click.style.zIndex = "2";
    }

    /**
     * Draw dot for container
     */
    visualiseDot() {
        let posTop = ((this.top - (this.dotSize / 2)) * this.resize);
        let posLeft = ((this.left - (this.dotSize / 2)) * this.resize);
        let posHeight = (this.dotSize * this.resize);
        let posWidth = (this.dotSize * this.resize);
        let styleBackground = "";
        let styleBorder = "";
        let styleOpacity = this.opacity;
        if (this.style != "half") {
            styleBackground = this.colour;
        } else {
            styleBorder = (this.dotSize / 4 * this.resize) + "px solid " + this.colour;
        }

        this.dot.style.top = posTop + "px";
        this.dot.style.left = posLeft + "px";
        this.dot.style.width = posWidth + "px";
        this.dot.style.height = posHeight + "px";
        this.dot.style.background = styleBackground;
        this.dot.style.border = styleBorder;
        this.dot.style.opacity = styleOpacity;

        if (this.style != "dummy") {
            if (this.messageCircles) {
                this.dot.style.borderRadius = posWidth + "px";
            } else {
                this.dot.style.borderRadius = "";
            }
        } else {
            this.dot.style.borderRadius = "";
            this.dot.style.MozBorderRadius = "";
        }
        this.dot.style.cursor = "default";
    }
}
