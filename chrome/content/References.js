/* *******************************************************
 * References.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * Wrapper for references
 * Re-write from Java
 *
 * $Id$
 ********************************************************/

/**
 * Constructor
 */
function References(references)
{
    /**
     * Store message ids of references
     */
    this.references_ = new Array;

    // javascript links to methods
    this.buildReferences = References_buildReferences;
    this.getReferences = References_getReferences;
    this.toString = References_toString;

    this.buildReferences(references);
}


/**
 * build references array
 */
function References_buildReferences(references)
{
    if (references != null && references != "")
    {
        var splitted = references.split(" ");
        var reference = null;
        for (key in splitted)
        {
            reference = splitted[key];
            reference = reference.replace(/</, "");
            reference = reference.replace(/>/, "");
            this.references_.push(reference);
        }
    }
}


/**
 * get references array
 */
function References_getReferences()
{
    return this.references_;
}


/**
 * Get string representation of object
 */
function References_toString()
{
    //return this.references_;
    var string = "";
    for (referenceskey in this.references_)
    {
        string += this.references_[referenceskey];
    }
    return string;
}
