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
 * Various utility classes
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "Util"] ;

const { Strings } = ChromeUtils.import("chrome://threadvis/content/strings.js");

/**
 * General utility class
 */
const Util = {

    /**
     * Built-in date formatter service
     */
    _dateFormatter: new Intl.DateTimeFormat(undefined, {
            "year": "2-digit",
            "month": "2-digit",
            "day": "2-digit",
            "hour": "2-digit",
            "minute": "2-digit"
        }),

    /**
     * Convert a RGB colour to a HSV colour
     * 
     * @param r
     *            The red value
     * @param g
     *            The green value
     * @param b
     *            The blue value
     * @return The same colour in HSV colour model
     *            object.hue The hue of the colour
     *            object.saturation The saturation of the colour
     *            object.value The value of the colour
     */
    convertRGBtoHSV(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;
        let h = 0;
        let s = 0;
        let v = 0;

        let minVal = Math.min(r, g, b);
        let maxVal = Math.max(r, g, b);
        let delta = maxVal - minVal;

        v = maxVal;

        if (delta != 0) {
            s = delta / maxVal;
            let del_R = (((maxVal - r) / 6) + (delta / 2)) / delta;
            let del_G = (((maxVal - g) / 6) + (delta / 2)) / delta;
            let del_B = (((maxVal - b) / 6) + (delta / 2)) / delta;

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
    },

    /**
     * Convert a HSV colour to a RGB colour
     * 
     * @param hue
     *            The "hue" value of the colour
     * @param saturation
     *            The "saturation" value of the colour
     * @param value
     *            The "value" value of the colour
     * @return The same colour in RGB colour model
     *             object.r Red component [0..255]
     *             object.g Green component [0..255]
     *             object.b Blue component [0..255]
     */
    convertHSVtoRGB(hue, saturation, value) {
        let h = hue / 360;
        let s = saturation / 100;
        let v = value / 100;

        let r = 0;
        let g = 0;
        let b = 0;

        if (s != 0) {
            let varH = h * 6;
            let varI = Math.floor(varH);
            let var1 = v * (1 - s);
            let var2 = v * (1 - s * (varH - varI));
            let var3 = v * (1 - s * (1 - (varH - varI)));

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
    },

    /**
     * Get hexadecimal representation of a decimal number
     * 
     * @param dec
     *            The decimal value of the number
     * @return The hexadecimal string representing the colour
     */
    DECtoHEX(dec) {
        let alpha = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F" ];
        let n_ = Math.floor(dec / 16);
        let _n = dec - n_ * 16;
        return alpha[n_] + alpha[_n];
    },

    /**
     * Get decimal representation of a hexadecimal number
     * 
     * @param hex
     *            The hexadecimal value of the number
     * @return The decimal value of the number
     */
    HEXtoDEC(hex) {
        return parseInt(hex, 16);
    },

    /**
     * Format the time difference for the label and the tooltip
     * 
     * @param timeDifference
     *            The time difference to display
     * @return {Object} The formatted time difference for label and tooltip
     */
    formatTimeDifference(timeDifference) {
        // timedifference is in miliseconds
        timeDifference = timeDifference - (timeDifference % 1000);
        timeDifference = timeDifference / 1000;
        let seconds = timeDifference % 60;
        timeDifference = timeDifference - seconds;
        timeDifference = timeDifference / 60;
        let minutes = timeDifference % 60;
        timeDifference = timeDifference - minutes;
        timeDifference = timeDifference / 60;
        let hours = timeDifference % 24;
        timeDifference = timeDifference - hours;
        timeDifference = timeDifference / 24;
        let days = timeDifference % 365;
        timeDifference = timeDifference - days;
        timeDifference = timeDifference / 365;
        let years = timeDifference;

        let string = "";
        let toolTip = "";

        // label
        // only display years if >= 1
        if (years >= 1) {
            string = (years + (Math.round((days / 365) * 10) / 10))
                    + Strings.getString("visualisation.timedifference.years.short");
            // only display days if >= 1
        } else if (days >= 1) {
            string = Math.round(days + hours / 24)
                    + Strings.getString("visualisation.timedifference.days.short");
            // display hours if >= 1
        } else if (hours >= 1) {
            string = Math.round(hours + minutes / 60) + Strings.getString("visualisation.timedifference.hours.short");
            // display minutes otherwise
        } else {
            string = minutes + Strings.getString("visualisation.timedifference.minutes.short");
        }

        // tooltip
        if (years === 1) {
            toolTip = years + " " + Strings.getString("visualisation.timedifference.year");
        }
        if (years > 1) {
            toolTip = years + " " + Strings.getString("visualisation.timedifference.years");
        }
        if (days === 1) {
            toolTip += " " + days + " " + Strings.getString("visualisation.timedifference.day");
        }
        if (days > 1) {
            toolTip += " " + days + " " + Strings.getString("visualisation.timedifference.days");
        }
        if (hours === 1) {
            toolTip += " " + hours + " " + Strings.getString("visualisation.timedifference.hour");
        }
        if (hours > 1) {
            toolTip += " " + hours + " " + Strings.getString("visualisation.timedifference.hours");
        }
        if (minutes === 1) {
            toolTip += " " + minutes + " " + Strings.getString("visualisation.timedifference.minute");
        }
        if (minutes > 1) {
            toolTip += " " + minutes + " " + Strings.getString("visualisation.timedifference.minutes");
        }

        return {
            "string": string,
            "toolTip": toolTip
        };
    },

    /**
     * Format a datetime
     * 
     * @param date
     *            The date
     * @return The formatted date
     */
    formatDate(date) {
        return this._dateFormatter.format(date);
    }
};