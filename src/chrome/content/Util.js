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

    /***************************************************************************
     * Convert a RGB colour to a HSV colour
     * 
     * @param r
     *            The red value
     * @param g
     *            The green value
     * @param b
     *            The blue value
     * @return The same colour in HSV colour model object.hue The hue of the
     *         colour object.saturation The saturation of the colour
     *         object.value The value of the colour
     **************************************************************************/
    ThreadVis.Util.convertRGBtoHSV = function(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;
        var h = 0;
        var s = 0;
        var v = 0;

        var minVal = Math.min(r, g, b);
        var maxVal = Math.max(r, g, b);
        var delta = maxVal - minVal;

        v = maxVal;

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
        return {
            "hue" : h * 360,
            "saturation" : s * 100,
            "value" : v * 100
        };
    }

    /***************************************************************************
     * Convert a HSV colour to a RGB colour
     * 
     * @param hue
     *            The "hue" value of the colour
     * @param saturation
     *            The "saturation" value of the colour
     * @param value
     *            The "value" value of the colour
     * @return The same colour in RGB colour model object.r Red component
     *         [0..255] object.g Green component [0..255] object.b Blue
     *         component [0..255]
     **************************************************************************/
    ThreadVis.Util.convertHSVtoRGB = function(hue, saturation, value) {
        var h = hue / 360;
        var s = saturation / 100;
        var v = value / 100;

        var r = 0;
        var g = 0;
        var b = 0;

        if (s == 0) {
            r = v;
            g = v;
            b = v;
        } else {
            var varH = h * 6;
            var varI = Math.floor(varH);
            var var1 = v * (1 - s);
            var var2 = v * (1 - s * (varH - varI));
            var var3 = v * (1 - s * (1 - (varH - varI)));

            switch (varI) {
                case 0:
                    r = v;
                    g = var3;
                    b = var1;
                    break;
                case 1:
                    r = var2;
                    g = v;
                    b = var1;
                    break;
                case 2:
                    r = var1;
                    g = v;
                    b = var3;
                    break;
                case 3:
                    r = var1;
                    g = var2;
                    b = v;
                    break;
                case 4:
                    r = var3;
                    g = var1;
                    b = v;
                    break;
                default:
                    r = v;
                    g = var1;
                    b = var2;
            }
            return {
                "r" : r * 255,
                "g" : g * 255,
                "b" : b * 255
            };
        }
    }

    /***************************************************************************
     * Get hexadecimal representation of a decimal number
     * 
     * @param dec
     *            The decimal value of the number
     * @return The hexadecimal string representing the colour
     **************************************************************************/
    ThreadVis.Util.DECtoHEX = function(dec) {
        var alpha = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A",
                "B", "C", "D", "E", "F" ];
        var n_ = Math.floor(dec / 16)
        var _n = dec - n_ * 16;
        return alpha[n_] + alpha[_n];
    }

    /***************************************************************************
     * Get decimal representation of a hexadecimal number
     * 
     * @param hex
     *            The hexadecimal value of the number
     * @return The decimal value of the number
     **************************************************************************/
    ThreadVis.Util.HEXtoDEC = function(hex) {
        return parseInt(hex, 16);
    }

    return ThreadVis;
}(ThreadVis || {}));
