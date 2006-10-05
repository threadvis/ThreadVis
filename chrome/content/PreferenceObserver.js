/** ****************************************************************************
 * PreferenceObserver.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file to react to preference changing events
 *
 * Version: $Id$
 ******************************************************************************/



var THREADVIS_PREF_BRANCH_ = "extensions.threadvis.";
var THREADVIS_PREF_ENABLED_ = "enabled";
var THREADVIS_PREF_DISABLEDACCOUNTS_ = "disabledaccounts";
var THREADVIS_PREF_DISABLEDFOLDERS_ = "disabledfolders";



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
 * get preference value for given preference
 ******************************************************************************/
PreferenceObserver.prototype.getPreference = function(pref)
{
    return this.preferences_[pref];
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
 * reload preferences
 ******************************************************************************/
PreferenceObserver.prototype.preferenceReload = function()
{
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);

    this.preferences_["enabled"] = false;
    if (prefs.getPrefType(THREADVIS_PREF_BRANCH_ + THREADVIS_PREF_ENABLED_) == prefs.PREF_BOOL)
        this.preferences_["enabled"] = prefs.getBoolPref(THREADVIS_PREF_BRANCH_ + THREADVIS_PREF_ENABLED_);

    this.preferences_["disabledaccounts"] = "";
    if (prefs.getPrefType(THREADVIS_PREF_BRANCH_ + THREADVIS_PREF_DISABLEDACCOUNTS_) == prefs.PREF_STRING)
        this.preferences_["disabledaccounts"] = prefs.getCharPref(THREADVIS_PREF_BRANCH_ + THREADVIS_PREF_DISABLEDACCOUNTS_);

    this.preferences_["disabledfolders"] = "";
    if (prefs.getPrefType(THREADVIS_PREF_BRANCH_ + THREADVIS_PREF_DISABLEDFOLDERS_) == prefs.PREF_STRING)
        this.preferences_["disabledfolders"] = prefs.getCharPref(THREADVIS_PREF_BRANCH_ + THREADVIS_PREF_DISABLEDFOLDERS_);
}



/** ****************************************************************************
 * Preference changing observer
 ******************************************************************************/
PreferenceObserver.prototype.register =  function()
{
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);
    this.pref_branch_ = prefService.getBranch(THREADVIS_PREF_BRANCH_);

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
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
 * unregister observer
 ******************************************************************************/
PreferenceObserver.prototype.unregister = function()
{
    if(!this.pref_branch_)
        return;

    var pbi = this.pref_branch_.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
}
