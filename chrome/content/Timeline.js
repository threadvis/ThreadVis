/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2006-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Draw the timeline.
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor for timeline class
 *
 * @param stack
 *          The stack to draw the timeline on
 * @param strings
 *          The localised strings
 * @param containers
 *          An array of all containers
 * @param resize
 *          The resize parameter [0..1]
 * @param dotSize
 *          The size of a dot
 * @param top
 *          The top position of the timeline
 * @param topDelta
 *          The delta position of the timeline
 * @return
 *          A new timeline object
 ******************************************************************************/
ThreadVisNS.Timeline = function(stack, strings, containers, resize, dotSize,
    top, topDelta) {
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
 *
 * @return void
 ******************************************************************************/
ThreadVisNS.Timeline.prototype.draw = function() {
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
 *
 * @param container
 *          The container to draw
 * @param left
 *          The left position
 * @param right
 *          The right position
 * @param string
 *          The string to display
 * @param toolTip
 *          The tooltip to add
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Timeline.prototype.drawTime = function(container, left, right,
    string, toolTip) {
    // check to see if we already created the label and the tooltip
    var elem = null;
    var newElem = false;
    if (this.times[container]) {
        elem = this.times[container];
    } else {
        elem = document.createElementNS(THREADVIS.XUL_NAMESPACE, "description");
        newElem = true;
        this.times[container] = elem;
    }

    // calculate style
    var styleBorderBottom = "";
    var styleBorderLeft = "";
    var styleBorderRight = "";
    var styleBorderTop = "";
    var styleFontSize = "9px";
    var styleLeft = ((left - this.dotSize / 2)* this.resize) + "px";
    var styleTop = (this.top - this.topDelta) * this.resize + "px";
    var styleWidth = ((right - left) * this.resize) + "px";

    // set style
    elem.style.borderBottom = styleBorderBottom;
    elem.style.borderLeft = styleBorderLeft;
    elem.style.borderRight = styleBorderRight;
    elem.style.borderTop = styleBorderTop;
    elem.style.fontSize = styleFontSize;
    elem.style.left = styleLeft;
    elem.style.position = "relative";
    elem.style.textAlign = "center";
    elem.style.top = styleTop;
    elem.style.width = styleWidth;
    elem.style.zIndex = "1";
    //elem.style.cursor = "move";

    elem.setAttribute("value", string);
    elem.setAttribute("tooltiptext", toolTip);

    // and add to stack only if we just created the element
    if (newElem) {
        this.stack.appendChild(elem);

        // prevent mousedown event from bubbling to box object
        // prevent dragging of visualisation by clicking on message
        elem.addEventListener("mousedown",
            function(event) { event.stopPropagation(); }, true);
    }

    // hide if not enough space
    if (((right - left) * this.resize < 20) ||
        (this.topDelta * this.resize < 9)) {
        elem.hidden = true;
    } else {
        elem.hidden = false;
    }
}



/** ****************************************************************************
 * Format the time difference for the label and the tooltip
 *
 * @param timeDifference
 *          The time difference to display
 ******************************************************************************/
ThreadVisNS.Timeline.prototype.formatTime = function(timeDifference) {
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
        string = (years + (Math.round((days / 365) * 10) / 10)) +
            this.strings.getString("visualisation.timedifference.years.short");
    // only display days if >= 1
    } else if (days >= 1) {
        string = Math.round(days + hours / 24) + 
            this.strings.getString("visualisation.timedifference.days.short");
    // display hours if >= 1
     } else if (hours >= 1) {
        string = Math.round(hours + minutes / 60) +
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
 *
 * @param resize
 *          The resize parameter
 * @param top
 *          The top position
 ******************************************************************************/
ThreadVisNS.Timeline.prototype.redraw = function(resize, top) {
    this.resize = resize;
    this.top = top;
    this.draw();
}
