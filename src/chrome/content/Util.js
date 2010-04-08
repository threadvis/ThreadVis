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
 * Various utility classes
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /***************************************************************************
     * General utility class
     * 
     * @return An empty object
     **************************************************************************/
    ThreadVis.Util = {}

    /***************************************************************************
     * Format remaining time to process array
     * 
     * @param remaining
     *            The remaining time in milliseconds
     * @return A formatted string
     **************************************************************************/
    ThreadVis.Util.formatTimeRemaining = function(remaining) {
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

        var strings = ThreadVis.strings;

        var label = "";
        if (years == 1) {
            label += years + " "
                    + strings.getString("visualisation.timedifference.year");
        }
        if (years > 1) {
            label += years + " "
                    + strings.getString("visualisation.timedifference.years");
        }
        if (days == 1) {
            label += " " + days + " "
                    + strings.getString("visualisation.timedifference.day");
        }
        if (days > 1) {
            label += " " + days + " "
                    + strings.getString("visualisation.timedifference.days");
        }
        if (hours == 1) {
            label += " " + hours + " "
                    + strings.getString("visualisation.timedifference.hour");
        }
        if (hours > 1) {
            label += " " + hours + " "
                    + strings.getString("visualisation.timedifference.hours");
        }
        if (minutes == 1) {
            label += " " + minutes + " "
                    + strings.getString("visualisation.timedifference.minute");
        }
        if (minutes > 1) {
            label += " " + minutes + " "
                    + strings.getString("visualisation.timedifference.minutes");
        }
        if (seconds == 1) {
            label += " " + seconds + " "
                    + strings.getString("visualisation.timedifference.second");
        }
        if (seconds > 1) {
            label += " " + seconds + " "
                    + strings.getString("visualisation.timedifference.seconds");
        }

        return label;
    }

    return ThreadVis;
}(ThreadVis || {}));
