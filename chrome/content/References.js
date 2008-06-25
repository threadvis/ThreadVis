/** ****************************************************************************
 * References.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Wrapper for references
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor
 * references == string of references
 ******************************************************************************/
function References(references) {
    // Store message ids of references
    this.references = new Object();

    this.buildReferences(references);
}



/** ****************************************************************************
 * build references array
 ******************************************************************************/
References.prototype.buildReferences = function(references) {
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
 * get references array
 ******************************************************************************/
References.prototype.getReferences = function() {
    return this.references;
}



/** ****************************************************************************
 * get string representation of object
 ******************************************************************************/
References.prototype.toString = function() {;
    var string = "";
    for (referenceskey in this.references) {
        string += ", " + this.references[referenceskey];
    }
    return string;
}
