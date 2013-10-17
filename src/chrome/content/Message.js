/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with ThreadVis. If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *****************************************************************************
 * Wrap email message
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /**
     * Constructor
     * 
     * @constructor
     * @param {glodaMessage} glodaMessage
     *              The gloda message object
     * @return {ThreadVis.Message} A new message
     * @type ThreadVis.Message
     */
    ThreadVis.Message = function(glodaMessage) {
        /**
         * Gloda message
         */
        this._glodaMessage = glodaMessage;

        /**
         * References of this message
         */
        if (glodaMessage.folderMessage != null) {
            this._references = new ThreadVis.References(
                    glodaMessage.folderMessage.getStringProperty("references"));
        } else {
            this._references = new ThreadVis.References("");
        }
    };

    /**
     * Prototype / instance methods
     */
    ThreadVis.Message.prototype = {
        /**
         * Gloda message
         */
        _glodaMessage : null,

        /**
         * References of this message
         */
        _references : null,

        /**
         * Get date of message
         * 
         * @return {Date} The date of the message
         * @type Date
         */
        getDate : function() {
            return this._glodaMessage.date;
        },

        /**
         * Get folder message is in
         * 
         * @return {String} The folder of the message
         * @type String
         */
        getFolder : function() {
            return this._glodaMessage.folderURI;
        },

        /**
         * Get sender of message
         * 
         * @return {String} The sender of the message
         * @type String
         */
        getFrom : function() {
            if (this._glodaMessage.folderMessage != null) {
                return this._glodaMessage.folderMessage.mime2DecodedAuthor;
            }
            return this._glodaMessage.from;
        },

        /**
         * Parse email address from "From" header
         * 
         * @return {String} The parsed email address
         * @type String
         */
        getFromEmail : function() {
            return this._glodaMessage.from.value;
        },

        /**
         * Get message id
         * 
         * @return {String} The message id
         * @type String
         */
        getId : function() {
            return this._glodaMessage.headerMessageID;
        },

        /**
         * Get references
         * 
         * @return {String} The referenced header
         * @type String
         */
        getReferences : function() {
            return this._references;
        },

        /**
         * Get original subject
         * 
         * @return {String} The subject
         * @type String
         */
        getSubject : function() {
            return this._glodaMessage.subject;
        },

        /**
         * See if message is sent (i.e. in sent-mail folder)
         * 
         * @return {Boolean} True if the message was sent by the user, false if
         *         not
         * @type Boolean
         */
        isSent : function() {
            var issent = false;
            // it is sent if it is stored in a folder that is marked as sent
            // (if enabled)
            if (this._glodaMessage.folderMessage != null) {
                issent |= this._glodaMessage.folderMessage.folder.isSpecialFolder(
                                Components.interfaces.nsMsgFolderFlags.SentMail,
                                true)
                        && ThreadVis.Preferences.getPreference(
                                ThreadVis.Preferences.PREF_SENTMAIL_FOLDERFLAG);
            }
            // or it is sent if the sender address is a local identity
            // (if enabled)
            issent |= ThreadVis.sentMailIdentities[this._glodaMessage.from.value] == true
                    && ThreadVis.Preferences.getPreference(
                            ThreadVis.Preferences.PREF_SENTMAIL_IDENTITY);
            return issent;
        },

        /**
         * Get body of message
         * 
         * @return {String} The body of the message
         * @type String
         */
        getBody : function() {
            return this._glodaMessage.indexedBodyText;
        },

        /**
         * Return message as string
         * 
         * @return {String} The string representation of the message
         * @type String
         */
        toString : function() {
            return "Message: Subject: '" + this.getSubject() + "'. From: '"
                    + this.getFrom() + "'. MsgId: '" + this.getId()
                    + "'. Date: '" + this.getDate() + "'. Folder: '"
                    + this.getFolder() + "'. Refs: '" + this.getReferences()
                    + "'. Sent: '" + this.isSent() + "'";
        },

        /**
         * Get the underlying nsIMsgDBHdr
         * 
         * @return {nsIMsgDBHdr} The original nsIMsgDBHdr or null if not found
         * @type nsIMsgDBHdr
         */
        getMsgDbHdr : function() {
            if (this._glodaMessage.folderMessage == null) {
                ThreadVis.log(
                        "Cache",
                        "Unable to find nsIMsgDBHdr for message " 
                        + this.getId() + ", probably in folder "
                        + this.getFolder()
                        + ". Either the message database (msf) for this folder is corrupt, or the global index is out-of-date.");
            }
            return this._glodaMessage.folderMessage;
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
