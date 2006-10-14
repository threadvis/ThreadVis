/** ****************************************************************************
 * References.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * Wrapper for references
 * Re-write from Java
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor
 * references == string of references
 ******************************************************************************/
function References(references)
{
    // Store message ids of references
    this.references_ = new Array;

    this.buildReferences(references);
    this.cleanReferences();
}



/** ****************************************************************************
 * build references array
 ******************************************************************************/
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



/** ****************************************************************************
 * kill dupes in references array
 ******************************************************************************/
References.prototype.cleanReferences = function()
{
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_EMAIL_,
                               "REFERENCES",
                               {"total references": this.references_.join(" ")});
    
    var count = this.references_.length;
    for (var i = count; i > 0; i--)
    {
        var outer = this.references_[i];
        for (var j = i-1; j >= 0; j--)
        {
            var inner = this.references_[j];
            if (outer == inner)
                this.references_.splice(j, 1);
        }
    }
    THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_EMAIL_,
                               "REFERENCES",
                               {"after references": this.references_.join(" ")});
}



/** ****************************************************************************
 * get references array
 ******************************************************************************/
References.prototype.getReferences = function()
{
    return this.references_;
}



/** ****************************************************************************
 * get string representation of object
 ******************************************************************************/
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
