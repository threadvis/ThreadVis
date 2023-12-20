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
 * Wrap email message
 **********************************************************************************************************************/

const EXPORTED_SYMBOLS = [ "Message" ];

const { Preferences } = ChromeUtils.import("chrome://threadvis/content/utils/preferences.jsm");
const { References } = ChromeUtils.import("chrome://threadvis/content/utils/references.jsm");
const { SentMailIdentities } = ChromeUtils.import("chrome://threadvis/content/utils/sentmailidentities.jsm");

class Message {
    /**
     * {GlodaMessage} object
     */
    #glodaMessage;

    /**
     * Constructor
     * 
     * @constructor
     * @param {GlodaMessage} glodaMessage - The gloda message object
     * @return {ThreadVis.Message} - A new message
     */
    constructor(glodaMessage) {
        Object.seal(this);
        /**
         * Gloda message
         */
        this.#glodaMessage = glodaMessage;
    }

    /**
     * Get date of message
     * 
     * @return {Date} - The date of the message
     */
    get date() {
        return this.#glodaMessage.date;
    }

    /**
     * Get folder message is in
     * 
     * @return {String} - The folder of the message
     */
    get folder() {
        return this.#glodaMessage.folderURI;
    }

    /**
     * Get sender of message
     * 
     * @return {String} - The sender of the message
     */
    get from() {
        if (this.#glodaMessage.folderMessage) {
            return this.#glodaMessage.folderMessage.mime2DecodedAuthor;
        }
        return this.#glodaMessage.from;
    }

    /**
     * Parse email address from "From" header
     * 
     * @return {String} - The parsed email address
     */
    get fromEmail() {
        return this.#glodaMessage.from.value;
    }

    /**
     * Get message id
     * 
     * @return {String} - The message id
     */
    get id() {
        return this.#glodaMessage.headerMessageID;
    }

    /**
     * Get references
     * 
     * @return {Array<String>} - The parsed references header
     */
    get references() {
        if (this.#glodaMessage.folderMessage) {
            return References.get(this.#glodaMessage.folderMessage.getStringProperty("references"));
        }
        return [];
    }

    /**
     * Get original subject
     * 
     * @return {String} - The subject
     */
    get subject() {
        return this.#glodaMessage.subject;
    }

    /**
     * See if message is sent (i.e. in sent-mail folder)
     * 
     * @return {Boolean} - True if the message was sent by the user, false if not
     */
    get isSent() {
        let issent = false;
        // it is sent if it is stored in a folder that is marked as sent (if enabled)
        if (this.#glodaMessage.folderMessage) {
            issent ||= this.#glodaMessage.folderMessage.folder.isSpecialFolder(Components.interfaces.nsMsgFolderFlags.SentMail, true)
                    && Preferences.get(Preferences.SENTMAIL_FOLDERFLAG);
        }
        // or it is sent if the sender address is a local identity (if enabled)
        issent ||= SentMailIdentities[this.#glodaMessage.from.value]
                && Preferences.get(Preferences.SENTMAIL_IDENTITY);
        return issent;
    }

    /**
     * Get body of message
     * 
     * @return {String} - The body of the message
     */
    get body() {
        return this.#glodaMessage.indexedBodyText;
    }

    /**
     * Return message as string
     * 
     * @return {String} - The string representation of the message
     */
    toString() {
        return "Message: Subject: '" + this.subject + "'."
                + " From: '" + this.from + "'."
                + " MsgId: '" + this.id + "'."
                + " Date: '" + this.date + "'. "
                + " Folder: '" + this.folder + "'. "
                + " Refs: '" + this.references + "'. "
                + " Sent: '" + this.isSent + "'";
    }

    /**
     * Get the underlying nsIMsgDBHdr
     * 
     * @return {nsIMsgDBHdr} - The original nsIMsgDBHdr or null if not found
     */
    get msgDbHdr() {
        if (!this.#glodaMessage.folderMessage) {
            console.error(`ThreadVis: Unable to find nsIMsgDBHdr for message ${this.id}, probably in folder ${this.folder}. Either the message database (msf) for this folder is corrupt, or the global index is out-of-date.`);
        }
        return this.#glodaMessage.folderMessage;
    }

    get messageURI() {
        return this.#glodaMessage.folderMessageURI;
    }
}