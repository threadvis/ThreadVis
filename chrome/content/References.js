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
    this.buildReferences(references);
}


/**
 * build references array
 */
References.prototype.buildReferences = function(references)
{
    if (references != null && references != "")
    {
        var splitted = references.split(/\s/);
        for (key in splitted)
        {
            var reference = splitted[key];
            reference = reference.replace(/\s/g, "");
            reference = reference.replace(/</, "");
            reference = reference.replace(/>/, "");
            if (reference == "")
                continue;
            this.references_.push(reference);
        }
    }
}


/**
 * get references array
 */
References.prototype.getReferences = function()
{
    return this.references_;
}


/**
 * Get string representation of object
 */
References.prototype.toString = function()
{
    //return this.references_;
    var string = "";
    for (referenceskey in this.references_)
    {
        string += ", " + this.references_[referenceskey];
    }
    return string;
}
