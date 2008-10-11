/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2005-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Wrapper for references headers in email. Split message ids in header and
 * return all referenced message ids in an array.
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor
 *
 * @param references 
 *          The "References" header
 ******************************************************************************/
ThreadVisNS.References = function(references) {
    // Store message ids of references
    this.references = [];

    this.buildReferences(references);
}



/** ****************************************************************************
 * Build references array
 *
 * @param references
 *          The references string
 ******************************************************************************/
ThreadVisNS.References.prototype.buildReferences = function(references) {
    if (references != null && references != "") {
        var result = references.match(/[^<>\s]+/g);

        var dupes = new Object();
        var distinct = new Array();

        // result can be null if no matches have been found
        if (result) {
            for (var i = result.length - 1; i >= 0; i--) {
                // TODO
                // email from user: some mail servers seem to change the
                // message id after the @ sign
                // add switch to ignore mail host after @ (setting in preferences)
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



/** ****************************************************************************
 * Get references array. Return all references of the message as an array.
 *
 * @return
 *      An array of all referenced message ids
 ******************************************************************************/
ThreadVisNS.References.prototype.getReferences = function() {
    return this.references;
}



/** ****************************************************************************
 * Get string representation of object
 *
 * @return
 *      A string containing all referenced message ids
 ******************************************************************************/
ThreadVisNS.References.prototype.toString = function() {;
    var string = "";
    for (referenceskey in this.references) {
        string += ", " + this.references[referenceskey];
    }
    return string;
}
