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
 * Copyright (C) 2007, 2008, 2009, 2010 Alexander C. Hubmann-Haidvogel
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
 * JavaScript file to visualise message relationships (threads).
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /***************************************************************************
     * Constructor for visualisation class
     * 
     * @return New visualisation object
     **************************************************************************/
    ThreadVis.Visualisation = function() {
        this.COLOUR_DUMMY = "#75756D";
        this.COLOUR_SINGLE = "#0000FF";

        this.box = null;
        this.stack = null;
        // set default resize parameter
        this.resize = 1;
        this.zoom = 1;

        this.authors = null;
        this.containers = null;
        this.containerVisualisations = null;
        this.arcVisualisations = null;
        this.timeline = null;
        this.scrollbar = null;
        this.changed = false;

        this.disabled = false;

        // force display of too many messages
        this.force = false;

        this.outerBox = document.getElementById("ThreadVis");
        this.box = document.getElementById("ThreadVisBox");
        this.verticalScrollbarBox = document
                .getElementById("ThreadVisVerticalScrollbar");
        this.horizontalScrollbarBox = document
                .getElementById("ThreadVisHorizontalScrollbar");
        this.buttonsBox = document.getElementById("ThreadVisButtons");
        this.stack = document.getElementById("ThreadVisStack");
        this.popups = document.getElementById("ThreadVisPopUpSet");
        this.expandedHeaders = document.getElementById("expandedHeaders");
    }

    /***************************************************************************
     * Calculate heights for all arcs. Set information in containers.
     * 
     * @param containers
     *            The array of all containers that are visualised
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.calculateArcHeights = function(containers) {
        // reset all heights
        for ( var counter = 0; counter < containers.length; counter++) {
            var thisContainer = containers[counter];
            thisContainer.currentArcHeightIncoming = new Array();
            thisContainer.currentArcHeightOutgoing = new Array();
        }

        for ( var counter = 0; counter < containers.length; counter++) {
            var thisContainer = containers[counter];
            thisContainer.xIndex = counter;

            // odd_ tells us if we display the arc above or below the messages
            thisContainer.odd = thisContainer.getDepth() % 2 == 0;

            var parent = thisContainer.getParent();
            if (parent != null && !parent.isRoot()) {
                // find a free arc height between the parent message and this
                // one
                // since we want to draw an arc between this message and its
                // parent,
                // and we do not want any arcs to overlap
                var freeHeight = 1;
                var blocked = true;
                while (blocked) {
                    blocked = false;
                    for ( var innerCounter = parent.xIndex; innerCounter < counter; innerCounter++) {
                        var lookAtContainer = containers[innerCounter];

                        if (lookAtContainer.odd == parent.odd
                                && lookAtContainer.currentArcHeightOutgoing[freeHeight] == 1) {
                            freeHeight++;
                            blocked = true;
                            break;
                        }
                        if (lookAtContainer.odd != parent.odd
                                && lookAtContainer.currentArcHeightIncoming[freeHeight] == 1) {
                            freeHeight++;
                            blocked = true;
                            break;
                        }
                    }
                }
                parent.currentArcHeightOutgoing[freeHeight] = 1;
                thisContainer.currentArcHeightIncoming[freeHeight] = 1;

                thisContainer.arcHeight = freeHeight;
            }
        }
    }

    /***************************************************************************
     * Calculate size
     * 
     * @param containers
     *            The array of all containers that are visualised
     * @return object.containers All containers object.totalMaxHeight The
     *         maximum total height of the visualisation
     *         object.minimalTimeDifference The minimal time difference between
     *         two messages object.topHeight The height of the visualisation
     *         above the message nodes object.bottomHeight The height of the
     *         visualisation below the message nodes
     **************************************************************************/
    ThreadVis.Visualisation.prototype.calculateSize = function(containers) {
        // totalmaxheight counts the maximal number of stacked arcs
        var totalMaxHeight = 0;

        // topheight counts the maximal number of stacked arcs on top
        var topHeight = 0;

        // bottomheight counts the maximal number of stacked arcs on bottom
        var bottomHeight = 0;

        // minmaltimedifference stores the minimal time between two messages
        var minimalTimeDifference = Number.MAX_VALUE;

        this.calculateArcHeights(containers);

        for ( var counter = 0; counter < containers.length; counter++) {
            var thisContainer = containers[counter];

            // odd_ tells us if we display the arc above or below the messages
            thisContainer.odd = thisContainer.getDepth() % 2 == 0;

            var parent = thisContainer.getParent();
            if (parent != null && !parent.isRoot()) {
                // also keep track of the current maximal stacked arc height,
                // so that we can resize the whole extension
                if (parent.odd && thisContainer.arcHeight > topHeight) {
                    topHeight = thisContainer.arcHeight;
                }

                if (!parent.odd && thisContainer.arcHeight > bottomHeight)
                    bottomHeight = thisContainer.arcHeight;
            }

            // also keep track of the time difference between two adjacent
            // messages
            if (counter < containers.length - 1) {
                var timeDifference = containers[counter + 1].getDate()
                        .getTime()
                        - containers[counter].getDate().getTime();
                // timedifference_ stores the time difference to the _next_
                // message
                thisContainer.timeDifference = timeDifference;

                // since we could have dummy containers that have the same time
                // as
                // the next message, skip any time difference of 0
                if (timeDifference < minimalTimeDifference
                        && timeDifference != 0) {
                    minimalTimeDifference = timeDifference;
                }
            }
        }

        totalMaxHeight = Math.max(topHeight, bottomHeight);

        return {
            "containers" : containers,
            "totalMaxHeight" : totalMaxHeight,
            "minimalTimeDifference" : minimalTimeDifference,
            "topHeight" : topHeight,
            "bottomHeight" : bottomHeight
        };
    }

    /***************************************************************************
     * Check size of stack If resized, resize visualisation
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.checkSize = function() {
        if (this.disabled) {
            return;
        }

        if (this.box.boxObject.height != this.boxHeight
                || this.box.boxObject.width != this.boxWidth) {
            this.resetStack();
            this.visualise();
        }

        this.boxHeight = this.box.boxObject.height;
        this.boxWidth = this.box.boxObject.width;
    }

    /***************************************************************************
     * Clear stack. Delete all children
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.clearStack = function() {
        if (this.outerBox != null) {
            this.outerBox.hidden = false;
        }
        if (this.stack != null) {
            while (this.stack.firstChild != null) {
                this.stack.removeChild(this.stack.firstChild);
            }
            // reset move
            this.stack.style.marginLeft = "0px";
            this.stack.style.marginTop = "0px";
            this.stack.style.padding = "5px";

        }

        if (this.popups != null) {
            // also delete all popupset menus
            while (this.popups.firstChild != null) {
                this.popups.removeChild(this.popups.firstChild);
            }
        }

        if (!ThreadVis.isPopupVisualisation()) {
            this.setVariableSize();
            this.setFixedSize();
        }
    }

    /***************************************************************************
     * Underline authors in header view
     * 
     * @param authors
     *            A hashmap (i.e. object) linking author email address to colour
     *            value
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.colourAuthors = function(authors) {
        var prefHighlight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_HIGHLIGHT);

        // colour links
        var emailFields = new Array();

        // check to see if we have the element expandedHeaderView
        if (document.getElementById("expandedHeaderView") == null) {
            // check for parent window
            if (ThreadVis.threadvisParent) {
                ThreadVis.threadvisParent.visualisation.colourAuthors(authors);
            }
            return;
        }

        // from, reply-to, ... (single value fields)
        var singleFields = document.getElementById("expandedHeaderView")
                .getElementsByTagName("mail-emailheaderfield");
        for ( var i = 0; i < singleFields.length; i++) {
            if (singleFields[i].emailAddressNode.attributes["emailAddress"]) {
                emailFields.push(singleFields[i].emailAddressNode);
            }
        }

        // to, cc, bcc, ... (multi value fields)
        var multiFields = document.getElementById("expandedHeaderView")
                .getElementsByTagName("mail-multi-emailHeaderField");
        for ( var i = 0; i < multiFields.length; i++) {
            // get "normal" header fields (i.e. non expanded cc and to)
            var multiField = multiFields[i].emailAddresses.childNodes;
            for ( var j = 0; j < multiField.length; j++) {
                if (multiField[j].attributes["emailAddress"])
                    emailFields.push(multiField[j]);
            }

            // get "expanded" header fields
            multiField = multiFields[i].longEmailAddresses.childNodes;
            for ( var j = 0; j < multiField.length; j++) {
                if (multiField[j].attributes["emailAddress"]) {
                    emailFields.push(multiField[j]);
                }
            }
        }

        var emailField = null;
        while (emailField = emailFields.pop()) {
            var author = authors[emailField.attributes["emailAddress"].value];
            var hsv = null;
            if (author) {
                hsv = author.hsv;
            }

            if (hsv && prefHighlight) {
                emailField.style.borderBottom = "2px solid "
                        + this.getColour(hsv.hue, 100, hsv.value);
            } else {
                emailField.style.borderBottom = "";
            }
        }
    }

    /***************************************************************************
     * Build legend popup containing all authors of current thread
     * 
     * @param authors
     *            A hashmap (i.e. object) linking author email addresses to
     *            colour, name and message count
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.createLegend = function(authors) {
        this.legend = document.createElementNS(ThreadVis.XUL_NAMESPACE, "vbox");

        for ( var email in authors) {
            var hsv = authors[email].hsv;
            var name = authors[email].name;
            var count = authors[email].count;
            this.legend.appendChild(this.createLegendBox(hsv, name, count));
        }
    }

    /***************************************************************************
     * Build one row for legend
     * 
     * @param hsv
     *            The colour in HSV colour model
     * @param name
     *            The name of the author
     * @param count
     *            The message count for the author
     **************************************************************************/
    ThreadVis.Visualisation.prototype.createLegendBox = function(hsv, name,
            count) {
        var box = document.createElementNS(ThreadVis.XUL_NAMESPACE, "hbox");

        var colourBox = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                "hbox");
        colourBox.style.background = this.getColour(hsv.hue, 100, hsv.value);
        colourBox.style.width = "20px";
        box.appendChild(colourBox);

        var nameBox = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                "description");
        var nameText = document.createTextNode(name + " (" + count + ")");
        nameBox.appendChild(nameText)

        box.appendChild(nameBox);

        return box;
    }

    /***************************************************************************
     * Create stack
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.createStack = function() {
        var ref = this;
        if (!this.stack) {
            this.stack = null;
            if (this.stack == null) {
                this.stack = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                        "stack");
                this.stack.setAttribute("id", "ThreadVisStack");
                this.stack.style.position = "relative";
                this.box.appendChild(this.stack);
            }
            document.addEventListener("mousemove", function(event) {
                ref.onMouseMove(event);
            }, false);
            this.box.addEventListener("mousedown", function(event) {
                ref.onMouseDown(event);
            }, false);
            document.addEventListener("mouseup", function(event) {
                ref.onMouseUp(event);
            }, false);
            this.box.addEventListener("DOMMouseScroll", function(event) {
                ref.onScroll(event);
            }, false);
        } else {
            this.clearStack();
        }

        var loading = document.createElementNS(ThreadVis.XUL_NAMESPACE,
                "description");
        loading.setAttribute("value", ThreadVis.strings
                .getString("visualisation.loading"));
        loading.style.position = "relative";
        loading.style.top = "20px"
        loading.style.left = "20px"
        loading.style.color = "#999999";
        this.stack.appendChild(loading);
    }

    /***************************************************************************
     * Display disabled message
     * 
     * @param forceHide
     *            Force hiding of visualisation, even if preference is not set
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.displayDisabled = function(forceHide) {
        this.clearStack();
        this.currentContainer = null;

        // if preference set, hide box completely
        if (forceHide
                || ThreadVis.Preferences
                        .getPreference(ThreadVis.Preferences.PREF_VIS_HIDE_ON_DISABLE)) {
            this.outerBox.hidden = true;
            return;
        }

        var warning = document
                .createElementNS(ThreadVis.XUL_NAMESPACE, "label");
        warning.setAttribute("value", ThreadVis.strings
                .getString("visualisation.disabledWarning"));
        warning.style.position = "relative";
        warning.style.top = "10px"
        warning.style.left = "20px"
        warning.style.color = "#999999";
        this.stack.appendChild(warning);

        var link = document.createElementNS(ThreadVis.XUL_NAMESPACE, "label");
        link.setAttribute("value", ThreadVis.strings
                .getString("visualisation.disabledWarningLink"));
        link.style.position = "relative";
        link.style.top = "30px"
        link.style.left = "20px"
        link.style.color = "#0000ff";
        link.style.textDecoration = "underline";
        link.addEventListener("click", function() {
            ThreadVis.openThreadVisOptionsDialog();
        }, true);
        link.style.cursor = "pointer";
        this.stack.appendChild(link);

        // set cursor
        this.box.style.cursor = "";

        this.disabled = true;
        this.changed = true;
        this.colourAuthors(new Array());
    }

    /***************************************************************************
     * Display warning (too many messages)
     * 
     * @param container
     *            The container which has too many children
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.displayWarningCount = function(container) {
        this.clearStack();

        var warning = document
                .createElementNS(ThreadVis.XUL_NAMESPACE, "label");
        warning
                .setAttribute("value", ThreadVis.strings
                        .getString("visualisation.warningCount")
                        + " ["
                        + container.getTopContainer().getCountRecursive()
                        + "].");
        warning.style.position = "relative";
        warning.style.top = "10px"
        warning.style.left = "20px"
        warning.style.color = "#999999";
        this.stack.appendChild(warning);

        var link = document.createElementNS(ThreadVis.XUL_NAMESPACE, "label");
        link.setAttribute("value", ThreadVis.strings
                .getString("visualisation.warningCountLink"));
        link.style.position = "relative";
        link.style.top = "30px"
        link.style.left = "20px"
        link.style.color = "#0000ff";
        link.style.textDecoration = "underline";
        var ref = this;
        link.addEventListener("click", function() {
            ref.visualise(container, true);
        }, true);
        link.style.cursor = "pointer";
        this.stack.appendChild(link);

        // set cursor
        this.box.style.cursor = "";
    }

    /***************************************************************************
     * Draw arc
     * 
     * @param colour
     *            The colour of the arc
     * @param vPosition
     *            The vertical position of the arc (top or bottom)
     * @param height
     *            The height of the arc
     * @param left
     *            The left position of the arc
     * @param right
     *            The right position of the arc
     * @param top
     *            The top position of the arc
     * @param opacity
     *            The opacity of the arc
     * @return The arc object
     **************************************************************************/
    ThreadVis.Visualisation.prototype.drawArc = function(colour, vPosition,
            height, left, right, top, opacity) {
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var prefArcMinHeight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT);
        var prefArcDifference = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE);
        var prefArcRadius = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_RADIUS);
        var prefArcWidth = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_WIDTH);

        var arc = new ThreadVis.ArcVisualisation(this.stack, prefDotSize,
                this.resize, prefArcMinHeight, prefArcDifference,
                prefArcRadius, prefArcWidth, colour, vPosition, height, left,
                right, top, opacity);

        return arc;
    }

    /***************************************************************************
     * Export an arc to SVG
     * 
     * @param colour
     *            The colour of the arc
     * @param vPosition
     *            The vertical position of the arc (top or bottom)
     * @param height
     *            The height of the arc
     * @param left
     *            The left position of the arc
     * @param right
     *            The right position of the arc
     * @param top
     *            The top position of the arc
     * @param opacity
     *            The opacity of the arc
     * @return The arc SVG string
     **************************************************************************/
    ThreadVis.Visualisation.prototype.drawArcSVG = function(colour, vPosition,
            height, left, right, top, opacity, resize, counter) {
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var prefArcMinHeight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT);
        var prefArcDifference = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE);
        var prefArcRadius = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_RADIUS);
        var prefArcWidth = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_WIDTH);

        var height = ((prefArcMinHeight + prefArcDifference * height) - prefArcWidth)
                * resize;
        var startX = left * resize;
        var startY = 0;
        var width = ((right - left) * resize);
        var radiusY = height;
        var radiusX = Math.min(height, width / 2);
        width = width - 2 * radiusX;
        var cornerStart = radiusY;
        var cornerEnd = radiusY;
        var sweep = 1;

        if (vPosition == "top") {
            var cornerStart = -cornerStart;
            startY = (top - (prefDotSize / 2)) * resize;
        } else {
            var cornerEnd = -cornerEnd;
            startY = (top + (prefDotSize / 2)) * resize;
            sweep = 0;
        }

        var path = "M" + startX + "," + startY + " a" + radiusX + "," + radiusY
                + " 0 0," + sweep + " " + radiusX + "," + cornerStart + " h "
                + width + " a" + radiusX + "," + radiusY + " 0 0," + sweep
                + " " + radiusX + "," + cornerEnd;

        return "<path id='p_" + counter + "'" + " d='" + path + "'"
                + " fill='none'" + " stroke='" + colour + "'"
                + " stroke-width='" + (prefArcWidth * resize) + "' />";
    }

    /***************************************************************************
     * Draw a dot
     * 
     * @param container
     *            The container that is drawn
     * @param colour
     *            The colour of the dot
     * @param left
     *            The left position of the dot
     * @param top
     *            The top position of the dot
     * @param selected
     *            True if the container is selected
     * @param circle
     *            True to draw a circle around the dot
     * @param opacity
     *            The opacity of the dot
     * @return The dot object
     **************************************************************************/
    ThreadVis.Visualisation.prototype.drawDot = function(container, colour,
            left, top, selected, circle, opacity) {
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);
        var prefMessageCircles = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_MESSAGE_CIRCLES);

        var msg = new ThreadVis.ContainerVisualisation(this.stack, container,
                colour, left, top, selected, prefDotSize, this.resize, circle,
                prefSpacing, opacity, prefMessageCircles);

        return msg;
    }

    /***************************************************************************
     * Export a dot to SVG
     * 
     * @param container
     *            The container that is drawn
     * @param colour
     *            The colour of the dot
     * @param left
     *            The left position of the dot
     * @param top
     *            The top position of the dot
     * @param selected
     *            True if the container is selected
     * @param circle
     *            True to draw a circle around the dot
     * @param opacity
     *            The opacity of the dot
     * @param counter
     *            A running counter to id the dot
     * @return The dot SVG string
     **************************************************************************/
    ThreadVis.Visualisation.prototype.drawDotSVG = function(container, colour,
            left, top, selected, circle, opacity, resize, counter) {
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);
        var prefMessageCircles = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_MESSAGE_CIRCLES);

        var style = "full";
        if (!container.isDummy()) {
            if (container.getMessage().isSent()) {
                style = "half";
            }
        } else {
            style = "dummy";
        }

        var svg = "<circle id='c_"
                + counter
                + "'"
                + " onmouseover='toggle(evt,this);' onmouseout='toggle(evt,this);'"
                + " cx='" + (left * resize) + "'" + " cy='" + (top * resize)
                + "'" + " r='" + (prefDotSize * resize * 0.5) + "'";

        if (style != "half") {
            svg += " fill='" + colour + "'";
        } else {
            svg += " stroke='" + colour + "'" + " stroke-width='"
                    + (prefDotSize / 4 * resize) + "'" + " fill='none'";
        }
        svg += " />"

        return svg;
    }

    /***************************************************************************
     * Get the size of the available viewbox
     * 
     * @return object.height The height of the box object.width The width of the
     *         box
     **************************************************************************/
    ThreadVis.Visualisation.prototype.getBoxSize = function() {
        return {
            height : this.box.boxObject.height,
            width : this.box.boxObject.width
        };
    }

    /***************************************************************************
     * Get a colour for the arc
     * 
     * @param hue
     *            The colour hue
     * @param saturation
     *            The colour saturation
     * @param value
     *            The colour value
     * @return A colour string in the form "#11AACC"
     **************************************************************************/
    ThreadVis.Visualisation.prototype.getColour = function(hue, saturation,
            value) {
        var rgb = ThreadVis.Util.convertHSVtoRGB(hue, saturation, value);

        return "#" + ThreadVis.Util.DECtoHEX(Math.floor(rgb.r))
                + ThreadVis.Util.DECtoHEX(Math.floor(rgb.g))
                + ThreadVis.Util.DECtoHEX(Math.floor(rgb.b));
    }

    /***************************************************************************
     * Get a new colour for the arc. Choose the next available colour
     * 
     * @param sent
     *            True if the message was sent
     * @return The next available colour in HSV colour model
     **************************************************************************/
    ThreadVis.Visualisation.prototype.getNewColour = function(sent) {
        // display sent emails always in the same colour
        if (sent) {
            var hex = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_VIS_COLOURS_SENT);
        } else {
            var receivedColours = ThreadVis.Preferences.getPreference(
                    ThreadVis.Preferences.PREF_VIS_COLOURS_RECEIVED).split(",");

            this.lastColour = (this.lastColour + 1) % receivedColours.length;
            var hex = receivedColours[this.lastColour];
        }
        var hex = hex.substr(1);
        return ThreadVis.Util.convertRGBtoHSV(ThreadVis.Util.HEXtoDEC(hex
                .substr(0, 2)), ThreadVis.Util.HEXtoDEC(hex.substr(2, 2)),
                ThreadVis.Util.HEXtoDEC(hex.substr(4, 2)));
    }

    /***************************************************************************
     * Get resize multiplicator Calculate from box width and height and needed
     * width and height
     * 
     * @param xCount
     *            Number of messages
     * @param yCount
     *            Number of stacked arcs
     * @param sizeX
     *            Available horizontal size
     * @param sizeY
     *            Available vertical size
     * @return The resize value (smaller than 1)
     **************************************************************************/
    ThreadVis.Visualisation.prototype.getResize = function(xCount, yCount,
            sizeX, sizeY) {
        var prefArcDifference = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE);
        var prefArcMinHeight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT);
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);

        var spacePerArcAvailableX = sizeX / xCount;
        var spacePerArcAvailableY = sizeY / 2;
        var spacePerArcNeededX = prefSpacing;
        var spacePerArcNeededY = (prefDotSize / 2) + prefArcMinHeight
                + (yCount + 1) * prefArcDifference;

        var resizeX = (spacePerArcAvailableX / spacePerArcNeededX);
        var resizeY = (spacePerArcAvailableY / spacePerArcNeededY);

        var resize = 1;
        if (resizeX < resizeY) {
            resize = resizeX;
        } else {
            resize = resizeY;
        }

        if (resize > 1) {
            resize = 1;
        }

        return resize;
    }

    /***************************************************************************
     * Move visualisation to show current message
     * 
     * @param container
     *            The container that should be included in the viewport
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.moveVisualisation = function(container) {
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);

        // get current left margin
        var oldMargin = parseFloat(this.stack.style.marginLeft);
        var newMargin = oldMargin;

        var originalWidth = this.box.boxObject.width;
        var originalHeight = this.box.boxObject.height;
        var height = originalHeight * this.zoom;// * prefDefaultZoomHeight;

        if (container.xPosition * this.resize + oldMargin > originalWidth) {
            // calculate necessary margin
            newMargin = -(container.xPosition * this.resize - originalWidth)
                    - (prefSpacing * this.resize);

            // if we already see the selected message, don't move any further
            if (newMargin > oldMargin) {
                newMargin = oldMargin;
            }
        }
        if (container.xPosition * this.resize + oldMargin < (prefSpacing / 2)
                * this.resize) {
            // calculate necessary margin
            newMargin = (-container.xPosition + (prefSpacing / 2))
                    * this.resize;
        }

        this.moveVisualisationTo( {
            x : newMargin
        });
    }

    /***************************************************************************
     * Move visualisation by given delta
     * 
     * @param position
     *            The position to move the visualisation by position.x: the
     *            x-position position.y: the y-position
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.moveVisualisationTo = function(position) {
        if (typeof (position.x) != "undefined") {
            this.stack.style.marginLeft = position.x + "px";
        }
        if (typeof (position.y) != "undefined") {
            this.stack.style.marginTop = position.y + "px";
        }
    }

    /***************************************************************************
     * Mouse click event handler Display message user clicked on
     * 
     * @param event
     *            The mouse event that fired
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.onMouseClick = function(event) {
        var container = event.target.container;
        if (container && !container.isDummy()) {
            ThreadVis.callback(container.getMessage().getKey(), container
                    .getMessage().getFolder());
        }
    }

    /***************************************************************************
     * OnMouseDown event handler On left mouse button down, remember mouse
     * position and enable panning
     * 
     * @param event
     *            The mouse event that fired
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.onMouseDown = function(event) {
        // only pan on left click
        if (event.button != 0) {
            return;
        }

        // only pan if visualisation is larger than viewport
        if (this.scrollbar != null && !this.scrollbar.isShown()) {
            return;
        }

        // remember box size now
        this.boxWidth = this.box.boxObject.width;
        this.boxHeight = this.box.boxObject.height;
        this.stackWidth = this.stack.boxObject.width;
        this.stackHeight = this.stack.boxObject.height;

        this.startX = event.clientX;
        this.startY = event.clientY;
        this.panning = true;

        // set mouse cursor
        this.setCursor();
    }

    /***************************************************************************
     * OnMouseMove event handler If panning is enabled, read new mouse position
     * and move box accordingly
     * 
     * @param event
     *            The mouse event that fired
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.onMouseMove = function(event) {
        if (this.panning) {
            var x = event.clientX;
            var y = event.clientY;
            var dx = x - this.startX;
            var dy = y - this.startY;
            var currentX = parseFloat(this.stack.style.marginLeft);
            var currentY = parseFloat(this.stack.style.marginTop);

            if (currentX == "") {
                currentX = 0;
            }
            if (currentY == "") {
                currentY = 0;
            }
            dx = parseFloat(currentX) + parseFloat(dx);
            dy = parseFloat(currentY) + parseFloat(dy);
            this.startX = x;
            this.startY = y;

            // set mininum dx to a little less than available to prevent
            // overpanning
            var minDx = Math.min(this.boxWidth - this.stackWidth + 4, 0);
            var minDy = Math.min(this.boxHeight - this.stackHeight, 0);

            // don't move more to the right than necessary
            if (dx > 0) {
                dx = 0;
            }

            // don't move more to the left than necessary
            if (dx < minDx) {
                dx = minDx;
            }

            // don't move more to the bottom than necessary
            if (dy > 0) {
                dy = 0;
            }

            // don't move more to the top than necessary
            if (dy < minDy) {
                dy = minDy;
            }

            var position = new Object;
            if (this.scrollbar.isShownHorizontal()) {
                position.x = dx;
            }
            if (this.scrollbar.isShownVertical()) {
                position.y = dy;
            }

            this.moveVisualisationTo(position);

            // this.scrollbar.init(this.box);
            this.scrollbar.draw();
        }
    }

    /***************************************************************************
     * OnMouseUp event handler Disable panning when mouse button is released
     * 
     * @param event
     *            The mouse event that fired
     **************************************************************************/
    ThreadVis.Visualisation.prototype.onMouseUp = function(event) {
        this.panning = false;

        // reset mouse cursor
        this.setCursor();
    }

    /***************************************************************************
     * OnScroll event handler If mouse wheel is moved, zoom in and out of
     * visualisation
     * 
     * @param event
     *            The mouse event that fired
     **************************************************************************/
    ThreadVis.Visualisation.prototype.onScroll = function(event) {
        // event.detail gives number of lines to scroll
        // positive number means scroll down
        if (event.detail < 0) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
    }

    /***************************************************************************
     * Reset stack Set all margins to zero
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.resetStack = function() {
        this.stack.style.marginLeft = "0px";
        this.stack.style.marginTop = "0px";
    }

    /***************************************************************************
     * Set the cursor
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.setCursor = function() {
        // set cursor to dragging if currently panning
        if (this.panning) {
            this.box.style.cursor = "-moz-grabbing";
        }
        // set cursor if visualisation is draggable
        else if (this.scrollbar != null && this.scrollbar.isShown()) {
            this.box.style.cursor = "-moz-grab";
        } else {
            this.box.style.cursor = "";
        }
    }

    /***************************************************************************
     * Set the outer box to a fixed size. if x or y is given, the size is set to
     * that size. otherwise the current size is set as a fixed size
     * 
     * @param x
     *            The width to set
     * @param y
     *            The height to set
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.setFixedSize = function(x, y) {
        // total width and height of available space
        var outerWidth = 0;
        if (x) {
            outerWidth = x + this.verticalScrollbarBox.boxObject.width;
        } else {
            outerWidth = this.outerBox.boxObject.width;
            // check for minimal width
            var minimalWidth = ThreadVis.Preferences
                    .getPreference(ThreadVis.Preferences.PREF_VIS_MINIMAL_WIDTH);
            if (outerWidth < minimalWidth) {
                outerWidth = minimalWidth;
            }
        }
        var outerHeight = this.outerBox.boxObject.height;

        this.outerBox.width = outerWidth;
        this.outerBox.height = outerHeight;
        this.outerBox.setAttribute("flex", "0");
        this.popups.removeAttribute("width");
        this.expandedHeaders.removeAttribute("width");

        this.maxSizeWidth = outerWidth;
        this.maxSizeHeight = outerHeight;
    }

    /***************************************************************************
     * Remove any fixed size and set the flex flag
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.setVariableSize = function() {
        if (this.scrollbar) {
            this.scrollbar.reset();
        }
        this.outerBox.removeAttribute("width");
        this.outerBox.removeAttribute("height");
        this.outerBox.setAttribute("flex", "2");
        this.popups.removeAttribute("width");
    }

    /***************************************************************************
     * If time scaling is enabled, we want to layout the messages so that their
     * horizontal spacing is proportional to the time difference between those
     * two messages
     * 
     * @param containers
     *            The array of all containers to visualise
     * @param minimalTimeDifference
     *            The minimal time difference between two messages
     * @param width
     *            The available width
     * @return The containers array with set spacings for each container
     **************************************************************************/
    ThreadVis.Visualisation.prototype.timeScaling = function(containers,
            minimalTimeDifference, width) {
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);
        var prefTimescaling = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_TIMESCALING);
        var prefTimescalingMethod = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_TIMESCALING_METHOD);
        var prefTimescalingMinimalTimeDifference = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_TIMESCALING_MINTIMEDIFF);

        // if we do not want to do timescaling, reset all scaling info to 1
        for ( var counter = 0; counter < containers.length; counter++) {
            var thisContainer = containers[counter];
            thisContainer.xScaled = 1;
        }
        if (!prefTimescaling) {
            return containers;
        }

        // we want to scale the messages horizontally according to their
        // time difference
        // therefore we calculate the overall scale factor
        if (prefTimescalingMinimalTimeDifference > 0) {
            minimalTimeDifference = prefTimescalingMinimalTimeDifference;
        }
        var totalTimeScale = 0;
        for ( var counter = 0; counter < containers.length - 1; counter++) {
            var thisContainer = containers[counter];
            // we norm the scale factor to the minimal time
            // (this means, the two messages that are the nearest in time
            // have a difference of 1)
            thisContainer.xScaled = thisContainer.timeDifference
                    / minimalTimeDifference;
            // instead of linear scaling, we might use other scaling factor
            if (prefTimescalingMethod == "log") {
                thisContainer.xScaled = Math.log(thisContainer.xScaled)
                        / Math.log(2) + 1;
            }
            // check if we might encounter a dummy container, see above
            if (thisContainer.xScaled < 1) {
                thisContainer.xScaled = 1;
            }
            totalTimeScale += thisContainer.xScaled;
        }

        // max_count_x tells us how many messages we could display if all are
        // laid out with the minimal horizontal spacing
        // e.g.
        // |---|---|---|
        // width / spacing would lead to 3
        var maxCountX = width / prefSpacing;

        // if the time scaling factor is bigger than what we can display, we
        // have a problem
        // this means, we have to scale the timing factor down
        var scaling = 0.9;
        var iteration = 0;
        while (totalTimeScale > maxCountX) {
            iteration++;
            totalTimeScale = 0;
            for ( var counter = 0; counter < containers.length - 1; counter++) {
                var thisContainer = containers[counter];
                if (prefTimescalingMethod == "linear") {
                    thisContainer.xScaled = thisContainer.xScaled * scaling;
                } else if (prefTimescalingMethod == "log") {
                    thisContainer.xScaled = Math
                            .log(thisContainer.timeDifference
                                    / minimalTimeDifference)
                            / Math.log(2 / Math.pow(scaling, iteration)) + 1;
                }
                if (thisContainer.xScaled < 1) {
                    thisContainer.xScaled = 1;
                }
                totalTimeScale += thisContainer.xScaled;
            }
            // if the total_time_scale == containers.length, we reduced every
            // horizontal spacing to its minimum and we can't do anything more
            // this means we have to lay out more messages than we can
            // this is dealt with later in resizing
            if (totalTimeScale == containers.length - 1) {
                break;
            }
        }

        return containers;
    }

    /***************************************************************************
     * Visualise a new thread
     * 
     * @param container
     *            The current message container to visualise
     * @param force
     *            True to force a draw even if the thread contains too many
     *            messages
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.visualise = function(container, force) {
        if (this.disabled) {
            return;
        }

        // set cursor
        this.box.style.cursor = "wait";

        // set background
        this.outerBox.style.backgroundColor = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_COLOURS_BACKGROUND);
        var borderColour = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_COLOURS_BORDER);
        if (borderColour != "") {
            this.outerBox.style.border = "1px solid " + borderColour;
        } else {
            this.outerBox.style.border = "";
        }

        if (typeof force == "undefined") {
            // check to see parent force
            if (ThreadVis.threadvisParent) {
                force = ThreadVis.threadvisParent.visualisation.force;
            } else {
                force = false;
            }
        }
        this.force = force;

        if (container == null) {
            container = this.currentContainer;
        }

        if (container == null) {
            return;
        }

        var prefArcDifference = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE);
        var prefArcMinHeight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT);
        var prefArcWidth = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_WIDTH);
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var defaultZoom = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ZOOM);
        var prefColour = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_COLOUR);
        var prefTimeline = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_TIMELINE);
        var prefOpacity = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_OPACITY) / 100;

        // check if we are still in the same thread as last time
        // check if visualisation parameters changed
        // if not, reset zoom level
        if (this.currentContainer
                && container.getTopContainer() == this.currentContainer
                        .getTopContainer() && !this.changed) {
            this.visualiseExisting(container);
            return;
        }

        // clear stack before drawing
        this.createStack();
        this.zoomReset();
        this.resetStack();
        this.clearStack();

        // get topmost container
        var topContainer = container.getTopContainer();

        // get number of containers
        var count = topContainer.getCountRecursive();
        if (count > 50 && !this.force) {
            this.displayWarningCount(container);
            return;
        }

        // remember current container to redraw after zoom
        this.currentContainer = container;

        // get all containers in thread as array
        this.containers = new Array();
        this.containers.push(topContainer);
        this.containers = this.containers.concat(topContainer.getChildren());

        // sort containers by date
        this.containers.sort(ThreadVis.Container.sortFunction);

        // pre-calculate size
        var preSize = this.calculateSize(this.containers);
        this.containers = preSize.containers;
        // totalmaxheight counts the maximal number of stacked arcs
        var totalMaxHeight = preSize.totalMaxHeight;
        // minmaltimedifference stores the minimal time between two messages
        var minimalTimeDifference = preSize.minimalTimeDifference;

        var topHeight = prefDotSize / 2 + prefArcMinHeight + preSize.topHeight
                * prefArcDifference;
        var bottomHeight = prefDotSize / 2 + prefArcMinHeight
                + preSize.bottomHeight * prefArcDifference;

        var availableSize = this.getBoxSize();

        // do time scaling
        var width = availableSize.width * this.zoom
                - (prefSpacing / this.resize);
        var height = availableSize.height * this.zoom;
        this.containers = this.timeScaling(this.containers,
                minimalTimeDifference, width);

        // do final resizing
        if (defaultZoom == "fit") {
            this.resize = this.getResize(this.containers.length,
                    totalMaxHeight, width, height);
        } else {
            this.resize = 1 * this.zoom;
        }

        var x = (prefSpacing / 2) * (1 / this.resize);

        // pre-calculate colours for different authors
        this.authors = new Object();
        this.lastColour = -1;

        this.containerVisualisations = new Array();
        this.arcVisualisations = new Array();

        for ( var counter = 0; counter < this.containers.length; counter++) {
            var thisContainer = this.containers[counter];

            var selected = thisContainer == container;
            var inThread = container.findParent(thisContainer)
                    || thisContainer.findParent(container);
            var sent = !thisContainer.isDummy() ? thisContainer.getMessage()
                    .isSent() : false;

            var colour = this.COLOUR_DUMMY;
            var opacity = 1;
            var hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            var tmpStart = (new Date()).getTime();
            if (!thisContainer.isDummy()) {
                if (prefColour == "single") {
                    if (selected) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    if (this.authors[thisContainer.getMessage().getFromEmail()] != null) {
                        hsv = this.authors[thisContainer.getMessage()
                                .getFromEmail()].hsv;
                        this.authors[thisContainer.getMessage().getFromEmail()].count = this.authors[thisContainer
                                .getMessage().getFromEmail()].count + 1;
                    } else {
                        hsv = this.getNewColour(sent);
                        this.authors[thisContainer.getMessage().getFromEmail()] = {
                            "hsv" : hsv,
                            "name" : thisContainer.getMessage().getFrom(),
                            "count" : 1
                        };
                    }
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            // only display black circle to highlight selected message
            // if we are using more than one colour
            var circle = prefColour == "single" ? false : true;

            this.containerVisualisations[thisContainer] = this.drawDot(
                    thisContainer, colour, x, topHeight, selected, circle,
                    opacity);

            thisContainer.xPosition = x;

            // draw arc
            var parent = thisContainer.getParent()
            if (parent != null && !parent.isRoot()) {
                var position = "bottom";
                if (parent.odd) {
                    position = "top";
                }

                var arcHeight = thisContainer.arcHeight;
                // if we are using a single colour, display all arcs from
                // a selected message in this colour
                if (prefColour == "single") {
                    if (selected || inThread) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    // get colour for arc
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }

                this.arcVisualisations[thisContainer] = this.drawArc(colour,
                        position, arcHeight, parent.xPosition, x, topHeight,
                        opacity);
            }
            if (counter < this.containers.length - 1) {
                x = x + (thisContainer.xScaled * prefSpacing);
            }
        }

        x += prefDotSize * this.resize + (prefSpacing / 2) * (1 / this.resize);

        // if visualisation needs less space than available, make box smaller
        if (!ThreadVis.isPopupVisualisation()) {
            if (x * this.resize < this.maxSizeWidth) {
                this.setFixedSize(x * this.resize);
            }
        }

        // underline authors if enabled
        this.colourAuthors(this.authors);
        this.createLegend(this.authors);
        ThreadVis.displayLegend();

        // calculate if we have to move the visualisation so that the
        // selected message is visible
        this.moveVisualisation(container);

        // create a new box and overlay over all other elements to catch
        // all clicks and drags
        var popupBox = document.createElementNS(ThreadVis.XUL_NAMESPACE, "box");
        popupBox.style.width = "100%";
        popupBox.style.height = "100%";
        popupBox.setAttribute("context", "ThreadVisPopUp");

        if (prefTimeline) {
            this.timeline = new ThreadVis.Timeline(this.stack, this.containers,
                    this.resize, topHeight);
            this.timeline.draw();
        } else {
            this.timeline = null;
        }

        if (!this.scrollbar) {
            this.scrollbar = new ThreadVis.Scrollbar(this, this.stack, this.box);
        }
        this.scrollbar.init(this.box);
        this.scrollbar.draw();
        this.changed = false;

        // check for resize of box
        this.boxHeight = this.box.boxObject.height;
        this.boxWidth = this.box.boxObject.width;
        var ref = this;
        clearInterval(this.checkResizeInterval);
        this.checkResizeInterval = setInterval(function() {
            ref.checkSize();
        }, 100);

        // set cursor if visualisation is draggable
        this.setCursor();

        // vertically center the visualisation
        var centerY = (availableSize.height - prefDotSize * this.resize) / 2;
        var nowY = topHeight * this.resize;
        var deltaY = centerY - nowY;
        this.moveVisualisationTo( {
            y : deltaY
        });
    }

    /***************************************************************************
     * Visualise an existing thread
     * 
     * @param container
     *            The current message container
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.visualiseExisting = function(container) {
        var prefArcDifference = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE);
        var prefArcMinHeight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT);
        var prefArcWidth = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_WIDTH);
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);
        var defaultZoom = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ZOOM);
        var prefColour = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_COLOUR);
        var prefTimeline = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_TIMELINE);
        var prefOpacity = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_OPACITY) / 100;

        // set cursor
        this.box.style.cursor = "wait";

        // remember current container to redraw after zoom
        this.currentContainer = container;

        // pre-calculate size
        var preSize = this.calculateSize(this.containers);
        this.containers = preSize.containers;
        // totalmaxheight counts the maximal number of stacked arcs
        var totalMaxHeight = preSize.totalMaxHeight;
        // minmaltimedifference stores the minimal time between two messages
        var minimalTimeDifference = preSize.minimalTimeDifference;

        var topHeight = prefDotSize / 2 + prefArcMinHeight + preSize.topHeight
                * prefArcDifference;
        var bottomHeight = prefDotSize / 2 + prefArcMinHeight
                + preSize.bottomHeight * prefArcDifference;

        var availableSize = this.getBoxSize();

        // do timescaling
        var width = availableSize.width * this.zoom
                - (prefSpacing / this.resize);
        var height = availableSize.height * this.zoom;
        this.containers = this.timeScaling(this.containers,
                minimalTimeDifference, width);

        // do final resizing
        if (defaultZoom == "fit") {
            this.resize = this.getResize(this.containers.length,
                    totalMaxHeight, width, height);
        } else {
            this.resize = 1 * this.zoom;
        }

        var x = (prefSpacing / 2) * (1 / this.resize);

        for ( var counter = 0; counter < this.containers.length; counter++) {
            var thisContainer = this.containers[counter];

            var selected = thisContainer == container;
            var inThread = thisContainer.findParent(container)
                    || container.findParent(thisContainer);
            var sent = !thisContainer.isDummy() ? thisContainer.getMessage()
                    .isSent() : false;

            // only display black circle to highlight selected message
            // if we are using more than one colour
            var circle = prefColour == "single" ? false : true;

            // if thread has changed and we don't have all container
            // visualisations
            if (this.containerVisualisations[thisContainer] == null) {
                // do a full redraw
                this.currentContainer = null;
                this.visualise(container);
                return;
            }

            var colour = this.COLOUR_DUMMY;
            var opacity = 1;
            var hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            if (!thisContainer.isDummy()) {
                // get colour for dot
                if (prefColour == "single") {
                    if (selected) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    var hsv = null;
                    if (this.authors[thisContainer.getMessage().getFromEmail()] != null) {
                        hsv = this.authors[thisContainer.getMessage()
                                .getFromEmail()].hsv;
                    } else {
                        hsv = this.getNewColour(sent);
                        this.authors[thisContainer.getMessage().getFromEmail()] = {
                            "hsv" : hsv,
                            "name" : thisContainer.getMessage().getFrom(),
                            "count" : 1
                        };
                    }
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            // draw dot
            this.containerVisualisations[thisContainer].redraw(this.resize, x,
                    topHeight, selected, colour, opacity);

            thisContainer.xPosition = x;

            // get colour for arc
            if (prefColour == "single") {
                if (selected || inThread) {
                    colour = this.COLOUR_SINGLE;
                } else {
                    colour = this.COLOUR_DUMMY;
                }
            } else {
                colour = this.getColour(hsv.hue, 100, hsv.value);
                if (selected || inThread) {
                    opacity = 1;
                } else {
                    opacity = prefOpacity;
                }
            }

            // draw arc
            var parent = thisContainer.getParent()
            if (parent != null && !parent.isRoot()) {
                this.arcVisualisations[thisContainer].redrawArc(this.resize,
                        parent.xPosition, x, topHeight, colour, opacity)
            }

            x = x + (thisContainer.xScaled * prefSpacing);
        }

        // calculate if we have to move the visualisation so that the
        // selected message is visible
        this.moveVisualisation(container);

        // underline authors if enabled
        this.colourAuthors(this.authors);
        this.createLegend(this.authors);

        if (prefTimeline && this.timeline != null) {
            this.timeline.redraw(this.resize, topHeight);
        }

        // reset vertical position before drawing scrollbars
        this.moveVisualisationTo( {
            y : 0
        });
        this.scrollbar.draw();

        // set cursor if visualisation is draggable
        this.setCursor();

        // vertically center the visualisation
        var centerY = (availableSize.height - prefDotSize * this.resize) / 2;
        var nowY = topHeight * this.resize;
        var deltaY = centerY - nowY;
        this.moveVisualisationTo( {
            y : deltaY
        });
    }

    /***************************************************************************
     * Zoom in and draw new visualisation
     * 
     * @param amount
     *            The amount by which to zoom in
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.zoomIn = function(amount) {
        if (!isFinite(amount) || amount == 0) {
            amount = 1;
        }

        this.zoom = this.zoom + 0.1 * amount;

        clearTimeout(this.zoomTimeout);
        var ref = this;
        this.zoomTimeout = setTimeout(function() {
            ref.visualise();
        }, 200);
    }

    /***************************************************************************
     * Zoom out and draw new visualisation
     * 
     * @param amount
     *            The amount by which to zoom out
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.zoomOut = function(amount) {
        // don't zoom out if there are no scrollbars
        if (!this.scrollbar.isShown()) {
            return;
        }
        if (!isFinite(amount) || amount == 0) {
            amount = 1;
        }

        this.zoom = this.zoom - 0.1 * amount;
        if (this.zoom < 0.1) {
            this.zoom = 0.1;
        }

        clearTimeout(this.zoomTimeout);
        var ref = this;
        this.zoomTimeout = setTimeout(function() {
            ref.visualise();
        }, 200);
    }

    /***************************************************************************
     * Reset Zoom level
     * 
     * @return void
     **************************************************************************/
    ThreadVis.Visualisation.prototype.zoomReset = function() {
        this.zoom = 1.0;
    }

    /***************************************************************************
     * Export to SVG
     * 
     * @param container
     *            The message container to visualise
     * @param force
     *            True to force the display even if the thread contains too many
     *            messages
     **************************************************************************/
    ThreadVis.Visualisation.prototype.exportToSVG = function(container, force) {
        if (typeof force == "undefined") {
            force = false;
        }
        this.force = force;

        if (container == null) {
            container = this.currentContainer;
        }

        var prefArcDifference = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_DIFFERENCE);
        var prefArcMinHeight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_MINHEIGHT);
        var prefArcWidth = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_ARC_WIDTH);
        var prefSpacing = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_SPACING);
        var prefDotSize = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_DOTSIZE);
        var prefDefaultZoomHeight = parseFloat(ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_ZOOM_HEIGHT));
        var prefDefaultZoomWidth = parseFloat(ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_ZOOM_WIDTH));
        var prefColour = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_COLOUR);
        var prefTimeline = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_TIMELINE);
        var prefOpacity = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_VIS_OPACITY) / 100;
        var prefWidth = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_SVG_WIDTH);
        var prefHeight = ThreadVis.Preferences
                .getPreference(ThreadVis.Preferences.PREF_SVG_HEIGHT);

        // get topmost container
        var topContainer = container.getTopContainer();

        // get all containers in thread as array
        var containers = new Array();
        containers.push(topContainer);
        containers = containers.concat(topContainer.getChildren());

        // sort containers by date
        containers.sort(ThreadVis.Container.sortFunction);

        // pre-calculate size
        var preSize = this.calculateSize(this.containers);
        containers = preSize.containers;
        // totalmaxheight counts the maximal number of stacked arcs
        var totalMaxHeight = preSize.totalMaxHeight;
        // minmaltimedifference stores the minimal time between two messages
        var minimalTimeDifference = preSize.minimalTimeDifference;

        var topHeight = prefDotSize / 2 + prefArcMinHeight + preSize.topHeight
                * prefArcDifference;
        var bottomHeight = prefDotSize / 2 + prefArcMinHeight
                + preSize.bottomHeight * prefArcDifference;

        var width = prefWidth;
        var height = prefHeight;

        containers = this.timeScaling(containers, minimalTimeDifference, width);

        // do final resizing
        var x = prefSpacing / 2;
        var resize = this.getResize(containers.length, totalMaxHeight, width,
                height);

        // pre-calculate colours for different authors
        var authors = new Object();
        // remember last colour to reset
        var lastColour = this.lastColour;
        this.lastColour = -1;

        var svg = "<?xml version=\"1.0\" standalone=\"no\"?>"
                + "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">"
                + "<svg width=\"100%\" height=\"100%\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\">";

        for ( var counter = 0; counter < containers.length; counter++) {
            var thisContainer = containers[counter];

            var selected = thisContainer == container;
            var inThread = container.findParent(thisContainer)
                    || thisContainer.findParent(container);
            var sent = !thisContainer.isDummy() ? thisContainer.getMessage()
                    .isSent() : false;

            var colour = this.COLOUR_DUMMY;
            var opacity = 1;
            var hsv = {
                "hue" : 60,
                "saturation" : 6.8,
                "value" : 45.9
            };
            var tmpStart = (new Date()).getTime();
            if (!thisContainer.isDummy()) {
                if (prefColour == "single") {
                    if (selected) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    if (authors[thisContainer.getMessage().getFromEmail()] != null) {
                        hsv = authors[thisContainer.getMessage().getFromEmail()].hsv;
                    } else {
                        hsv = this.getNewColour(sent);
                        authors[thisContainer.getMessage().getFromEmail()] = {
                            "hsv" : hsv
                        };
                    }
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }
            }

            // only display black circle to highlight selected message
            // if we are using more than one colour
            var circle = prefColour == "single" ? false : true;

            svg += this.drawDotSVG(thisContainer, colour, x, topHeight,
                    selected, circle, false, opacity, resize, counter);

            thisContainer.xPosition = x;
            thisContainer.svgId = counter;

            // draw arc
            var parent = thisContainer.getParent()
            if (parent != null && !parent.isRoot()) {
                var position = "bottom";
                if (parent.odd) {
                    position = "top";
                }

                var arcHeight = thisContainer.arcHeight;
                // if we are using a single colour, display all arcs from
                // a selected message in this colour
                if (prefColour == "single") {
                    if (selected || inThread) {
                        colour = this.COLOUR_SINGLE;
                    } else {
                        colour = this.COLOUR_DUMMY;
                    }
                } else {
                    // get colour for arc
                    colour = this.getColour(hsv.hue, 100, hsv.value);
                    if (selected || inThread) {
                        opacity = 1;
                    } else {
                        opacity = prefOpacity;
                    }
                }

                svg += this.drawArcSVG(colour, position, arcHeight,
                        parent.xPosition, x, topHeight, opacity, resize,
                        counter);
            }
            x = x + (thisContainer.xScaled * prefSpacing);
        }

        this.lastColour = lastColour;

        svg += "</svg>";

        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                .createInstance(nsIFilePicker);
        fp.init(window, "Select a File", nsIFilePicker.modeSave);
        fp.appendFilter("SVG Files", "*.svg");

        var res = fp.show();
        if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
            var file = fp.file;
            var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(Components.interfaces.nsIFileOutputStream);

            // use 0x02 | 0x10 to open file for appending.
            foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write,
            // create,
            // truncate
            foStream.write(svg, svg.length);
            foStream.close();
        }
    }

    return ThreadVis;
}(ThreadVis || {}));
