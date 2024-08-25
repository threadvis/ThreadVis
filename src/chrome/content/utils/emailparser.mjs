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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023 Alexander C. Hubmann-Haidvogel
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
 * Wrappers for email (header) parsers
 **********************************************************************************************************************/

const { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");

/**
 * Extract email address from a TO/FROM/CC/BCC line
 *
 * @param {String} anyEmailAddressFormat - The email header line as displayed in the UI
 * @return {String} - The extracted email address
 */
export const extractEmailAddress = (anyEmailAddressFormat) => {
    const parsedItems = MailServices.headerParser.parseEncodedHeader(anyEmailAddressFormat);
    // due to missing quotes in the header display, the parser trips on things like
    // Lastname, Firstname <firstname.lastname@domain.ending>
    // as those would originally be quoted:
    // "Lastname, Firstname" <firstname.lastname@domain.ending>
    // for sake of simplicity, assume input is a single address and take _any_ extracted address

    return parsedItems.map((item) => item.email).find((email) => email !== "");
};