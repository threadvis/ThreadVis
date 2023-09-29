/* *********************************************************************************************************************
 * This file is part of ThreadVis.
 * https://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis titled
 * "ThreadVis for Thunderbird: A Thread Visualisation Extension for the Mozilla Thunderbird Email Client"
 * at Graz University of Technology, Austria. An electronic version of the thesis is available online at
 * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with ThreadVis.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *********************************************************************************************************************
 * Main background script for the WebExtension
 **********************************************************************************************************************/

(async () => {

    messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
        switch (info.command) {
            case "initPref":
                return messenger.LegacyPref.init();
        }
    });

    messenger.WindowListener.registerDefaultPrefs("defaults/preferences/threadvisdefault.js");

    messenger.WindowListener.registerChromeUrl([ 
        ["content", "threadvis",           "chrome/content/"],
        ["locale",  "threadvis", "en-US",  "chrome/locale/en-us/"],
        ["locale",  "threadvis", "de-DE",  "chrome/locale/de-de/"]
    ]);

    messenger.WindowListener.registerWindow(
        "about:message",
        "chrome://threadvis/content/hooks/init.js");

    messenger.WindowListener.registerWindow(
        "chrome://messenger/content/messenger.xhtml",
        "chrome://threadvis/content/hooks/init.js");

    messenger.WindowListener.registerShutdownScript("chrome://threadvis/content/hooks/shutdown.js");

    messenger.WindowListener.startListening();
})();