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



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor
 *
 * @param glodaMessage
 *          The gloda message object
 * @param sent
 *          True if the message was sent
 * @return
 *          A new message
 ******************************************************************************/
ThreadVisNS.Message = function(glodaMessage, sent) {
    /**
     * Gloda message
     */
    this.glodaMessage = glodaMessage;

    /**
     * Flag for sent mail
     */
    this.sent = sent;

    /**
     * References of this message
     */
    this.references = new ThreadVisNS.References(
        glodaMessage.folderMessage.getStringProperty("references"));
}



/** ****************************************************************************
 * Get date of message
 *
 * @return
 *          The date of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getDate = function() {
    return this.glodaMessage.date;
}



/** ****************************************************************************
 * Get folder message is in
 *
 * @return
 *          The folder of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFolder = function() {
    return this.glodaMessage.folderURI;
}



/** ****************************************************************************
 * Get sender of message
 *
 * @return
 *          The sender of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFrom = function() {
    return this.glodaMessage.folderMessage.mime2DecodedAuthor;
}



/** ****************************************************************************
 * Parse email address from "From" header
 *
 * @return
 *          The parsed email address
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFromEmail = function() {
    return this.glodaMessage.from.value;
}



/** ****************************************************************************
 * Get message id
 *
 * @return
 *          The message id
 ******************************************************************************/
ThreadVisNS.Message.prototype.getId = function() {
    return this.glodaMessage.headerMessageID;
}



/** ****************************************************************************
 * Get references
 *
 * @return
 *          The referenced header
 ******************************************************************************/
ThreadVisNS.Message.prototype.getReferences = function() {
    return this.references;
}



/** ****************************************************************************
 * Get original subject
 *
 * @return
 *          The subject
 ******************************************************************************/
ThreadVisNS.Message.prototype.getSubject = function() {
    return this.glodaMessage.subject;
}



/** ****************************************************************************
 * See if message is sent (i.e. in sent-mail folder)
 ******************************************************************************/
ThreadVisNS.Message.prototype.isSent = function() {
    return this.sent;
}



/** ****************************************************************************
 * Get body of message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getBody = function() {
    return this.glodaMessage.indexedBodyText;
}



/** ****************************************************************************
 * Return message as string
 *
 * @return
 *          The string representation of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.toString = function() {
    return "Message: Subject: '" + this.subject + "'. From: '" + this.from +
        "'. MsgId: '" + this.messageId + "'. Date: '" + this.date +
        "'. Folder: '" + this.folder +
        "'. Refs: '" + this.references + "'. Sent: '" + this.sent + "'";
}
