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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022 Alexander C. Hubmann-Haidvogel
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

const { Strings } = ChromeUtils.import("chrome://threadvis/content/utils/strings.jsm");
const { formatDate } = ChromeUtils.import("chrome://threadvis/content/utils/date.jsm");

class ContainerVisualisation {
    /**
     * Constructor for visualisation class
     * 
     * @constructor
     * @param {ThreadVis} threadvis - Main element
     * @param {DOMElement} document - The document this visualisation is drawn in
     * @param {DOMElement} stack - The stack on which to draw
     * @param {ThreadVis.Container} container - The container to visualise
     * @param {String} colour - The colour for the container
     * @param {String} colourHighlight - The colour for the highlighting
     * @param {Number} left - The left position
     * @param {Number} top - The top position
     * @param {Boolean} selected - True if the message is selected
     * @param {Number} dotSize - The size of the dot
     * @param {Number} resize - The resize parameter
     * @param {Boolean} circle - True to draw a circle
     * @param {Number} spacing - The spacing
     * @param {Number} opacity - The opacity
     * @param {Boolean} messageCircles - True to draw circle, false to draw square
     * @return {ThreadVis.ContainerVisualisation} - A new container visualisation
     */
    constructor(threadvis, document, stack, container, colour, colourHighlight, left, top, selected, dotSize, resize,
            circle, spacing, opacity, messageCircles) {
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
         * colour of highlight
         */
         this.colourHighlight = colourHighlight;

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

        this.drawCircle();
        if (!(this.selected && this.isCircle)) {
            this.hideCircle();
        } else {
            this.showCircle();
        }

        this.drawClick();

        this.createToolTip();
    };

    /**
     * Create tooltip for container containing information about container.
     * Just create stub menu
     */
    createToolTip() {
        const tooltip = this.document.createXULElement("tooltip");
        tooltip.setAttribute("orient", "vertical");
        tooltip.setAttribute("id", "ThreadVis_" + this.left);

        this.tooltip = tooltip;
        tooltip.addEventListener("popupshowing", () => this.getToolTip(), true);

        const popupset = this.document.getElementById("ThreadVisPopUpTooltips");
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
            const authorLabel = this.document.createXULElement("label");
            const authorText = this.document.createXULElement("label");
            const author = this.document.createXULElement("hbox");
            author.appendChild(authorLabel);
            author.appendChild(authorText);
            authorLabel.setAttribute("value", Strings.getString("tooltip.from"));
            authorLabel.style.fontWeight = "bold";
            authorText.setAttribute("value", this.container.getMessage().getFrom());

            const dateLabel = this.document.createXULElement("label");
            const dateText = this.document.createXULElement("label");
            const date = this.document.createXULElement("hbox");
            date.appendChild(dateLabel);
            date.appendChild(dateText);
            dateLabel.setAttribute("value", Strings.getString("tooltip.date"));
            dateLabel.style.fontWeight = "bold";
            dateText.setAttribute("value", formatDate(this.container.getMessage().getDate()));

            const subjectLabel = this.document.createXULElement("label");
            const subjectText = this.document.createXULElement("label");
            const subject = this.document.createXULElement("hbox");
            subject.appendChild(subjectLabel);
            subject.appendChild(subjectText);
            subjectLabel.setAttribute("value", Strings.getString("tooltip.subject"));
            subjectLabel.style.fontWeight = "bold";
            subjectText.setAttribute("value", this.container.getMessage().getSubject());

            const body = this.document.createXULElement("description");
            const bodyText = this.document.createTextNode(this.container.getMessage().getBody());
            body.appendChild(bodyText);

            this.tooltip.appendChild(author);
            this.tooltip.appendChild(date);
            this.tooltip.appendChild(subject);
            this.tooltip.appendChild(this.document.createXULElement("separator"));
            this.tooltip.appendChild(body);
        } else {
            // otherwise we display info about missing message
            const desc1 = this.document.createXULElement("description");
            const desc2 = this.document.createXULElement("description");
            desc1.setAttribute("value", Strings.getString("tooltip.missingmessage"));
            desc2.setAttribute("value", Strings.getString("tooltip.missingmessagedetail"));
            this.tooltip.appendChild(desc1);
            this.tooltip.appendChild(desc2);
        }
        this.tooltip.rendered = true;
    }

    /**
     * Draw circle around container if container is selected
     */
    drawCircle() {
        if (!this.circle) {
            this.circle = this.document.createXULElement("box");
            this.circle.style.position = "relative";
        }

        this.visualiseCircle();

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
        this.click.addEventListener("click", event => this.onMouseClick(event), true);

        // prevent mousedown event from bubbling to box object
        // prevent dragging of visualisation by clicking on message
        this.click.addEventListener("mousedown", event => event.stopPropagation(), true);
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
     * @param {DOMEvent} event - The mouse event
     */
    onMouseClick(event) {
        // only react to left mouse click
        if (event.button != 0) {
            return;
        }

        // check for double click
        let elem = this.threadvis;
        if (elem.isPopupVisualisation()) {
            elem = this.threadvis.window.opener.ThreadVis;
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
     * @param {Number} resize - The resize parameter
     * @param {Number} left - The left position
     * @param {Number} top - The top position
     * @param {Boolean} selected - True if container is selected
     * @param {String} colour - The colour
     * @param {Number} opacity - The opacity
     */
    redraw(resize, left, top, selected, colour, opacity) {
        this.resize = resize;
        this.left = left;
        this.top = top;
        this.selected = selected;
        this.colour = colour;
        this.opacity = opacity;

        this.redrawDot();
        this.redrawCircle();
        if (!(this.selected && this.isCircle)) {
            this.hideCircle();
        } else {
            this.showCircle();
        }

        this.redrawClick();
    }

    /**
     * Re-Draw circle around container if container is selected
     */
    redrawCircle() {
        this.visualiseCircle();
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
     */
    visualiseCircle() {
        const posTop = ((this.top - (this.dotSize / 2)) * this.resize);
        const posLeft = ((this.left - (this.dotSize / 2)) * this.resize);
        const posHeight = this.dotSize * this.resize;
        const posWidth = this.dotSize * this.resize;
        const shadowSpreadSize = this.dotSize * 1/6 * this.resize;
        const shadowBlurSize = this.dotSize * 1/3 * this.resize;

        this.circle.style.top = `${posTop}px`;
        this.circle.style.left = `${posLeft}px`;
        this.circle.style.width = `${posWidth}px`;
        this.circle.style.height = `${posHeight}px`;
        this.circle.style.boxShadow = `0px 0px ${shadowBlurSize}px ${shadowSpreadSize}px ${this.colourHighlight}`;
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
        const posTop = ((this.top - (this.spacing / 2)) * this.resize);
        const posLeft = ((this.left - this.spacing / 2) * this.resize);
        const posHeight = (this.spacing * this.resize);
        const posWidth = (this.spacing * this.resize);

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
        const posTop = ((this.top - (this.dotSize / 2)) * this.resize);
        const posLeft = ((this.left - (this.dotSize / 2)) * this.resize);
        const posHeight = (this.dotSize * this.resize);
        const posWidth = (this.dotSize * this.resize);
        let styleBackground = "";
        let styleBorder = "";
        const styleOpacity = this.opacity;
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