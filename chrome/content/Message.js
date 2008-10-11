/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2005-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Wrap email message
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor
 *
 * @param subject
 *          The subject of the message
 * @param from
 *          The "From" address
 * @param messageId
 *          The message id of the email
 * @param messageKey
 *          The message key
 * @param date
 *          The date of the message
 * @param folder
 *          The folder of the message
 * @param references
 *          The "References" header
 * @param sent
 *          True if the message was sent
 * @return
 *          A new message
 ******************************************************************************/
ThreadVisNS.Message = function(subject, from, messageId, messageKey, date,
    folder, references, sent) {
    /**
     * Message date
     */
    this.date = date;

    /**
     * Sender of message
     */
    this.from = from;

    /**
     * Folder message is in
     */
    this.folder = folder;

    /**
     * if folder stores sent mails
     */
    this.sent = sent;

    /**
     * Message id
     */
    this.messageId = messageId;

    /**
     * Message key, to identify the message in mozilla
     */
    this.messageKey = messageKey;

    /**
     * References of this message
     */
    this.references = new ThreadVisNS.References(references);

    /**
     * Depth of reply of this message
     */
    this.replyCount = 0;

    /**
     * Subject of message
     */
    this.subject = subject;
}



/** ****************************************************************************
 * Get date of message
 *
 * @return
 *          The date of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getDate = function() {
    return this.date;
}



/** ****************************************************************************
 * Get folder message is in
 *
 * @return
 *          The folder of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFolder = function() {
    return this.folder;
}



/** ****************************************************************************
 * Get sender of message
 *
 * @return
 *          The sender of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFrom = function() {
    return this.from;
}



/** ****************************************************************************
 * Parse email address from "From" header
 *
 * @return
 *          The parsed email address
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFromEmail = function() {
    // parse email address
    var email = this.getFrom();
    email = Components.classes["@mozilla.org/messenger/headerparser;1"]
        .getService(Components.interfaces.nsIMsgHeaderParser)
        .extractHeaderAddressMailboxes(null, email);
    return email;
}



/** ****************************************************************************
 * Get message id
 *
 * @return
 *          The message id
 ******************************************************************************/
ThreadVisNS.Message.prototype.getId = function() {
    return this.messageId;
}



/** ****************************************************************************
 * Get message key
 *
 * @return
 *          The message key
 ******************************************************************************/
ThreadVisNS.Message.prototype.getKey = function() {
    return this.messageKey;
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
 * Get reply count of this message
 *
 * @return
 *          The number of replies to this message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getReplyCount = function() {
    return this.replyCount;
}



/** ****************************************************************************
 * Get original subject
 *
 * @return
 *          The subject
 ******************************************************************************/
ThreadVisNS.Message.prototype.getSubject = function() {
    return this.subject;
}



/** ****************************************************************************
 * See if message is sent (i.e. in sent-mail folder)
 ******************************************************************************/
ThreadVisNS.Message.prototype.isSent = function() {
    return this.sent;
}



/** ****************************************************************************
 * Set if message is sent (i.e. in sent-mail folder)
 *
 * @param sent
 *          True if message is a sent message
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Message.prototype.setSent = function(sent) {
    this.sent = sent;
}



/** ****************************************************************************
 * Return message as string
 *
 * @return
 *          The string representation of the message
 ******************************************************************************/
ThreadVisNS.Message.prototype.toString = function() {
    return "Message: Subject: '" + this.subject + "'. From: '" + this.from +
        "'. MsgId: '" + this.messageId + "'. MsgKey: '" + this.messageKey +
        "'. Date: '" + this.date + "'. Folder: '" + this.folder +
        "'. Refs: '" + this.references + "'. Sent: '" + this.sent + "'";
}
