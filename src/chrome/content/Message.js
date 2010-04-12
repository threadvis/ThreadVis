/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.mozdev.org/
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010 Alexander C. Hubmann-Haidvogel
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

    /***************************************************************************
     * Constructor
     * 
     * @param glodaMessage
     *            The gloda message object
     * @return A new message
     **************************************************************************/
    ThreadVis.Message = function(glodaMessage) {
        /**
         * Gloda message
         */
        this.glodaMessage = glodaMessage;

        /**
         * References of this message
         */
        if (glodaMessage.folderMessage != null) {
            this.references = new ThreadVis.References(
                    glodaMessage.folderMessage.getStringProperty("references"));
        } else {
            this.references = new ThreadVis.References("");
        }
    }

    /***************************************************************************
     * Get date of message
     * 
     * @return The date of the message
     **************************************************************************/
    ThreadVis.Message.prototype.getDate = function() {
        return this.glodaMessage.date;
    }

    /***************************************************************************
     * Get folder message is in
     * 
     * @return The folder of the message
     **************************************************************************/
    ThreadVis.Message.prototype.getFolder = function() {
        return this.glodaMessage.folderURI;
    }

    /***************************************************************************
     * Get sender of message
     * 
     * @return The sender of the message
     **************************************************************************/
    ThreadVis.Message.prototype.getFrom = function() {
        if (this.glodaMessage.folderMessage != null) {
            return this.glodaMessage.folderMessage.mime2DecodedAuthor;
        }
        return this.glodaMessage.from;
    }

    /***************************************************************************
     * Parse email address from "From" header
     * 
     * @return The parsed email address
     **************************************************************************/
    ThreadVis.Message.prototype.getFromEmail = function() {
        return this.glodaMessage.from.value;
    }

    /***************************************************************************
     * Get message id
     * 
     * @return The message id
     **************************************************************************/
    ThreadVis.Message.prototype.getId = function() {
        return this.glodaMessage.headerMessageID;
    }

    /***************************************************************************
     * Get references
     * 
     * @return The referenced header
     **************************************************************************/
    ThreadVis.Message.prototype.getReferences = function() {
        return this.references;
    }

    /***************************************************************************
     * Get original subject
     * 
     * @return The subject
     **************************************************************************/
    ThreadVis.Message.prototype.getSubject = function() {
        return this.glodaMessage.subject;
    }

    /***************************************************************************
     * See if message is sent (i.e. in sent-mail folder)
     **************************************************************************/
    ThreadVis.Message.prototype.isSent = function() {
        var issent = false;
        // it is sent if it is stored in a folder that is marked as sent (if
        // enabled)
        if (this.glodaMessage.folderMessage != null) {
            issent |= this.glodaMessage.folderMessage.folder.isSpecialFolder(
                    Components.interfaces.nsMsgFolderFlags.SentMail, true)
                    && ThreadVis.Preferences
                            .getPreference(ThreadVis.Preferences.PREF_SENTMAIL_FOLDERFLAG);
        }
        // or it is sent if the sender address is a local identity (if enabled)
        issent |= ThreadVis.sentMailIdentities[this.glodaMessage.from.value] == true
                && ThreadVis.Preferences
                        .getPreference(ThreadVis.Preferences.PREF_SENTMAIL_IDENTITY);
        return issent;
    }

    /***************************************************************************
     * Get body of message
     **************************************************************************/
    ThreadVis.Message.prototype.getBody = function() {
        return this.glodaMessage.indexedBodyText;
    }

    /***************************************************************************
     * Return message as string
     * 
     * @return The string representation of the message
     **************************************************************************/
    ThreadVis.Message.prototype.toString = function() {
        return "Message: Subject: '" + this.getSubject() + "'. From: '"
                + this.getFrom() + "'. MsgId: '" + this.getId() + "'. Date: '"
                + this.getDate() + "'. Folder: '" + this.getFolder()
                + "'. Refs: '" + this.getReferences() + "'. Sent: '"
                + this.isSent() + "'";
    }

    /***************************************************************************
     * Get the underlying nsIMsgDBHdr
     * 
     * @return The original nsIMsgDBHdr or null if not found
     **************************************************************************/
    ThreadVis.Message.prototype.getMsgDbHdr = function() {
        if (this.glodaMessage.folderMessage == null) {
            ThreadVis
                    .log(
                            "Cache",
                            "Unable to find nsIMsgDBHdr for message "
                                    + this.getId()
                                    + ", probably in folder "
                                    + this.getFolder()
                                    + ". Either the message database (msf) for this folder is corrupt, or the global index is out-of-date.");
        }
        return this.glodaMessage.folderMessage;
    }

    return ThreadVis;
}(ThreadVis || {}));
