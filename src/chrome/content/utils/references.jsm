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
 * Split message ids in header field "references" and return all referenced message ids in an array.
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "References" ];

const References = {
    /**
     * Build references array
     * 
     * @param references - The references string
     * @return {Array} - an array of all referenced mssage ids
     */
    get(references) {
        if (references != null && references != "") {
            const result = references.match(/[^<>\s]+/g);

            const dupes = {};
            const distinct = [];

            // result can be null if no matches have been found
            if (result) {
                for (let i = result.length - 1; i >= 0; i--) {
                    // TODO
                    // email from user: some mail servers seem to change the message id after the @ sign
                    // add switch to ignore mail host after @ (setting in preferences)
                    const msgid = result[i];
                    if (dupes[msgid]) {
                        continue;
                    }
                    dupes[msgid] = msgid;
                    distinct.push(msgid);
                }
            }
            distinct.reverse();
            return distinct;
        } else {
            return [];
        }
    }
};