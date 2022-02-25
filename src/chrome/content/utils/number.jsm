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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022 Alexander C. Hubmann-Haidvogel
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
 * Number utilities
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "DECtoHEX", "HEXtoDEC" ] ;

/**
 * Get hexadecimal representation of a decimal number
 * 
 * @param dec The decimal value of the number
 * @return The hexadecimal string representing the colour
 */
const DECtoHEX = (dec) => {
    let alpha = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F" ];
    let n_ = Math.floor(dec / 16);
    let _n = dec - n_ * 16;
    return alpha[n_] + alpha[_n];
};

/**
 * Get decimal representation of a hexadecimal number
 * 
 * @param hex The hexadecimal value of the number
 * @return The decimal value of the number
 */
const HEXtoDEC = (hex) => parseInt(hex, 16);