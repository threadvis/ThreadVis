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
 * Wrapper for references headers in email. Split message ids in header and
 * return all referenced message ids in an array.
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /***************************************************************************
     * Constructor
     * 
     * @param references
     *            The "References" header
     **************************************************************************/
    ThreadVis.References = function(references) {
        // Store message ids of references
        this.references = [];

        this.buildReferences(references);
    }

    /***************************************************************************
     * Build references array
     * 
     * @param references
     *            The references string
     **************************************************************************/
    ThreadVis.References.prototype.buildReferences = function(references) {
        if (references != null && references != "") {
            var result = references.match(/[^<>\s]+/g);

            var dupes = new Object();
            var distinct = new Array();

            // result can be null if no matches have been found
            if (result) {
                for ( var i = result.length - 1; i >= 0; i--) {
                    // TODO
                    // email from user: some mail servers seem to change the
                    // message id after the @ sign
                    // add switch to ignore mail host after @ (setting in
                    // preferences)
                    var msgid = result[i];
                    if (dupes[msgid]) {
                        continue;
                    }
                    dupes[msgid] = msgid;
                    distinct.push(msgid);
                }
            }
            distinct.reverse();
            this.references = distinct;
        }
    }

    /***************************************************************************
     * Get references array. Return all references of the message as an array.
     * 
     * @return An array of all referenced message ids
     **************************************************************************/
    ThreadVis.References.prototype.getReferences = function() {
        return this.references;
    }

    /***************************************************************************
     * Get string representation of object
     * 
     * @return A string containing all referenced message ids
     **************************************************************************/
    ThreadVis.References.prototype.toString = function() {
        var string = "";
        for (referenceskey in this.references) {
            string += ", " + this.references[referenceskey];
        }
        return string;
    }

    return ThreadVis;
}(ThreadVis || {}));
