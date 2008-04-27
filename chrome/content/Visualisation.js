/** ****************************************************************************
 * Visualisation.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to visualise thread arcs
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor for visualisation class
 ******************************************************************************/
function Visualisation() {
    this.COLOUR_DUMMY = "#75756D";
    this.COLOUR_SINGLE = "#0000FF";

    this.box = null;
    this.stack = null;
    this.strings = null;
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
}



/** ****************************************************************************
 * Calculate heights for all arcs
 ******************************************************************************/
Visualisation.prototype.calculateArcHeights = function(containers) {
    // reset all heights
    for (var counter = 0; counter < containers.length; counter++) {
        var thisContainer = containers[counter];
        thisContainer.currentArcHeightIncoming = new Array();
        thisContainer.currentArcHeightOutgoing = new Array();
    }

    for (var counter = 0; counter < containers.length; counter++) {
        var thisContainer = containers[counter];
        thisContainer.xIndex = counter;

        // odd_ tells us if we display the arc above or below the messages
        thisContainer.odd = thisContainer.getDepth() % 2 == 0;

        var parent = thisContainer.getParent();
        if (parent != null && ! parent.isRoot()) {
            // find a free arc height between the parent message and this one
            // since we want to draw an arc between this message and its parent,
            // and we do not want any arcs to overlap
            var freeHeight = 1;
            var blocked = true;
            while (blocked) {
                blocked = false;
                for (var innerCounter = parent.xIndex; innerCounter < counter;
                    innerCounter++) {
                    var lookAtContainer = containers[innerCounter];

                    /*
                    if (lookatcontainer.getParent() == parent &&
                        lookatcontainer.x_index_ == thiscontainer.x_index_ - 1)
                    {
                        free_height = lookatcontainer.arc_height_;
                        break;
                    }
                    */

                    if (lookAtContainer.odd == parent.odd && 
                        lookAtContainer.currentArcHeightOutgoing[freeHeight] == 1) {
                        freeHeight++;
                        blocked = true;
                        break;
                    }
                    if (lookAtContainer.odd != parent.odd &&
                        lookAtContainer.currentArcHeightIncoming[freeHeight] == 1) {
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



/** ****************************************************************************
 * Calculate size
 ******************************************************************************/
Visualisation.prototype.calculateSize = function(containers) {
    // totalmaxheight counts the maximal number of stacked arcs
    var totalMaxHeight = 0;

    // topheight counts the maximal number of stacked arcs on top
    var topHeight = 0;

    // bottomheight counts the maximal number of stacked arcs on bottom
    var bottomHeight = 0;

    // minmaltimedifference stores the minimal time between two messages
    var minimalTimeDifference = Number.MAX_VALUE;

    this.calculateArcHeights(containers);

    for (var counter = 0; counter < containers.length; counter++) {
        var thisContainer = containers[counter];

        // odd_ tells us if we display the arc above or below the messages
        thisContainer.odd = thisContainer.getDepth() % 2 == 0;

        var parent = thisContainer.getParent();
        if (parent != null && ! parent.isRoot()) {
        // also keep track of the current maximal stacked arc height,
        // so that we can resize the whole extension
        if (parent.odd && thisContainer.arcHeight > topHeight) {
            topHeight = thisContainer.arcHeight;
        }

        if (! parent.odd && thisContainer.arcHeight > bottomHeight)
            bottomHeight = thisContainer.arcHeight;
        }

        // also keep track of the time difference between two adjacent messages
        if (counter < containers.length - 1) {
            var timeDifference = containers[counter + 1].getDate().getTime() - 
                                 containers[counter].getDate().getTime();
            // timedifference_ stores the time difference to the _next_ message
            thisContainer.timeDifference = timeDifference;

            // since we could have dummy containers that have the same time as 
            // the next message, skip any time difference of 0
            if (timeDifference < minimalTimeDifference && timeDifference != 0) {
                minimalTimeDifference = timeDifference;
            }
        }
    }

    totalMaxHeight = Math.max(topHeight, bottomHeight);

    return {"containers" : containers, "totalMaxHeight" : totalMaxHeight,
        "minimalTimeDifference" : minimalTimeDifference, "topHeight": topHeight,
        "bottomHeight" : bottomHeight};
}



/** ****************************************************************************
 * Check size of stack
 * if resized, resize visualisation
 ******************************************************************************/
Visualisation.prototype.checkSize = function() {
    if (this.disabled) {
        return;
    }

    if (this.box.boxObject.height != this.boxHeight || 
        this.box.boxObject.width != this.boxWidth) {
        this.resetStack();
        this.visualise();
        
    }

    this.boxHeight = this.box.boxObject.height;
    this.boxWidth = this.box.boxObject.width;
}



/** ****************************************************************************
 * Clear stack
 * delete all children
 ******************************************************************************/
Visualisation.prototype.clearStack = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.clearStack()", {});
    }

    while(this.stack.firstChild != null) {
        this.stack.removeChild(this.stack.firstChild);
    }

    // reset move
    if (THREADVIS.SVG) {
        this.stack.setAttribute("transform", "translate(0,0)");
    } else {
        this.stack.style.marginLeft = "0px";
        this.stack.style.marginTop = "0px";
        this.stack.style.padding = "5px";
    }
}



/** ****************************************************************************
 * Underline authors in header view
 ******************************************************************************/
Visualisation.prototype.colourAuthors = function(authors) {
    var prefHighlight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_HIGHLIGHT);

    // colour links
    var emailFields = new Array();

    // check to see if we have the element expandedHeaderView
    if (document.getElementById("expandedHeaderView") == null) {
        // check for parent window
        if (THREADVIS.threadvisParent) {
            THREADVIS.threadvisParent.visualisation.colourAuthors(authors);
        }
        return;
    }

    // from, reply-to, ... (single value fields)
    var singleFields = document.getElementById("expandedHeaderView")
        .getElementsByTagName("mail-emailheaderfield");
    for (var i = 0; i < singleFields.length; i++) {
        if (singleFields[i].emailAddressNode.attributes["emailAddress"]) {
            emailFields.push(singleFields[i].emailAddressNode);
        }
    }

    // to, cc, bcc, ... (multi value fields)
    var multiFields = document.getElementById("expandedHeaderView")
        .getElementsByTagName("mail-multi-emailHeaderField");
    for (var i = 0; i < multiFields.length; i++) {
        // get "normal" header fields (i.e. non expanded cc and to)
        var multiField = multiFields[i].emailAddresses.childNodes;
        for (var j = 0; j < multiField.length; j++) {
            if (multiField[j].attributes["emailAddress"])
                emailFields.push(multiField[j]);
        }

        // get "expanded" header fields
        multiField = multiFields[i].longEmailAddresses.childNodes;
        for (var j = 0; j < multiField.length; j++) {
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



/** ****************************************************************************
 * Convert a HSV colour to a RGB colour
 ******************************************************************************/
Visualisation.prototype.convertHSVtoRGB = function(hue, saturation, value) {
    var h = hue / 360;
    var s = saturation / 100;
    var v = value / 100;

    if (s == 0) {
        return {"r" : v * 255, "g" : v * 255, "b" : v * 255};
    } else {
        var varH = h * 6;
        var varI = Math.floor(varH);
        var var1 = v * (1 - s);
        var var2 = v * (1 - s * (varH - varI));
        var var3 = v * (1 - s * (1 - (varH - varI)));

        switch(varI) {
            case 0:
                var varR = v;
                var varG = var3;
                var varB = var1;
                break;
            case 1:
                var varR = var2;
                var varG = v;
                var varB = var1;
                break;
            case 2:
                var varR = var1;
                var varG = v;
                var varB = var3;
                break;
            case 3:
                var varR = var1;
                var varG = var2;
                var varB = v;
                break;
            case 4:
                var varR = var3;
                var varG = var1;
                var varB = v;
                break;
            default:
                var varR = v;
                var varG = var1;
                var varB = var2;
        }
        return {"r" : varR * 255, "g" : varG * 255, "b" : varB * 255};
    }
}



/** ****************************************************************************
 * Convert a RGB colour to a HSV colour
 ******************************************************************************/
Visualisation.prototype.convertRGBtoHSV = function (r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    var h = 0;
    var s = 0;
    var v = 0;

    var minVal = Math.min(r, g, b);
    var maxVal = Math.max(r, g, b);
    var delta = maxVal - minVal;

    var v = maxVal;

    if (delta == 0) {
        h = 0;
        s = 0;
    } else {
        s = delta / maxVal;
        var del_R = (((maxVal - r) / 6) + (delta / 2)) / delta;
        var del_G = (((maxVal - g) / 6) + (delta / 2)) / delta;
        var del_B = (((maxVal - b) / 6) + (delta / 2)) / delta;

        if (r == maxVal) {
            h = del_B - del_G;
        } else if (g == maxVal) {
            h = (1 / 3) + del_R - del_B;
        } else if (b == maxVal) {
            h = (2 / 3) + del_G - del_R;
        }

        if (h < 0) {
            h += 1;
        }
        if (h > 1) {
            h -= 1;
        }
    }
    return {"hue" : h * 360, "saturation" : s * 100, "value" : v * 100};
}



/** ****************************************************************************
 * Build legend popup containing all authors of current thread
 ******************************************************************************/
Visualisation.prototype.createLegend = function(authors) {
    this.legend = document.createElementNS(THREADVIS.XUL_NAMESPACE, "vbox");

    for (var email in authors) {
        var hsv = authors[email].hsv;
        var name = authors[email].name;
        var count = authors[email].count;
        this.legend.appendChild(this.createLegendBox(hsv, name, count));
    }
}



/** ****************************************************************************
 * Build one row for legend
 ******************************************************************************/
Visualisation.prototype.createLegendBox = function(hsv, name, count) {
    var box = document.createElementNS(THREADVIS.XUL_NAMESPACE, "hbox");

    var colourBox = document.createElementNS(THREADVIS.XUL_NAMESPACE, "hbox");
    colourBox.style.background = this.getColour(hsv.hue, 100, hsv.value);
    colourBox.style.width = "20px";
    box.appendChild(colourBox);

    var nameBox = document.createElementNS(THREADVIS.XUL_NAMESPACE, "description");
    var nameText = document.createTextNode(name + " (" + count + ")");
    nameBox.appendChild(nameText)

    box.appendChild(nameBox);

    return box;
}



/** ****************************************************************************
 * Create stack
 ******************************************************************************/
Visualisation.prototype.createStack = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.createStack()", {});
    }

    this.outerBox = document.getElementById("ThreadVis");
    this.box = document.getElementById("ThreadVisBox");
    this.stack = document.getElementById("ThreadVisStack");
    this.strings = document.getElementById("ThreadVisStrings");

    var ref = this;
    if (! this.stack) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Visualisation.createStack()", {"action" : "create stack"});
        }
        this.stack = null;
        // try to create SVG if enabled
        var svgEnabled = THREADVIS.preferences.getPreference(
            THREADVIS.preferences.PREF_VIS_SVG);
        if (svgEnabled) {
            try {
                var svg = document.createElementNS(THREADVIS.SVG_NAMESPACE, "svg");
                if (svg instanceof SVGSVGElement) {
                    this.stack = document.createElementNS(THREADVIS.SVG_NAMESPACE, "g");
                    svg.appendChild(this.stack);
                    this.stack.setAttribute("id", "ThreadVisStack");
                    this.box.appendChild(svg);
                    THREADVIS.SVG = true;
                    THREADVIS.logger.log("Using SVG.", {});
                } else {
                    this.stack = null;
                }
            } catch (ex) {
                this.stack = null;
            }
        }
        if (this.stack == null) {
            THREADVIS.logger.log("Using XUL.", {});
            THREADVIS.SVG = false;
            this.stack = document.createElementNS(THREADVIS.XUL_NAMESPACE, "stack");
            this.stack.setAttribute("id", "ThreadVisStack");
            this.stack.style.position = "relative";
            this.box.appendChild(this.stack);
        }
        document.addEventListener("mousemove",
            function(event) {ref.onMouseMove(event);}, false);
        this.box.addEventListener("mousedown",
            function(event) {ref.onMouseDown(event);}, false);
        document.addEventListener("mouseup",
            function(event) { ref.onMouseUp(event); }, false);
        this.box.addEventListener("DOMMouseScroll",
            function(event) {ref.onScroll(event);}, false);
    } else {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Visualisation.createStack()", {"action" : "clear stack"});
        }
        this.clearStack();
    }

    if (THREADVIS.SVG) {
        var loading = document.createElementNS(THREADVIS.SVG_NAMESPACE, "text");
        var text = document.createTextNode(
            this.strings.getString("visualisation.loading"));
        loading.appendChild(text);
        loading.setAttribute("x", "20");
        loading.setAttribute("y", "20");
        loading.setAttribute("color", "#999999");
    } else {
        var loading = document.createElementNS(THREADVIS.XUL_NAMESPACE, "description");
        loading.setAttribute("value", this.strings.getString("visualisation.loading"));
        loading.style.position = "relative";
        loading.style.top = "20px"
        loading.style.left = "20px"
        loading.style.color = "#999999";
    }
    this.stack.appendChild(loading);
}



/** ****************************************************************************
 * Get hexadecimal representation of a decimal number
 ******************************************************************************/
Visualisation.prototype.DECtoHEX = function(dec) {
    var alpha = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
    var n_ = Math.floor(dec / 16)
    var _n = dec - n_*16;
    return alpha[n_] + alpha[_n];
}



/** ****************************************************************************
 * Get decimal representation of a hexadecimal number
 ******************************************************************************/
Visualisation.prototype.HEXtoDEC = function(hex) {
    return parseInt(hex, 16);
}



/** ****************************************************************************
 * Display disabled message
 ******************************************************************************/
Visualisation.prototype.displayDisabled = function() {
    this.clearStack();

    if (THREADVIS.SVG) {
        var warning = document.createElementNS(THREADVIS.SVG_NAMESPACE, "text");
        var text = document.createTextNode(
            this.strings.getString("visualisation.disabledWarning"));
        warning.appendChild(text);
        warning.setAttribute("x", "20");
        warning.setAttribute("y", "10");
        warning.setAttribute("color", "#999999");
        this.stack.appendChild(warning);

        var link = document.createElementNS(THREADVIS.SVG_NAMESPACE, "text");
        var text = document.createTextNode(
            this.strings.getString("visualisation.disabledWarning"));
        link.appendChild(text);
        link.setAttribute("x", "20");
        link.setAttribute("y", "30");
        link.setAttribute("color", "#0000ff");
        link.addEventListener("click", function() {
            THREADVIS.openThreadVisOptionsDialog();
        }, true);
        this.stack.appendChild(link);
    } else {
        var warning = document.createElementNS(THREADVIS.XUL_NAMESPACE, "label");
        warning.setAttribute("value",
            this.strings.getString("visualisation.disabledWarning"));
        warning.style.position = "relative";
        warning.style.top = "10px"
        warning.style.left = "20px"
        warning.style.color = "#999999";
        this.stack.appendChild(warning);

        var link = document.createElementNS(THREADVIS.XUL_NAMESPACE, "label");
        link.setAttribute("value", this.strings.getString("visualisation.disabledWarningLink"));
        link.style.position = "relative";
        link.style.top = "30px"
        link.style.left = "20px"
        link.style.color = "#0000ff";
        link.style.textDecoration = "underline";
        link.addEventListener("click", function() {
            THREADVIS.openThreadVisOptionsDialog();
        }, true);
        link.style.cursor = "pointer";
        this.stack.appendChild(link);
    }

    // set cursor
    this.box.style.cursor = "";

    this.disabled = true;
    this.changed = true;
    this.colourAuthors(new Array());
}



/** ****************************************************************************
 * Display warning (too many messages)
 ******************************************************************************/
Visualisation.prototype.displayWarningCount = function(container) {
    this.clearStack();

    if (THREADVIS.SVG) {
        var warning = document.createElementNS(THREADVIS.SVG_NAMESPACE, "text");
        warning.appendChild(document.createTextNode(
            this.strings.getString("visualisation.warningCount") + " [" +
            container.getTopContainer().getCountRecursive() + "]."));
        warning.setAttribute("x", "20");
        warning.setAttribute("y", "10");
        warning.setAttribute("color", "#999999");
        this.stack.appendChild(warning);

        var link = document.createElementNS(THREADVIS.SVG_NAMESPACE, "text");
        link.appendChild(document.createTextNode(
            this.strings.getString("visualisation.warningCountLink")));
        link.setAttribute("x", "20");
        link.setAttribute("y", "30");
        link.setAttribute("color", "#0000ff");
        var ref = this;
        link.addEventListener("click", function() {
            ref.visualise(container, true);
        }, true);
        this.stack.appendChild(link);
    } else {
        var warning = document.createElementNS(THREADVIS.XUL_NAMESPACE, "label");
        warning.setAttribute("value",
            this.strings.getString("visualisation.warningCount") + " [" +
            container.getTopContainer().getCountRecursive() + "].");
        warning.style.position = "relative";
        warning.style.top = "10px"
        warning.style.left = "20px"
        warning.style.color = "#999999";
        this.stack.appendChild(warning);

        var link = document.createElementNS(THREADVIS.XUL_NAMESPACE, "label");
        link.setAttribute("value", this.strings.getString("visualisation.warningCountLink"));
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
    }
    // set cursor
    this.box.style.cursor = "";
}



/** ****************************************************************************
 * Draw arc
 ******************************************************************************/
Visualisation.prototype.drawArc = function(colour, vPosition, height, left, 
    right, top, opacity) {
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefArcMinHeight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_MINHEIGHT);
    var prefArcDifference = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_DIFFERENCE);
    var prefArcRadius = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_RADIUS);
    var prefArcWidth = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_WIDTH);

    if (THREADVIS.SVG) {
        var arc = new ArcVisualisationSVG(this.stack, prefDotSize, this.resize,
            prefArcMinHeight, prefArcDifference, prefArcRadius, prefArcWidth,
            colour, vPosition, height, left, right, top, opacity);
    } else {
        var arc = new ArcVisualisation(this.stack, prefDotSize, this.resize,
            prefArcMinHeight, prefArcDifference, prefArcRadius, prefArcWidth,
            colour, vPosition, height, left, right, top, opacity);
    }

    return arc;
}



/** ****************************************************************************
 * Export an arc to SVG
 ******************************************************************************/
Visualisation.prototype.drawArcSVG = function(colour, vPosition, height, left, 
    right, top, opacity, resize, counter) {
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefArcMinHeight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_MINHEIGHT);
    var prefArcDifference = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_DIFFERENCE);
    var prefArcRadius = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_RADIUS);
    var prefArcWidth = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_WIDTH);

    var height = ((prefArcMinHeight + prefArcDifference * height) - prefArcWidth)
        * resize;
    var startX = left * resize;
    var startY = 0;
    var width = ((right - left) * resize) ;
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

    var path = "M"+ startX + "," + startY
        + " a" + radiusX + "," + radiusY 
        + " 0 0," + sweep
        + " " + radiusX + "," + cornerStart
        + " h " + width
        + " a" + radiusX + "," + radiusY
        + " 0 0," + sweep
        + " " + radiusX + "," + cornerEnd;

    return "<path id='p_" + counter + "'"
        + " d='" + path + "'"
        + " fill='none'"
        + " stroke='" + colour + "'"
        + " stroke-width='" + (prefArcWidth * resize) + "' />";
}



/** ****************************************************************************
 * Draw a dot
 ******************************************************************************/
Visualisation.prototype.drawDot = function(container, colour, left, top, 
    selected, circle, flash, opacity) {
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);
    var prefMessageCircles = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_MESSAGE_CIRCLES);

    if (THREADVIS.SVG) {
        var msg = new ContainerVisualisationSVG(this.stack, this.strings, container,
            colour, left, top, selected, prefDotSize, this.resize, circle, flash,
            prefSpacing, opacity, prefMessageCircles);
    } else {
        var msg = new ContainerVisualisation(this.stack, this.strings, container,
            colour, left, top, selected, prefDotSize, this.resize, circle, flash,
            prefSpacing, opacity, prefMessageCircles);
    }

    return msg;
}



/** ****************************************************************************
 * Export a dot to SVG
 ******************************************************************************/
Visualisation.prototype.drawDotSVG = function(container, colour, left, top, 
    selected, circle, flash, opacity, resize, counter) {
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);
    var prefMessageCircles = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_MESSAGE_CIRCLES);

    var style = "full";
    if (! container.isDummy()) {
        if (container.getMessage().isSent()) {
            style = "half";
        }
    } else {
        style ="dummy";
    }

    var svg = "<circle id='c_" + counter + "'"
        + " onmouseover='toggle(evt,this);' onmouseout='toggle(evt,this);'"
        + " cx='" + (left * resize) + "'"
        + " cy='" + (top * resize) + "'"
        + " r='" + (prefDotSize * resize * 0.5) + "'";

    if (style != "half") {
        svg += " fill='" + colour + "'";
    } else {
        svg += " stroke='" + colour + "'"
            + " stroke-width='" + (prefDotSize / 4 * resize) + "'"
            + " fill='none'";
    }
    svg += " />"

    return svg;
}



/** ****************************************************************************
 * Get a colour for the arc
 ******************************************************************************/
Visualisation.prototype.getColour = function(hue, saturation, value) {
    var rgb = this.convertHSVtoRGB(hue, saturation, value);

    return "#" + this.DECtoHEX(Math.floor(rgb.r)) + 
                 this.DECtoHEX(Math.floor(rgb.g)) + 
                 this.DECtoHEX(Math.floor(rgb.b));
}



/** ****************************************************************************
 * Get a new colour for the arc
 ******************************************************************************/
Visualisation.prototype.getNewColour = function(sent) {
    // display sent emails always in the same colour
    if (sent) {
        var hex = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_COLOURS_SENT);
        
    } else {
        var receivedColours = THREADVIS.preferences.getPreference(
            THREADVIS.preferences.PREF_VIS_COLOURS_RECEIVED).split(",");

        this.lastColour = (this.lastColour + 1) % receivedColours.length;
        var hex = receivedColours[this.lastColour];
    }
    var hex = hex.substr(1);
    return this.convertRGBtoHSV(
        this.HEXtoDEC(hex.substr(0,2)),
        this.HEXtoDEC(hex.substr(2,2)),
        this.HEXtoDEC(hex.substr(4,2))
        );
    /*
    if (sent) {
        return {"hue" : 0, "value" : 100};
    }
    var hues = new Array(90,180,270,45,135,225,315,0,90,180,270,45,135,225,
        315,0,90,180,270,45,135,225,315,0,90,180,270,45,135,225,315);
    var values = new Array(100,100,100,60,60,60,60,60,60,60,60,100,
        100,100,100,80,80,80,80,40,40,40,40,40,40,40,40,80,80,80,80);

    this.lastColour = (this.lastColour + 1) % hues.length;

    return {"hue" : hues[this.lastColour], "value" : values[this.lastColour]};
    */
}



/** ****************************************************************************
 * Get resize multiplicator
 * calculate from box width and height
 * and needed width and height
 *******************************************************************************/
Visualisation.prototype.getResize = function(xCount, yCount, sizeX, sizeY) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO, 
            "Visualisation.getResize()", {"action" : "start",
            "xcount" : xCount, "ycount" : yCount, "sizex" : sizeX,
            "sizey" : sizeY});
    }

    var prefArcDifference = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_DIFFERENCE);
    var prefArcMinHeight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_MINHEIGHT);
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);

    var spacePerArcAvailableX = sizeX / xCount;
    var spacePerArcAvailableY = sizeY / 2;
    var spacePerArcNeededX = prefSpacing;
    var spacePerArcNeededY = (prefDotSize / 2) + prefArcMinHeight + 
        (yCount + 1) * prefArcDifference;

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

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.getResize()", {"action" : "end",
            "resize" : resize, "resizex" : resizeX,
            "resizey" : resizeY, "spaceperarcavailablex" : spacePerArcAvailableX,
            "spaceperarcavailabley" : spacePerArcAvailableY,
            "spaceperarcneededx" : spacePerArcNeededX,
            "spaceperarcneededy" : spacePerArcNeededY});
    }
    return resize;
}



/** ****************************************************************************
 * Move visualisation to show current message
 ******************************************************************************/
Visualisation.prototype.moveVisualisation = function(container) {
    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);
    var prefDefaultZoomHeight = parseFloat(THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_ZOOM_HEIGHT));

    // get current left margin
    if (THREADVIS.SVG) {
        var oldMargin = this.stack.transform.baseVal.getConsolidationMatrix().e;
    } else {
        var oldMargin = parseFloat(this.stack.style.marginLeft);
    }
    var newMargin = oldMargin;

    var originalWidth = this.box.boxObject.width;
    var originalHeight = this.box.boxObject.height;
    var height = originalHeight * this.zoom * prefDefaultZoomHeight;

    if (container.xPosition * this.resize + oldMargin > originalWidth) {
        // calculate necessary margin
        newMargin = - (container.xPosition * this.resize - originalWidth) 
            - (prefSpacing * this.resize);

        // if we already see the selected message, don't move any further
        if (newMargin > oldMargin) {
            newMargin = oldMargin;
        }
    }
    if (container.xPosition * this.resize + oldMargin < (prefSpacing / 2)
        * this.resize) {
        // calculate necessary margin
        newMargin = (- container.xPosition + (prefSpacing / 2))* this.resize;
    }

    if (THREADVIS.SVG) {
        this.moveVisualisationTo({x: newMargin});
    } else {
        //this.stack.style.marginLeft = newMargin + "px";
        this.moveVisualisationTo({x: newMargin});
    }
}



/** ****************************************************************************
 * Move visualisation by given delta
 ******************************************************************************/
Visualisation.prototype.moveVisualisationTo = function(position) {
    if (THREADVIS.SVG) {
        var matrix = this.stack.transform.baseVal.getConsolidationMatrix();
        var x = matrix.e;
        var y = matrix.f;
        if (position.x) {
            x = position.x;
        }
        if (position.y) {
            y = position.y;
        }
        this.stack.setAttribute("transform", "translate(" + x + "," + y + ")");
    } else {
        if (position.x) {
            this.stack.style.marginLeft = position.x + "px";
        }
        if (position.y) {
            this.stack.style.marginTop = position.y + "px";
        }
    }
}



/** ****************************************************************************
 * mouse click event handler
 * display message user clicked on
 ******************************************************************************/
Visualisation.prototype.onMouseClick = function(event) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPOMENT_VISUALISATION)) {
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
 * OnMouseDown event handler
 * on left mouse button down, remember mouse position and enable panning
 ******************************************************************************/
Visualisation.prototype.onMouseDown = function(event) {
    // only pan on left click
    if (event.button != 0) {
        return;
    }

    // remember box size now
    this.boxWidth = this.box.boxObject.width;
    this.boxHeight = this.box.boxObject.height;
    if (THREADVIS.SVG) {
        this.stackWidth = this.stack.getBBox().width;
        this.stackHeight = this.stack.getBBox().height;
    } else {
        this.stackWidth = this.stack.boxObject.width;
        this.stackHeight = this.stack.boxObject.height;
    }

    this.startX = event.clientX;
    this.startY = event.clientY;
    this.panning = true;

    // set mouse cursor
    this.box.style.cursor = "-moz-grabbing";
}



/** ****************************************************************************
 * OnMouseMove event handler
 * if panning is enabled, read new mouse position and move box accordingly
 ******************************************************************************/
Visualisation.prototype.onMouseMove = function(event) {
    if (this.panning) {
        var x = event.clientX;
        var y = event.clientY;
        var dx = x - this.startX;
        var dy = y - this.startY;
        if (THREADVIS.SVG) {
            var matrix = this.stack.transform.baseVal.getConsolidationMatrix();
            var currentX = matrix.e;
            var currentY = matrix.f;
        } else {
            var currentX = parseFloat(this.stack.style.marginLeft);
            var currentY = parseFloat(this.stack.style.marginTop);
        }
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

        // set mininum dx to a little less than available to prevent overpanning
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
        position.x = dx;
        position.y = dy;

        this.moveVisualisationTo(position);

        //this.scrollbar.init(this.box);
        this.scrollbar.draw();
    }
}



/** ****************************************************************************
 * OnMouseUp event handler
 * disable panning when mouse button is released
 ******************************************************************************/
Visualisation.prototype.onMouseUp = function(event) {
    this.panning = false;

    // reset mouse cursor
    this.box.style.cursor = "-moz-grab";
}



/** ****************************************************************************
 * OnScroll event handler
 * if mouse wheel is moved, zoom in and out of visualisation
 ******************************************************************************/
Visualisation.prototype.onScroll = function(event) {
    // event.detail gives number of lines to scroll
    // positive number means scroll down
    if (event.detail < 0){
        this.zoomIn();
    } else {
        this.zoomOut();
    }
}



/** ****************************************************************************
 * Reset stack
 * set all margins to zero
 ******************************************************************************/
Visualisation.prototype.resetStack = function() {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.resetStack()", {});
    }

    this.stack.style.marginLeft = "0px";
    this.stack.style.marginTop = "0px";
}



/** ****************************************************************************
 * If time scaling is enabled, we want to layout the messages so that their 
 * horizontal spacing is proportional to the time difference between 
 * those two messages
 ******************************************************************************/
Visualisation.prototype.timeScaling = function(containers, 
    minimalTimeDifference, width) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.timeScaling()", {"action" : "start",
            "containers" : containers.toString(),
            "minimaltimedifference" : minimalTimeDifference,
            "width" : width,
            "no. containers" : containers.length});
    }

    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);
    var prefTimescaling = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_TIMESCALING);

    // if we do not want to do timescaling, reset all scaling info to 1
    if (! prefTimescaling) {
        for (var counter = 0; counter < containers.length - 1; counter++) {
            var thisContainer = containers[counter];
            thisContainer.xScaled = 1;
        }
        return containers;
    }

    // we want to scale the messages horizontally according to their 
    // time difference
    // therefore we calculate the overall scale factor
    var totalTimeScale = 0;
    for (var counter = 0; counter < containers.length - 1; counter++) {
        var thisContainer = containers[counter];
        // we norm the scale factor to the minimal time
        // (this means, the two messages that are the nearest in time 
        // have a difference of 1)
        thisContainer.xScaled = thisContainer.timeDifference
            / minimalTimeDifference;
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
    // width / spacing would lead to 3, but in effect we can only
    // fit 2, since we want some spacing between the messages and the border
    var maxCountX = (width / prefSpacing) - 1;

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.timeScaling()",  {"action" : "first pass done",
            "totalTimeScale" : totalTimeScale,
            "maxCountX" : maxCountX});
    }

    // if the time scaling factor is bigger than what we can display, we have 
    // a problem
    // this means, we have to scale the timing factor down
    var scaling = 0.9;
    while (totalTimeScale > maxCountX) {
        totalTimeScale = 0;
        for (var counter = 0; counter < containers.length - 1; counter++) {
            var thisContainer = containers[counter];
            thisContainer.xScaled = thisContainer.xScaled * scaling;
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

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.timeScaling()",
            {"action" : "second pass done", 
            "totalTimeScale" : totalTimeScale});
    }

    return containers;
}



/** ****************************************************************************
 * Visualise a new thread
 ******************************************************************************/
Visualisation.prototype.visualise = function(container, force) {
    if (this.disabled) {
        return;
    }

    // set cursor
    this.box.style.cursor = "wait";

    // set background
    this.outerBox.style.backgroundColor = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_COLOURS_BACKGROUND);

    if (typeof force == "undefined") {
        // check to see parent force
        if (THREADVIS.threadvisParent) {
            force = THREADVIS.threadvisParent.visualisation.force;
        } else {
           force = false;
        }
    }
    this.force = force;

    if (container == null) {
        container = this.currentContainer;
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.visualise()", {"action" : "start",
            "container" : container.toString()});
    }

    var prefArcDifference = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_DIFFERENCE);
    var prefArcMinHeight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_MINHEIGHT);
    var prefArcWidth = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_WIDTH);
    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefDefaultZoomHeight = parseFloat(THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_ZOOM_HEIGHT));
    var prefDefaultZoomWidth = parseFloat(THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_ZOOM_WIDTH));
    var prefColour = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_COLOUR);
    var prefTimeline = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_TIMELINE);
    var prefOpacity = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_OPACITY) / 100;

    // check if we are still in the same thread as last time
    // check if visualisation parameters changed
    // if not, reset zoom level
    if (this.currentContainer &&
        container.getTopContainer() == this.currentContainer.getTopContainer()
        && ! this.changed) {
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
    if (count > 50 && ! this.force) {
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
    this.containers.sort(Container_sortFunction);

    // pre-calculate size
    var preSize = this.calculateSize(this.containers);
    this.containers = preSize.containers;
    // totalmaxheight counts the maximal number of stacked arcs
    var totalMaxHeight = preSize.totalMaxHeight;
    // minmaltimedifference stores the minimal time between two messages
    var minimalTimeDifference = preSize.minimalTimeDifference;

    var topHeight = prefDotSize / 2 + prefArcMinHeight
        + preSize.topHeight * prefArcDifference;
    var bottomHeight = prefDotSize / 2 + prefArcMinHeight
        + preSize.bottomHeight * prefArcDifference;

    // do time scaling
    var originalWidth = this.box.boxObject.width;
    var originalHeight = this.box.boxObject.height;

    var width = originalWidth * this.zoom * prefDefaultZoomWidth;
    var height = originalHeight * this.zoom * prefDefaultZoomHeight;

    this.containers = this.timeScaling(this.containers, 
        minimalTimeDifference, width);

    // do final resizing
    var x = prefSpacing / 2;
    this.resize = this.getResize(this.containers.length, totalMaxHeight,
        width, height);

    // pre-calculate colours for different authors
    this.authors = new Object();
    this.lastColour = -1;

    this.containerVisualisations = new Array();
    this.arcVisualisations = new Array();

    for (var counter = 0; counter < this.containers.length; counter++) {
        var thisContainer = this.containers[counter];

        var selected = thisContainer == container;
        var inThread = container.findParent(thisContainer)
            || thisContainer.findParent(container);
        var sent = ! thisContainer.isDummy() ?
            thisContainer.getMessage().isSent() : false;

        var colour = this.COLOUR_DUMMY;
        var opacity = 1;
        var hsv = {"hue" : 60, "saturation" : 6.8, "value" : 45.9};
        var tmpStart = (new Date()).getTime();
        if (! thisContainer.isDummy()) {
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
                    this.authors[thisContainer.getMessage().getFromEmail()].count = 
                        this.authors[thisContainer.getMessage()
                            .getFromEmail()].count + 1;
                } else {
                    hsv = this.getNewColour(sent);
                    this.authors[thisContainer.getMessage().getFromEmail()] =
                        {"hsv" : hsv,
                         "name" : thisContainer.getMessage().getFrom(),
                         "count" : 1};
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

        // at the moment, don't flash
        // note: dot only flashes if circle == true
        var flash = false;

        this.containerVisualisations[thisContainer] =
            this.drawDot(thisContainer, colour, x, topHeight, selected, 
                circle, flash, opacity);

        thisContainer.xPosition = x;

        // draw arc
        var parent = thisContainer.getParent()
        if (parent != null && ! parent.isRoot()) {
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
        x = x + (thisContainer.xScaled * prefSpacing);
    }

    // underline authors if enabled
    this.colourAuthors(this.authors);
    this.createLegend(this.authors);
    THREADVIS.displayLegend();

    // calculate if we have to move the visualisation so that the
    // selected message is visible
    this.moveVisualisation(container);

    // create a new box and overlay over all other elements to catch
    // all clicks and drags
    var popupBox = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");
    popupBox.style.width = "100%";
    popupBox.style.height = "100%";
    popupBox.setAttribute("context", "ThreadVisPopUp");
    this.stack.appendChild(popupBox);

    if (prefTimeline) {
        if (THREADVIS.SVG) {
            this.timeline = new TimelineSVG(this.stack, this.strings, this.containers,
                this.resize, prefDotSize, topHeight,
                prefArcMinHeight + prefDotSize - prefArcWidth - 2);
        } else {
            this.timeline = new Timeline(this.stack, this.strings, this.containers,
                this.resize, prefDotSize, topHeight,
                prefArcMinHeight + prefDotSize - prefArcWidth - 2);
        }
        this.timeline.draw();
    } else {
        this.timeline = null;
    }

    if (! this.scrollbar) {
        this.scrollbar = new Scrollbar(this, this.stack, this.box);
    }
    this.scrollbar.init(this.box);
    this.scrollbar.draw();

    this.changed = false;

    // check for resize of box
    this.boxHeight = this.box.boxObject.height;
    this.boxWidth = this.box.boxObject.width;
    var ref = this;
    clearInterval(this.checkResizeInterval);
    this.checkResizeInterval = setInterval(function() {ref.checkSize();}, 100);

    // set cursor
    this.box.style.cursor = "-moz-grab";
}



/** ****************************************************************************
 * Visualise an existing thread
 ******************************************************************************/
Visualisation.prototype.visualiseExisting = function(container) {
    var prefArcDifference = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_DIFFERENCE);
    var prefArcMinHeight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_MINHEIGHT);
    var prefArcWidth = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_WIDTH);
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);
    var prefDefaultZoomHeight = parseFloat(THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_ZOOM_HEIGHT));
    var prefDefaultZoomWidth = parseFloat(THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_ZOOM_WIDTH));
    var prefColour = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_COLOUR);
    var prefTimeline = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_TIMELINE);
    var prefOpacity = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_OPACITY) / 100;

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

    var topHeight = prefDotSize / 2 + prefArcMinHeight
        + preSize.topHeight * prefArcDifference;
    var bottomHeight = prefDotSize / 2 + prefArcMinHeight
        + preSize.bottomHeight * prefArcDifference;

    var originalWidth = this.box.boxObject.width;
    var originalHeight = this.box.boxObject.height;
    var width = originalWidth * this.zoom * prefDefaultZoomWidth;
    var height = originalHeight * this.zoom * prefDefaultZoomHeight;

    this.containers = this.timeScaling(this.containers, minimalTimeDifference,
        width);

    // do final resizing
    var x = prefSpacing / 2;
    this.resize = this.getResize(this.containers.length, totalMaxHeight,
        width, height);

    for (var counter = 0; counter < this.containers.length; counter++) {
        var thisContainer = this.containers[counter];

        var selected = thisContainer == container;
        var inThread = thisContainer.findParent(container)
            || container.findParent(thisContainer);
        var sent = ! thisContainer.isDummy() ?
            thisContainer.getMessage().isSent() : false;

        // only display black circle to highlight selected message
        // if we are using more than one colour
        var circle = prefColour == "single" ? false : true;

        // at the moment, don't flash
        // note: dot only flashes if circle == true
        var flash = false;

        // if thread has changed and we don't have all container visualisations
        if (this.containerVisualisations[thisContainer] == null) {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_WARNING,
                    "Visualisation.visualiseExisting()",
                    {"action" : "cached visualisation does not contain this message, redraw"});
            }
            // do a full redraw
            this.currentContainer = null;
            this.visualise(container);
            return;
        }

        var colour = this.COLOUR_DUMMY;
        var opacity = 1;
        var hsv = {"hue" : 60, "saturation" : 6.8, "value" : 45.9};
        if (! thisContainer.isDummy()) {
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
                    this.authors[thisContainer.getMessage().getFromEmail()] =
                        {"hsv" : hsv,
                         "name" : thisContainer.getMessage().getFrom(),
                         "count" : 1};
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
        this.containerVisualisations[thisContainer].redraw(this.resize,
            x, topHeight, selected, flash, colour, opacity);

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
        if (parent != null && ! parent.isRoot()) {
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

    if (prefTimeline && this.timeline) {
        this.timeline.redraw(this.resize, topHeight,
            prefArcMinHeight + prefDotSize - prefArcWidth - 2);
    }

    this.scrollbar.draw();

    // set cursor
    this.box.style.cursor = "-moz-grab";
}



/** ****************************************************************************
 * Zoom in and draw new visualisation
 ******************************************************************************/
Visualisation.prototype.zoomIn = function(amount) {
    if (! isFinite(amount) || amount == 0) {
        amount = 1;
    }

    this.zoom = this.zoom + 0.1 * amount;

    clearTimeout(this.zoomTimeout);
    var ref = this;
    this.zoomTimeout = setTimeout(function() {ref.visualise();}, 200);

    THREADVIS.logger.log("zoom", {"action" : "in", "zoomlevel" : this.zoom,
        "delta" : amount});
}



/** ****************************************************************************
 * Zoom out and draw new visualisation
 ******************************************************************************/
Visualisation.prototype.zoomOut = function(amount) {
    if (! isFinite(amount) || amount == 0) {
        amount = 1;
    }

    this.zoom = this.zoom - 0.1 * amount;
    if (this.zoom < 0.1) {
        this.zoom = 0.1;
    }

    clearTimeout(this.zoomTimeout);
    var ref = this;
    this.zoomTimeout = setTimeout(function() {ref.visualise();}, 200);

    THREADVIS.logger.log("zoom", {"action" : "out", 
        "zoomlevel" : this.zoom, "delta" : amount});
}



/** ****************************************************************************
 * Reset Zoom level
 ******************************************************************************/
Visualisation.prototype.zoomReset = function() {
    this.zoom = 1.0;
}



/** ****************************************************************************
 * Export to SVG
 ******************************************************************************/
Visualisation.prototype.exportToSVG = function(container, force) {
    if (typeof force == "undefined") {
        force = false;
    }
    this.force = force;

    if (container == null) {
        container = this.currentContainer;
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_VISUALISATION)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Visualisation.exportToSVG()", {"action" : "start",
            "container" : container.toString()});
    }

    var prefArcDifference = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_DIFFERENCE);
    var prefArcMinHeight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_MINHEIGHT);
    var prefArcWidth = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_ARC_WIDTH);
    var prefSpacing = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_SPACING);
    var prefDotSize = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_DOTSIZE);
    var prefDefaultZoomHeight = parseFloat(THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_ZOOM_HEIGHT));
    var prefDefaultZoomWidth = parseFloat(THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_ZOOM_WIDTH));
    var prefColour = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_COLOUR);
    var prefTimeline = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_TIMELINE);
    var prefOpacity = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_VIS_OPACITY) / 100;
    var prefWidth = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_SVG_WIDTH);
    var prefHeight = THREADVIS.preferences.getPreference(
        THREADVIS.preferences.PREF_SVG_HEIGHT);

    // get topmost container
    var topContainer = container.getTopContainer();

    // get all containers in thread as array
    var containers = new Array();
    containers.push(topContainer);
    containers = containers.concat(topContainer.getChildren());

    // sort containers by date
    containers.sort(Container_sortFunction);

    // pre-calculate size
    var preSize = this.calculateSize(this.containers);
    containers = preSize.containers;
    // totalmaxheight counts the maximal number of stacked arcs
    var totalMaxHeight = preSize.totalMaxHeight;
    // minmaltimedifference stores the minimal time between two messages
    var minimalTimeDifference = preSize.minimalTimeDifference;

    var topHeight = prefDotSize / 2 + prefArcMinHeight
        + preSize.topHeight * prefArcDifference;
    var bottomHeight = prefDotSize / 2 + prefArcMinHeight
        + preSize.bottomHeight * prefArcDifference;

    var width = prefWidth;
    var height = prefHeight;

    containers = this.timeScaling(containers, minimalTimeDifference, width);

    // do final resizing
    var x = prefSpacing / 2;
    var resize = this.getResize(containers.length, totalMaxHeight,
        width, height);

    // pre-calculate colours for different authors
    var authors = new Object();
    // remember last colour to reset
    var lastColour = this.lastColour;
    this.lastColour = -1;

    var svg = "<?xml version=\"1.0\" standalone=\"no\"?>"
        + "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">"
        + "<svg width=\"100%\" height=\"100%\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\">";

    for (var counter = 0; counter < containers.length; counter++) {
        var thisContainer = containers[counter];

        var selected = thisContainer == container;
        var inThread = container.findParent(thisContainer)
            || thisContainer.findParent(container);
        var sent = ! thisContainer.isDummy() ?
            thisContainer.getMessage().isSent() : false;

        var colour = this.COLOUR_DUMMY;
        var opacity = 1;
        var hsv = {"hue" : 60, "saturation" : 6.8, "value" : 45.9};
        var tmpStart = (new Date()).getTime();
        if (! thisContainer.isDummy()) {
            if (prefColour == "single") {
                if (selected) {
                    colour = this.COLOUR_SINGLE;
                } else {
                    colour = this.COLOUR_DUMMY;
                }
            } else {
                if (authors[thisContainer.getMessage().getFromEmail()] != null) {
                    hsv = authors[thisContainer.getMessage()
                        .getFromEmail()].hsv;
                } else {
                    hsv = this.getNewColour(sent);
                    authors[thisContainer.getMessage().getFromEmail()] =
                        {"hsv" : hsv};
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

        svg += this.drawDotSVG(thisContainer, colour, x, topHeight, selected,
                circle, false, opacity, resize, counter);

        thisContainer.xPosition = x;
        thisContainer.svgId = counter;

        // draw arc
        var parent = thisContainer.getParent()
        if (parent != null && ! parent.isRoot()) {
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
                parent.xPosition, x, topHeight, opacity, resize, counter);
        }
        x = x + (thisContainer.xScaled * prefSpacing);
    }

    this.lastColour = lastColour;
/*
    if (prefTimeline) {
        svg += new TimelineSVG(this.stack, this.strings, this.containers,
                this.resize, prefDotSize, topHeight,
                prefArcMinHeight + prefDotSize - prefArcWidth - 2).exportSVG();
    }
*/

    var script = "<script type='text/ecmascript'>"
        + "<![CDATA["
        + "var links=new Object();"
        + "function toggleElement(id,opacity){"
        + "var elem=document.getElementById('c_'+id);"
        + "if(elem){elem.setAttributeNS(null, 'opacity', opacity);}"
        + "elem=document.getElementById('p_'+id);"
        + "if(elem){elem.setAttributeNS(null, 'opacity', opacity);}}"
        + "function toggle(event,elem){"
        + "var item=links[elem.id.replace('c_', '')];"
        + "if(event.type=='mouseover'){"
        + "toggleRecursiveChildren(item,1);"
        + "toggleRecursiveParent(item,1);"
        + "displayTooltip(elem);}"
        + "else{toggleRecursiveChildren(item, 0.3);"
        + "toggleRecursiveParent(item, 0.3);"
        + "hideTooltip();}}"
        + "function toggleRecursiveChildren(item,opacity){"
        + "if(!item){return;}"
        + "toggleElement(item.id, opacity);"
        + "for(var i in item.children){"
        + "var childItem=links[item.children[i]];"
        + "if(childItem){"
        + "toggleRecursiveChildren(childItem, opacity);}}}"
        + "function toggleRecursiveParent(item,opacity){"
        + "if(!item){return;}"
        + "toggleElement(item.id,opacity);"
        + "toggleRecursiveParent(links[item.parent],opacity);}";
    for (var counter = 0; counter < containers.length; counter++) {
        var thisContainer = containers[counter];
        
        var scriptChildren = "";
        var tmpChildren = thisContainer.getChildren();
        if (tmpChildren) {
            for (var i in tmpChildren) {
                scriptChildren += "'" + tmpChildren[i].svgId + "',";
            }
            scriptChildren = scriptChildren.substring(0, scriptChildren.length - 1);
        }
        var parent = thisContainer.getParent();
        if (parent) {
            parent = parent.svgId;
        } else {
            parent = null;
        }
        var date = thisContainer.getDate();
        var author = "";
        if (! thisContainer.isDummy()) {
            author = thisContainer.getMessage().getFrom();
        }
        script += "links['" + thisContainer.svgId + "']={"
            + "id:'" + thisContainer.svgId + "',"
            + "children:[" + scriptChildren + "],"
            + "parent:'" + parent + "',"
            + "author:'" + author.replace(/\'/g, "") + "',"
            + "date:'" + date + "'};";
    }

    var tooltip = "<g id='tooltip' style='visibility: hidden;'>"
        + "<rect x='0' y='0' height='45' fill='white' opacity='0.75' stroke='#c6c6c6' stroke-width='1' id='background'></rect>"
        + "<text x='10' y='20' id='author'></text>"
        + "<text x='10' y='40' id='date'></text>"
        + "</g>";
    script += "function displayTooltip(elem){"
        + "var item=links[elem.id.replace('c_','')];"
        + "var tooltip=document.getElementById('tooltip');"
        + "var authorElement=document.getElementById('author');"
        + "var dateElement=document.getElementById('date');"
        + "authorElement.appendChild(document.createTextNode(item.author));"
        + "dateElement.appendChild(document.createTextNode(item.date));"
        + "tooltip.style.visibility='visible';"
        + "var x=elem.cx.baseVal.value+10;"
        + "var y=elem.cy.baseVal.value+10;"
        + "tooltip.setAttributeNS(null,'transform','translate('+x+','+y+')');"
        + "var authorLength=authorElement.getComputedTextLength();"
        + "var dateLength=dateElement.getComputedTextLength();"
        + "var width=authorLength;"
        + "if(dateLength>width){"
        + "width=dateLength;"
        + "}"
        + "width+=20;"
        + "var rect=document.getElementById('background');"
        + "rect.setAttributeNS(null,'width',width);"
        + "}"
        + "function hideTooltip(){"
        + "var tooltip=document.getElementById('tooltip');"
        + "tooltip.style.visibility='hidden';"
        + "clearElement('date');"
        + "clearElement('author');"
        + "}"
        + "function clearElement(elem){"
        + "var elem=document.getElementById(elem);"
        + "var child=elem.firstChild;"
        + "while(child){"
        + "elem.removeChild(child);"
        + "child=elem.firstChild;"
        + "}"
        + "}";

    script += "]]></script>";

    svg += tooltip;
    svg += script;
    svg += "</svg>";

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"]
        .createInstance(nsIFilePicker);
    fp.init(window, "Select a File", nsIFilePicker.modeSave);
    fp.appendFilter("SVG Files","*.svg");

    var res = fp.show();
    if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace){
        var file = fp.file;
        var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Components.interfaces.nsIFileOutputStream);

        // use 0x02 | 0x10 to open file for appending.
        foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
        foStream.write(svg, svg.length);
        foStream.close();
    }
}
