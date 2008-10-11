/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2008 Alexander C. Hubmann-Haidvogel
 *
 * Various utility classes
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * General utility class
 *
 * @return
 *          An empty object
 ******************************************************************************/
ThreadVisNS.Util = {
}



/** ****************************************************************************
 * Utility class that provides background processing
 *
 * @return
 *          A new processor object
 ******************************************************************************/
ThreadVisNS.Util.Processor = function() {
    this.listener = null;
    this.count = 0;
    this.startTime = 0;
    this.list = [];
    this.cancelled = false;
}



/** ****************************************************************************
 * Register listener
 *
 * @param listener
 *          The listener to call on events.
 *          Must have an "onItem" and an "onFinished" method.
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Util.Processor.prototype.registerListener = function(listener) {
    this.listener = listener;
}



/** ****************************************************************************
 * Set the list to process
 *
 * @param list
 *          The array of items to process
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Util.Processor.prototype.setList = function(list) {
    this.list = list;
}



/** ****************************************************************************
 * Start processing
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Util.Processor.prototype.start = function() {
    this.cancelled = false;
    this.startTime = (new Date()).getTime();
    this.process();
}



/** ****************************************************************************
 * Cancel processing
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Util.Processor.prototype.cancel = function() {
    this.cancelled = true;
}



/** ****************************************************************************
 * Process an array of elements. Call "onItem", wait for callback and continue.
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Util.Processor.prototype.process = function() {
    if (this.cancelled) {
        return;
    }
    var currentTime = (new Date()).getTime();
    var elem = this.list.shift();
    var remaining = this.list.length;
    var timeRemaining = ((currentTime - this.startTime) / this.count) * remaining;
    if (elem) {
        this.count++;
        var ref = this;
        this.listener.onItem(elem, this.count, remaining,
            ThreadVisNS.Util.formatTimeRemaining(timeRemaining), function() {
                setTimeout(function() {
                    ref.process();
                }, 0);
            });
        elem = null;
        delete elem;
        var ref = this;
    } else {
        this.list = null;
        delete this.list;
        this.listener.onFinished(this.count);
    }
}



/** ****************************************************************************
 * Notifier utility class
 *
 * @param list
 *          The array of items
 * @param listener
 *          The listener to notify
 * @return
 *          A new notifier object
 ******************************************************************************/
ThreadVisNS.NotifyUtility = function(list, listener) {
    this.listener = listener;
    this.list = list;
}



/** ****************************************************************************
 * Start processing the list, notify item and wait for callback
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.NotifyUtility.prototype.start = function() {
    if (! this.list || this.list.length == 0) {
        this.finished();
    }
    // get first object from list
    var o = this.list.pop();
    var ref = this;
    if (o) {
        o.notify(function(data) {
            ref.end(data);
        });
    }
}



/** ****************************************************************************
 * Process callback after notification finished
 *
 * @param data
 *          The data returned from the notification
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.NotifyUtility.prototype.end = function(data) {
    this.listener.onData(data);
    this.start();
}



/** ****************************************************************************
 * Finished processing the list
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.NotifyUtility.prototype.finished = function() {
    this.listener.onFinished();
}



/** ****************************************************************************
 * Format remaining time to process array
 *
 * @param remaining
 *          The remaining time in milliseconds
 * @return
 *          A formatted string
 ******************************************************************************/
ThreadVisNS.Util.formatTimeRemaining = function(remaining) {
    // remaining is in miliseconds
    remaining = remaining - (remaining % 1000);
    remaining = remaining / 1000;
    var seconds = remaining % 60;
    remaining = remaining - seconds;
    remaining = remaining / 60;
    var minutes = remaining % 60;
    remaining = remaining - minutes;
    remaining = remaining / 60;
    var hours = remaining % 24;
    remaining = remaining - hours;
    remaining = remaining / 24;
    var days = remaining % 365;
    remaining = remaining - days;
    remaining = remaining / 365;
    var years = remaining;

    var strings = THREADVIS.strings;

    var label = "";
    if (years == 1) {
        label += years + " " +
            strings.getString("visualisation.timedifference.year");
    }
    if (years > 1) {
        label += years + " " +
            strings.getString("visualisation.timedifference.years");
    }
    if (days == 1) {
        label += " " + days + " " +
            strings.getString("visualisation.timedifference.day");
    }
    if (days > 1) {
        label += " " + days + " " +
            strings.getString("visualisation.timedifference.days");
    }
    if (hours == 1) {
        label += " " + hours + " " +
            strings.getString("visualisation.timedifference.hour");
    }
    if (hours > 1) {
        label += " " + hours + " " +
            strings.getString("visualisation.timedifference.hours");
    }
    if (minutes == 1) {
        label += " " + minutes + " " +
            strings.getString("visualisation.timedifference.minute");
    }
    if (minutes > 1) {
        label += " " + minutes + " " +
            strings.getString("visualisation.timedifference.minutes");
    }
    if (seconds == 1) {
        label += " " + seconds + " " +
            strings.getString("visualisation.timedifference.second");
    }
    if (seconds > 1) {
        label += " " + seconds + " " +
            strings.getString("visualisation.timedifference.seconds");
    }

    return label;
}
