/** ****************************************************************************
 * TimelineSVG.js
 *
 * (c) 2006-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * $Id: TimelineSVG.js 378 2007-06-09 14:27:00Z sascha $
 ******************************************************************************/



/** ****************************************************************************
 * Constructor for timeline class
 ******************************************************************************/
function TimelineSVG(stack, strings, containers, resize, dotSize, top, topDelta) {
    /**
     * XUL stack to draw timeline on
     */
    this.stack = stack;

    /**
     * XUL stringbundle to get localised strings
     */
    this.strings = strings;

    /**
     * containers of current thread
     */
    this.containers = containers;

    /**
     * resize multiplicator
     */
    this.resize = resize;

    /**
     * size of messages in px
     */
    this.dotSize = dotSize;

    /**
     * top position of center of visualisation in px
     */
    this.top = top;

    /**
     * delta of timeline (moved to top by delta)
     */
    this.topDelta = topDelta;

    this.times = new Object();
}



/** ****************************************************************************
 * Draw the timeline
 ******************************************************************************/
TimelineSVG.prototype.draw = function() {
    // start with second container
    for (var i = 1; i < this.containers.length; i++) {
        // look at two adjacent containers
        var first = this.containers[i - 1];
        var second = this.containers[i];

        // don't calculate time if one of them is a dummy
        if (first.isDummy() || second.isDummy()) {
            continue;
        }

        var timeDifference = first.timeDifference;

        // get the formatted strings
        var formatted = this.formatTime(timeDifference);

        // draw the labels and tooltips
        this.drawTime(first, first.xPosition, second.xPosition,
            formatted.string, formatted.toolTip);
    }
}



/** ****************************************************************************
 * Draw the label and the tooltip
 ******************************************************************************/
TimelineSVG.prototype.drawTime = function(container, left, right, string,
    toolTip) {
    // check to see if we already created the label and the tooltip
    var elem = null;
    var newElem = false;
    if (this.times[container]) {
        elem = this.times[container];
    } else {
        elem = document.createElementNS(THREADVIS.SVG_NAMESPACE, "text");
        var text = document.createTextNode(string);
        elem.appendChild(text);
        newElem = true;
        this.times[container] = elem;
    }

    // calculate style
    var fontSize = 9;
    var top = (this.top - this.topDelta + fontSize) * this.resize ;
    var left = (left + ((right - left) / 2)) * this.resize;

    // set style
    elem.setAttribute("x", left);
    elem.setAttribute("y", top);
    elem.setAttribute("font-size", fontSize + "px");
    elem.setAttribute("text-anchor", "middle");

//    elem.setAttribute("tooltiptext", toolTip);

    // and add to stack only if we just created the element
    if (newElem) {
        this.stack.appendChild(elem);

        // prevent mousedown event from bubbling to box object
        // prevent dragging of visualisation by clicking on message
        elem.addEventListener("mousedown",
            function(event) { event.stopPropagation(); }, true);
    }

    // hide if not enough space
    if (((right - left) * this.resize < 15) ||
        (this.topDelta * this.resize < 9)) {
        elem.setAttribute("visibility", "hidden");
    } else {
        elem.setAttribute("visibility", "visible");
    }
}



/** ****************************************************************************
 * Format the time difference for the label and the tooltip
 ******************************************************************************/
TimelineSVG.prototype.formatTime = function(timeDifference) {
    // timedifference is in miliseconds
    timeDifference = timeDifference - (timeDifference % 1000);
    timeDifference = timeDifference / 1000;
    var seconds = timeDifference % 60;
    timeDifference = timeDifference - seconds;
    timeDifference = timeDifference / 60;
    var minutes = timeDifference % 60;
    timeDifference = timeDifference - minutes;
    timeDifference = timeDifference / 60;
    var hours = timeDifference % 24;
    timeDifference = timeDifference - hours;
    timeDifference = timeDifference / 24;
    var days = timeDifference % 365;
    timeDifference = timeDifference - days;
    timeDifference = timeDifference / 365;
    var years = timeDifference;

    var string = "";
    var toolTip = "";

    // label
    // only display years if >= 1
    if (years >= 1) {
        string = years +
            this.strings.getString("visualisation.timedifference.years.short");
    // only display days if >= 1
    } else if (days >= 1) {
        string = days +
            this.strings.getString("visualisation.timedifference.days.short");
    // display hours if >= 1
     } else if (hours >= 1) {
        string = hours +
            this.strings.getString("visualisation.timedifference.hours.short");
    // display minutes otherwise
     } else {
        string = minutes + this.strings
            .getString("visualisation.timedifference.minutes.short");
    }

    // tooltip
    if (years == 1) {
        toolTip = years + " " +
            this.strings.getString("visualisation.timedifference.year");
    }
    if (years > 1) {
        toolTip = years + " " +
            this.strings.getString("visualisation.timedifference.years");
    }
    if (days == 1) {
        toolTip += " " + days + " " +
            this.strings.getString("visualisation.timedifference.day");
    }
    if (days > 1) {
        toolTip += " " + days + " " +
            this.strings.getString("visualisation.timedifference.days");
    }
    if (hours == 1) {
        toolTip += " " + hours + " " +
            this.strings.getString("visualisation.timedifference.hour");
    }
    if (hours > 1) {
        toolTip += " " + hours + " " +
            this.strings.getString("visualisation.timedifference.hours");
    }
    if (minutes == 1) {
        toolTip += " " + minutes + " " +
            this.strings.getString("visualisation.timedifference.minute");
    }
    if (minutes > 1) {
        toolTip += " " + minutes + " " +
            this.strings.getString("visualisation.timedifference.minutes");
    }

    var returnObject = new Object();
    returnObject.string = string;
    returnObject.toolTip = toolTip;

    return returnObject;
}



/** ****************************************************************************
 * Re-Draw the timeline
 ******************************************************************************/
TimelineSVG.prototype.redraw = function(resize, vertical) {
    this.resize = resize;
    this.vertical = vertical;
    this.draw();
}
