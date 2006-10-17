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

    this.PREF_DISABLED_ACCOUNTS_ = "disabledaccounts";
    this.PREF_DISABLED_FOLDERS_ = "disabledfolders";
    this.PREF_ENABLED_ = "enabled";
    this.PREF_LOGGING_ = "logging.enabled";
    this.PREF_LOGGING_DEBUG_ = "logging.debug";
    this.PREF_LOGGING_DEBUG_LEVEL_ = "logging.debug.level";
    this.PREF_TIMELINE_ = "timeline.enabled";
    this.PREF_TIMESCALING_ = "timescaling.enabled";
    this.PREF_VIS_DOTSIZE_ = "visualisation.dotsize";
    this.PREF_VIS_ARC_MINHEIGHT_ = "visualisation.arcminheight";
    this.PREF_VIS_ARC_RADIUS_ = "visualisation.arcradius";
    this.PREF_VIS_ARC_DIFFERENCE_ = "visualisation.arcdifference";
    this.PREF_VIS_ARC_WIDTH_ = "visualisation.arcwidth";
    this.PREF_VIS_SPACING_ = "visualisation.spacing";
    this.PREF_VIS_COLOUR_ = "visualisation.colour";
    this.PREF_VIS_HIGHLIGHT_ = "visualisation.highlight";
    this.PREF_ZOOM_HEIGHT_ = "zoom.height";
    this.PREF_ZOOM_WIDTH_ = "zoom.width";

    this.pref_branch_ = null;
    this.preferences_ = new Object();
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
PreferenceObserver.prototype.doCallback = function(pref)
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
    this.doCallback(data);
}



/** ****************************************************************************
 * reload preferences
 ******************************************************************************/
PreferenceObserver.prototype.preferenceReload = function()
{
    this.loadPreference(this.PREF_DISABLED_ACCOUNTS_, this.pref_branch_.PREF_STRING, "");
    this.loadPreference(this.PREF_DISABLED_FOLDERS_, this.pref_branch_.PREF_STRING, "");
    this.loadPreference(this.PREF_ENABLED_, this.pref_branch_.PREF_BOOL, true);
    this.loadPreference(this.PREF_LOGGING_, this.pref_branch_.PREF_BOOL, false);
    this.loadPreference(this.PREF_LOGGING_DEBUG_, this.pref_branch_.PREF_BOOL, false);
    this.loadPreference(this.PREF_LOGGING_DEBUG_LEVEL_, this.pref_branch_.PREF_INT, 0);
    this.loadPreference(this.PREF_TIMELINE_, this.pref_branch_.PREF_BOOL, true);
    this.loadPreference(this.PREF_TIMESCALING_, this.pref_branch_.PREF_BOOL, true);
    this.loadPreference(this.PREF_VIS_DOTSIZE_, this.pref_branch_.PREF_INT, 12);
    this.loadPreference(this.PREF_VIS_ARC_MINHEIGHT_, this.pref_branch_.PREF_INT, 12);
    this.loadPreference(this.PREF_VIS_ARC_RADIUS_, this.pref_branch_.PREF_INT, 32);
    this.loadPreference(this.PREF_VIS_ARC_DIFFERENCE_, this.pref_branch_.PREF_INT, 6);
    this.loadPreference(this.PREF_VIS_ARC_WIDTH_, this.pref_branch_.PREF_INT, 2);
    this.loadPreference(this.PREF_VIS_SPACING_, this.pref_branch_.PREF_INT, 24);
    this.loadPreference(this.PREF_VIS_COLOUR_, this.pref_branch_.PREF_STRING, "author");
    this.loadPreference(this.PREF_VIS_HIGHLIGHT_, this.pref_branch_.PREF_BOOL, true);
    this.loadPreference(this.PREF_ZOOM_HEIGHT_, this.pref_branch_.PREF_INT, 1);
    this.loadPreference(this.PREF_ZOOM_WIDTH_, this.pref_branch_.PREF_INT, 1);
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

    switch (typ)
    {
        case this.pref_branch_.PREF_BOOL:
            this.pref_branch_.setBoolPref(pref, val);
            break;
        case this.pref_branch_.PREF_STRING:
            this.pref_branch_.setCharPref(pref, val);
            break;
        case this.pref_branch_.PREF_INT:
            this.pref_branch_.setIntPref(pref, val);
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
