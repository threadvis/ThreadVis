/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011,
 *               2013 Alexander C. Hubmann-Haidvogel
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

var ThreadVis = (function(ThreadVis) {

    /**
     * Constructor for visualisation class
     * 
     * @constructor
     * @param {DOMElement} stack
     *              The stack on which to draw
     * @param {ThreadVis.Container} container
     *              The container to visualise
     * @param {String} colour
     *              The colour for the container
     * @param {Number} left
     *              The left position
     * @param {Number} top
     *              The top position
     * @param {Boolean} selected
     *              True if the message is selected
     * @param {Number} dotSize
     *              The size of the dot
     * @param {Number} resize
     *              The resize parameter
     * @param {Boolean} circle
     *              True to draw a circle
     * @param {Number} spacing
     *              The spacing
     * @param {Number} opacity
     *              The opacity
     * @param {Boolean} messageCircles
     *              True to draw circle, false to draw square
     * @return {ThreadVis.ContainerVisualisation} A new container visualisation
     * @type ThreadVis.ContainerVisualisation
     */
    ThreadVis.ContainerVisualisation = function(stack, container, colour, left,
            top, selected, dotSize, resize, circle, spacing, opacity,
            messageCircles) {

        this._stack = stack;
        this._container = container;
        this._colour = colour;
        this._left = left;
        this._top = top;
        this._selected = selected;
        this._dotSize = dotSize;
        this._resize = resize;
        this._isCircle = circle;
        this._spacing = spacing;
        this._opacity = opacity;
        this._messageCircles = messageCircles;

        // calculate style
        // full == received message
        // half == sent message
        // dummy == unknown message
        if (!this._container.isDummy()) {
            if (this._container.getMessage().isSent()) {
                this._style = "half";
            }
        } else {
            this._style = "dummy";
        }

        this._drawDot();

        this._drawCircle("black");
        if (!(this._selected && this._isCircle)) {
            this._hideCircle();
        } else {
            this._showCircle();
        }

        this._drawClick();

        this._createToolTip();
        this._createMenu();
    };

    /**
     * Prototype / instance methods
     */
    ThreadVis.ContainerVisualisation.prototype = {
        /**
         * XUL stack on which container gets drawn
         */
        _stack : null,

        /**
         * the container which gets visualised
         */
        _container : null,

        /**
         * colour of container
         */
        _colour : "",

        /**
         * left position of container in px
         */
        _left : 0,

        /**
         * top position of container in px
         */
        _top : 0,

        /**
         * is container selected (boolean)
         */
        _selected : false,

        /**
         * size of the dot to draw in px
         */
        _dotSize : 0,

        /**
         * resize multiplicator
         */
        _resize : 1,

        /**
         * should we draw a circle around the dot to mark it as selected
         * (boolean)
         */
        _isCircle : false,

        /**
         * the spacing between two messages in px
         */
        _spacing : 0,

        /**
         * the opacity of the item
         */
        _opacity : 1,

        /**
         * if true, draw circle, else draw square
         */
        _messageCircles : true,

        /**
         * DOM element to handle the context popup
         */
        _popup : null,

        _style : "full",

        /**
         * Create popup menu
         */
        _createMenu : function() {
            var menuname = "dot_popup_" + this._left;
            this._click.setAttribute("context", menuname);

            var popupset = document.getElementById("ThreadVisPopUpSet");
            var popup = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                    "popup");
            popup.setAttribute("id", menuname);

            this._popup = popup;

            var ref = this;
            popup.addEventListener("popupshowing", function() {
                ref._getMenu();
            }, true);

            popupset.appendChild(popup);
        },

        /**
         * Fill popup menu
         */
        _getMenu : function() {
            if (this._popup.rendered == true) {
                return;
            }

            // include normal menu items
            var defaultPopup = document.getElementById("ThreadVisPopUp");
            var items = defaultPopup.getElementsByTagName("menuitem");
            for (var i = 0; i < items.length; i++) {
                var item = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "menuitem");
                item.setAttribute("label", items[i].getAttribute("label"));
                item.setAttribute("oncommand", items[i]
                        .getAttribute("oncommand"));
                this._popup.appendChild(item);
            }

            this._popup.rendered = true;
        },

        /**
         * Create tooltip for container containing information about container.
         * Just create stub menu
         */
        _createToolTip : function() {
            var tooltip = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                    "tooltip");
            tooltip.setAttribute("orient", "vertical");
            tooltip.setAttribute("id", "ThreadVis_" + this._left);

            this._tooltip = tooltip;
            var ref = this;
            tooltip.addEventListener("popupshowing", function() {
                ref._getToolTip();
            }, true);

            var popupset = document.getElementById("ThreadVisPopUpSet");
            popupset.appendChild(tooltip);
        },

        /**
         * Fill tooltip for container containing information about container
         */
        _getToolTip : function() {
            if (this._tooltip.rendered == true) {
                return;
            }

            if (!this._container.isDummy()) {
                // if container container message, view details
                var authorLabel = document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "label");
                var authorText = document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "label");
                var author = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "hbox");
                author.appendChild(authorLabel);
                author.appendChild(authorText);
                authorLabel.setAttribute("value", ThreadVis.strings
                        .getString("tooltip.from"));
                authorLabel.style.fontWeight = "bold";
                authorText.setAttribute("value", this._container.getMessage()
                        .getFrom());

                var dateLabel = document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "label");
                var dateText = document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "label");
                var date = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "hbox");
                date.appendChild(dateLabel);
                date.appendChild(dateText);
                dateLabel.setAttribute("value", ThreadVis.strings
                        .getString("tooltip.date"));
                dateLabel.style.fontWeight = "bold";
                dateText.setAttribute("value", ThreadVis.Util
                        .formatDate(this._container.getMessage().getDate()));

                var subjectLabel = document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "label");
                var subjectText = document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "label");
                var subject = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "hbox");
                subject.appendChild(subjectLabel);
                subject.appendChild(subjectText);
                subjectLabel.setAttribute("value", ThreadVis.strings
                        .getString("tooltip.subject"));
                subjectLabel.style.fontWeight = "bold";
                subjectText.setAttribute("value", this._container.getMessage()
                        .getSubject());

                var body = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "description");
                var bodyText = document.createTextNode(this._container
                        .getMessage().getBody());
                body.appendChild(bodyText);

                this._tooltip.appendChild(author);
                this._tooltip.appendChild(date);
                this._tooltip.appendChild(subject);
                this._tooltip.appendChild(document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "separator"));
                this._tooltip.appendChild(body);
            } else {
                // otherwise we display info about missing message
                var desc1 = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "description");
                var desc2 = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "description");
                desc1.setAttribute("value", ThreadVis.strings
                        .getString("tooltip.missingmessage"));
                desc2.setAttribute("value", ThreadVis.strings
                        .getString("tooltip.missingmessagedetail"));
                this._tooltip.appendChild(desc1);
                this._tooltip.appendChild(desc2);
            }
            this._tooltip.rendered = true;
        },

        /**
         * Draw circle around container if container is selected
         * 
         * @param {String}
         *            colour The colour of the message
         */
        _drawCircle : function(colour) {
            if (!this._circle) {
                this._circle = document.createElementNS(
                        ThreadVis.XUL_NAMESPACE, "box");
            }

            this._visualiseCircle(colour);

            this._stack.appendChild(this._circle);
        },

        /**
         * Draw container around dot to catch click events and show tooltip
         */
        _drawClick : function() {
            if (!this._click) {
                this._click = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "box");
            }

            this._visualiseClick();

            this._click.container = this._container;
            this._click.setAttribute("tooltip", "ThreadVis_" + this._left);

            this._stack.appendChild(this._click);
            var ref = this;
            this._click.addEventListener("click", function(event) {
                ref._onMouseClick(event);
            }, true);

            // prevent mousedown event from bubbling to box object
            // prevent dragging of visualisation by clicking on message
            this._click.addEventListener("mousedown", function(event) {
                event.stopPropagation();
            }, true);
        },

        /**
         * Draw dot for container
         */
        _drawDot : function() {
            this._dot = document
                    .createElementNS(ThreadVis.XUL_NAMESPACE, "box");

            this._visualiseDot();

            this._stack.appendChild(this._dot);
        },

        /**
         * Hide circle
         */
        _hideCircle : function() {
            this._circle.hidden = true;
        },

        /**
         * Mouse click event handler Display message user clicked on
         * 
         * @param {DOMEvent}
         *            event The mouse event
         */
        _onMouseClick : function(event) {
            // only react to left mouse click
            if (event.button != 0) {
                return;
            }

            // check for double click
            var elem = ThreadVis;
            if (elem.isPopupVisualisation()) {
                elem = window.opener.ThreadVis;
            }
            if (event.detail > 1) {
                elem.openNewMessage(this._container.getMessage().getMsgDbHdr());
            } else {
                if (!this._container.isDummy()) {
                    // check to see if this visualisation is in the popup window
                    // if so, call functions in opener
                    elem.callback(this._container.getMessage());
                }
            }
        },

        /**
         * Re-Draw all elements
         * 
         * @param {Number}
         *            resize The resize parameter
         * @param {Number}
         *            left The left position
         * @param {Number}
         *            top The top position
         * @param {Boolean}
         *            selected True if container is selected
         * @param {String}
         *            colour The colour
         * @param {Number}
         *            opacity The opacity
         */
        redraw : function(resize, left, top, selected, colour, opacity) {
            this._resize = resize;
            this._left = left;
            this._top = top;
            this._selected = selected;
            this._colour = colour;
            this._opacity = opacity;

            this._redrawDot();
            this._redrawCircle("black");
            if (!(this._selected && this._isCircle)) {
                this._hideCircle();
            } else {
                this._showCircle();
            }

            this._redrawClick();
        },

        /**
         * Re-Draw circle around container if container is selected
         * 
         * @param {String}
         *            colour The colour
         */
        _redrawCircle : function(colour) {
            this._visualiseCircle(colour);
        },

        /**
         * Re-Draw container around dot to catch click events and show tooltip
         */
        _redrawClick : function() {
            this._visualiseClick();
        },

        /**
         * Re-Draw dot for container
         */
        _redrawDot : function() {
            this._visualiseDot();
        },

        /**
         * Show circle
         */
        _showCircle : function() {
            this._circle.hidden = false;
        },

        /**
         * Visualise circle around container if container is selected
         * 
         * @param {String}
         *            colour The colour
         */
        _visualiseCircle : function(colour) {
            var posTop = ((this._top - (this._dotSize * 4 / 6)) * this._resize);
            var posLeft = ((this._left - (this._dotSize * 4 / 6)) * this._resize);
            var posHeight = (this._dotSize * 8 / 6 * this._resize);
            var posWidth = (this._dotSize * 8 / 6 * this._resize);
            var styleBorder = styleBorder = (this._dotSize / 6 * this._resize)
                    + "px solid " + colour;

            this._circle.top = posTop + "px";
            this._circle.left = posLeft + "px";
            this._circle.width = posWidth + "px";
            this._circle.height = posHeight + "px";
            this._circle.style.border = styleBorder;
            if (this._messageCircles) {
                // Thunderbird 5 uses CSS3
                this._circle.style.borderRadius = posWidth + "px";
                // Thunderbird 3 uses custom -moz* CSS
                this._circle.style.MozBorderRadius = posWidth + "px";
            } else {
                this._circle.style.borderRadius = "";
                this._circle.style.MozBorderRadius = "";
            }
        },

        /**
         * Visualise container around dot to catch click events and show tooltip
         */
        _visualiseClick : function() {
            var posTop = ((this._top - (this._spacing / 2)) * this._resize);
            var posLeft = ((this._left - this._spacing / 2) * this._resize);
            var posHeight = (this._spacing * this._resize);
            var posWidth = (this._spacing * this._resize);

            this._click.top = posTop + "px";
            this._click.left = posLeft + "px";
            this._click.width = posWidth + "px";
            this._click.height = posHeight + "px";

            if (this._style == "dummy") {
                this._click.style.cursor = "default";
            } else {
                this._click.style.cursor = "pointer";
            }
            this._click.style.zIndex = "2";
        },

        /**
         * Draw dot for container
         */
        _visualiseDot : function() {
            var posTop = ((this._top - (this._dotSize / 2)) * this._resize);
            var posLeft = ((this._left - (this._dotSize / 2)) * this._resize);
            var posHeight = (this._dotSize * this._resize);
            var posWidth = (this._dotSize * this._resize);
            var styleBackground = "";
            var styleBorder = "";
            var styleOpacity = this._opacity;
            if (this._style != "half") {
                styleBackground = this._colour;
            } else {
                styleBorder = (this._dotSize / 4 * this._resize) + "px solid "
                        + this._colour;
            }

            this._dot.top = posTop + "px";
            this._dot.left = posLeft + "px";
            this._dot.width = posWidth + "px";
            this._dot.height = posHeight + "px";
            this._dot.style.background = styleBackground;
            this._dot.style.border = styleBorder;
            this._dot.style.opacity = styleOpacity;

            if (this._style != "dummy") {
                if (this._messageCircles) {
                    // Thunderbird 5 uses CSS3
                    this._dot.style.borderRadius = posWidth + "px";
                    // Thunderbird 3 uses custom -moz* CSS
                    this._dot.style.MozBorderRadius = posWidth + "px";
                } else {
                    this._dot.style.borderRadius = "";
                    this._dot.style.MozBorderRadius = "";
                }
            } else {
                this._dot.style.borderRadius = "";
                this._dot.style.MozBorderRadius = "";
            }
            this._dot.style.cursor = "default";
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
