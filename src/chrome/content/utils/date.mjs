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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023, 2024 Alexander C. Hubmann-Haidvogel
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
 * Various utility classes
 **********************************************************************************************************************/

import { Strings }from "./strings.mjs";

/**
 * Built-in date formatter service
 */
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    "year": "2-digit",
    "month": "2-digit",
    "day": "2-digit",
    "hour": "2-digit",
    "minute": "2-digit"
});

/**
 * Format the time difference for the label and the tooltip
 * 
 * @param {integer} timeDifference - The time difference to display
 * @return {Object} - The formatted time difference for label and tooltip
 */
export const formatTimeDifference = (timeDifference) => {
    // timedifference is in miliseconds
    timeDifference = timeDifference - (timeDifference % 1000);
    timeDifference = timeDifference / 1000;
    const seconds = timeDifference % 60;
    timeDifference = timeDifference - seconds;
    timeDifference = timeDifference / 60;
    const minutes = timeDifference % 60;
    timeDifference = timeDifference - minutes;
    timeDifference = timeDifference / 60;
    const hours = timeDifference % 24;
    timeDifference = timeDifference - hours;
    timeDifference = timeDifference / 24;
    const days = timeDifference % 365;
    timeDifference = timeDifference - days;
    timeDifference = timeDifference / 365;
    const years = timeDifference;

    let string = "";
    let toolTip = "";

    // label
    // only display years if >= 1
    if (years >= 1) {
        string = (years + (Math.round((days / 365) * 10) / 10))
            + Strings.getString("visualisation.timedifference.years.short");
    // only display days if >= 1
    } else if (days >= 1) {
        string = Math.round(days + hours / 24)
            + Strings.getString("visualisation.timedifference.days.short");
    // display hours if >= 1
    } else if (hours >= 1) {
        string = Math.round(hours + minutes / 60) + Strings.getString("visualisation.timedifference.hours.short");
    // display minutes otherwise
    } else {
        string = minutes + Strings.getString("visualisation.timedifference.minutes.short");
    }

    // tooltip
    if (years === 1) {
        toolTip = `${years} ${Strings.getString("visualisation.timedifference.year")}`;
    }
    if (years > 1) {
        toolTip = `${years} ${Strings.getString("visualisation.timedifference.years")}`;
    }
    if (days === 1) {
        toolTip += ` ${days} ${Strings.getString("visualisation.timedifference.day")}`;
    }
    if (days > 1) {
        toolTip += ` ${days} ${Strings.getString("visualisation.timedifference.days")}`;
    }
    if (hours === 1) {
        toolTip += ` ${hours} ${Strings.getString("visualisation.timedifference.hour")}`;
    }
    if (hours > 1) {
        toolTip += ` ${hours} ${Strings.getString("visualisation.timedifference.hours")}`;
    }
    if (minutes === 1) {
        toolTip += ` ${minutes} ${Strings.getString("visualisation.timedifference.minute")}`;
    }
    if (minutes > 1) {
        toolTip += ` ${minutes} ${Strings.getString("visualisation.timedifference.minutes")}`;
    }

    return {
        string: string.trim(),
        toolTip: toolTip.trim()
    };
};

/**
 * Format a datetime
 * 
 * @param {Date} date - The date
 * @return {String} - The formatted date
 */
export const formatDate = (date) => dateFormatter.format(date);