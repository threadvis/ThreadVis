/** ****************************************************************************
 * PreferenceObserver.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * JavaScript file to react to preference changing events
 *
 * Version: $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Preference observer
 ******************************************************************************/
function PreferenceObserver()
{
    this.PREF_BRANCH_ = "extensions.threadvis.";
    this.PREF_ENABLED_ = "enabled";
    this.PREF_DISABLEDACCOUNTS_ = "disabledaccounts";
    this.PREF_DISABLEDFOLDERS_ = "disabledfolders";
    this.PREF_POPUPWINDOW_POSITION_X_ = "popupwindow.position.x";
    this.PREF_POPUPWINDOW_POSITION_Y_ = "popupwindow.position.y";
    this.PREF_POPUPWINDOW_SIZE_X_ = "popupwindow.size.x";
    this.PREF_POPUPWINDOW_SIZE_Y_ = "popupwindow.size.y";

    this.pref_branch_ = null;
    this.preferences_ = new Object();
    this.preferences_["enabled"] = false;

    this.callback_ = new Object();

    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);
    this.pref_branch_ = prefService.getBranch(this.PREF_BRANCH_);

    this.PREF_BOOL_ = this.pref_branch_.PREF_BOOL;
    this.PREF_INT_ = this.pref_branch_.PREF_INT;
    this.PREF_STRING_ = this.pref_branch_.PREF_STRING;

    this.register();
    this.preferenceReload();
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
 * load preference
 ******************************************************************************/
PreferenceObserver.prototype.loadPreference = function(pref, typ, def)
{
    this.preferences_[pref]= def;

    if (this.pref_branch_.getPrefType(pref) != typ)
        return;

    switch (typ)
    {
        case this.pref_branch_.PREF_BOOL:
            this.preferences_[pref] = this.pref_branch_.getBoolPref(pref);
            break;
        case this.pref_branch_.PREF_STRING:
            this.preferences_[pref] = this.pref_branch_.getCharPref(pref);
            break;
        case this.pref_branch_.PREF_INT:
            this.preferences_[pref] = this.pref_branch_.getIntPref(pref);
            break;
    }
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
    this.loadPreference(this.PREF_ENABLED_, this.pref_branch_.PREF_BOOL, false);
    this.loadPreference(this.PREF_DISABLEDACCOUNTS_, this.pref_branch_.PREF_STRING, "");
    this.loadPreference(this.PREF_DISABLEDFOLDERS_, this.pref_branch_.PREF_STRING, "");
    this.loadPreference(this.PREF_POPUPWINDOW_POSITION_X_, this.pref_branch_.PREF_INT, 0);
    this.loadPreference(this.PREF_POPUPWINDOW_POSITION_Y_, this.pref_branch_.PREF_INT, 0);
    this.loadPreference(this.PREF_POPUPWINDOW_SIZE_X_, this.pref_branch_.PREF_INT, 0);
    this.loadPreference(this.PREF_POPUPWINDOW_SIZE_Y_, this.pref_branch_.PREF_INT, 0);
}



/** ****************************************************************************
 * Preference changing observer
 ******************************************************************************/
PreferenceObserver.prototype.register =  function()
{
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
 * set preference value for given preference
 ******************************************************************************/
PreferenceObserver.prototype.setPreference = function(pref, val, typ)
{
    this.preferences_[pref] = val;
    this.storePreference(pref, typ, val);
}



/** ****************************************************************************
 * load preferences
 ******************************************************************************/
PreferenceObserver.prototype.storePreference = function(pref, typ, val)
{
    this.preferences_[pref]= val;

    if (this.pref_branch_.getPrefType(pref) != typ)
        return;

    switch (typ)
    {
        case this.pref_branch_.PREF_BOOL:
            this.pref_branch_.setBoolPref(pref, val);
            break;
        case this.pref_branch_.PREF_STRING:
            this.pref_branch_.setCharPref(pref);
            break;
        case this.pref_branch_.PREF_INT:
            this.pref_branch_.setIntPref(pref);
            break;
    }
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
