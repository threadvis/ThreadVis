/** ****************************************************************************
 * PreferenceObserver.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file to react to preference changing events
 *
 * Version: $Id$
 ******************************************************************************/



var THREADARCSJS_PREF_BRANCH_ = "extensions.threadarcsjs.";
var THREADARCSJS_PREF_ENABLED_ = "enabled";
var THREADARCSJS_PREF_ENABLEDACCOUNTS_ = "enabledaccounts";



/** ****************************************************************************
 * Preference observer
 ******************************************************************************/
function PreferenceObserver()
{
    this.pref_branch_ = null;
    this.preferences_ = new Object();
    this.preferences_["enabled"] = false;

    this.callback_ = new Object();
    
    this.preferenceReload();
    this.register();
}



/** ****************************************************************************
 * reload preferences
 ******************************************************************************/
PreferenceObserver.prototype.preferenceReload = function()
{
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);

    this.preferences_["enabled"] = false;
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + THREADARCSJS_PREF_ENABLED_) == prefs.PREF_BOOL)
        this.preferences_["enabled"] = prefs.getBoolPref(THREADARCSJS_PREF_BRANCH_ + THREADARCSJS_PREF_ENABLED_);
    this.preferences_["enabledaccounts"] = "*";
    if (prefs.getPrefType(THREADARCSJS_PREF_BRANCH_ + THREADARCSJS_PREF_ENABLEDACCOUNTS_) == prefs.PREF_STRING)
        this.preferences_["enabledaccounts"] = prefs.getCharPref(THREADARCSJS_PREF_BRANCH_ + THREADARCSJS_PREF_ENABLEDACCOUNTS_);
}



/** ****************************************************************************
 * Preference changing observer
 ******************************************************************************/
PreferenceObserver.prototype.register =  function()
{
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);
    this.pref_branch_ = prefService.getBranch(THREADARCSJS_PREF_BRANCH_);

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
}



/** ****************************************************************************
 * unregister observer
 ******************************************************************************/
PreferenceObserver.prototype.unregister = function()
{
    if(!this.pref_branch_)
        return;

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
}



/** ****************************************************************************
 * observe preferences changes
 ******************************************************************************/
PreferenceObserver.prototype.observe = function(subject, topic, data)
{
    if(topic != "nsPref:changed")
        return;

    // reload preferences
    this.preferenceReload();
    this.doCallback();
}



/** ****************************************************************************
 * register a callback hook
 ******************************************************************************/
PreferenceObserver.prototype.registerCallback = function(preference, func)
{
    if (this.callback_[preference])
        this.callback_[preference].push(func)
    else
        this.callback_[preference] = new Array(func);
}



/** ****************************************************************************
 * do callbacks after preference change
 ******************************************************************************/
PreferenceObserver.prototype.doCallback = function()
{
    for (var pref in this.preferences_)
    {
        var value = this.preferences_[pref];
        var array = this.callback_[pref];
        if (array)
        {
            for (var key in array)
            {
                var func = array[key];
                func(value);
            }
        }
    }
}



/** ****************************************************************************
 * do callbacks after preference change
 ******************************************************************************/
PreferenceObserver.prototype.getPreference = function(pref)
{
    return this.preferences_[pref];
}
