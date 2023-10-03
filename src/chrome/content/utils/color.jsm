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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023 Alexander C. Hubmann-Haidvogel
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
 * Color utilities
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "convertRGBtoHSV", "convertHSVtoRGB" ];

/**
 * Convert a RGB colour to a HSV colour
 *
 * @param {Integer} red - The red value [0..255]
 * @param {Integer} green - The green value [0..255]
 * @param {Integer} blue - The blue value [0..255]
 * @return {Object} - The same colour in HSV colour model
 *            object.hue - The hue of the colour [0..360]
 *            object.saturation - The saturation of the colour [0..100]
 *            object.value - The value of the colour [0..100]
 */
const convertRGBtoHSV = (red, green, blue)  => {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;

    let h = 0;
    let s = 0;
    let v = 0;

    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    const delta = maxVal - minVal;

    v = maxVal;

    if (delta != 0) {
        s = delta / maxVal;
        const delR = (((maxVal - r) / 6) + (delta / 2)) / delta;
        const delG = (((maxVal - g) / 6) + (delta / 2)) / delta;
        const delB = (((maxVal - b) / 6) + (delta / 2)) / delta;

        if (r == maxVal) {
            h = delB - delG;
        } else if (g == maxVal) {
            h = (1 / 3) + delR - delB;
        } else if (b == maxVal) {
            h = (2 / 3) + delG - delR;
        }

        if (h < 0) {
            h += 1;
        }
        if (h > 1) {
            h -= 1;
        }
    }
    return {
        hue: h * 360,
        saturation: s * 100,
        value: v * 100
    };
};

/**
 * Convert a HSV colour to a RGB colour
 * 
 * @param {Integer} hue - The "hue" value of the colour [0..360]
 * @param {Integer} saturation - The "saturation" value of the colour [0..100]
 * @param {Integer} value - The "value" value of the colour [0..100]
 * @return {Object} - The same colour in RGB colour model
 *             object.r - Red component [0..255]
 *             object.g - Green component [0..255]
 *             object.b - Blue component [0..255]
 */
const convertHSVtoRGB = (hue, saturation, value) => {
    const h = hue / 360;
    const s = saturation / 100;
    const v = value / 100;

    let r = 0;
    let g = 0;
    let b = 0;

    if (s != 0) {
        const varH = h * 6;
        const varI = Math.floor(varH);
        const var1 = v * (1 - s);
        const var2 = v * (1 - s * (varH - varI));
        const var3 = v * (1 - s * (1 - (varH - varI)));

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
            r: r * 255,
            g: g * 255,
            b: b * 255
        };
    }
};