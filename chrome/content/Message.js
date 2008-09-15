/** ****************************************************************************
 * Message.js
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
     * Simplified subject of message
     * (RE: is stripped)
     *
     * not really needed, thunderbird strips all re: already
     * fixxme nontheless
     */
    this.simplifiedSubject = subject;

    /**
     * Subject of message
     */
    this.subject = subject;
}



/** ****************************************************************************
 * Get date of message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getDate = function() {
    return this.date;
}



/** ****************************************************************************
 * Get folder message is in
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFolder = function() {
    return this.folder;
}



/** ****************************************************************************
 * Get sender of message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getFrom = function() {
    return this.from;
}



/** ****************************************************************************
 * Get sender-email of message
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
 ******************************************************************************/
ThreadVisNS.Message.prototype.getId = function() {
    return this.messageId;
}



/** ****************************************************************************
 * Get message key
 ******************************************************************************/
ThreadVisNS.Message.prototype.getKey = function() {
    return this.messageKey;
}



/** ****************************************************************************
 * Get references
 ******************************************************************************/
ThreadVisNS.Message.prototype.getReferences = function() {
    return this.references;
}



/** ****************************************************************************
 * Get reply count of this message
 ******************************************************************************/
ThreadVisNS.Message.prototype.getReplyCount = function() {
    return this.replyCount;
}



/** ****************************************************************************
 * Get simplified subject
 ******************************************************************************/
ThreadVisNS.Message.prototype.getSimplifiedSubject = function() {
    return this.simplifiedSubject;
}



/** ****************************************************************************
 * Get original subject
 ******************************************************************************/
ThreadVisNS.Message.prototype.getSubject = function() {
    return this.subject;
}



/** ****************************************************************************
 * See if this message is a reply
 ******************************************************************************/
ThreadVisNS.Message.prototype.isReply = function() {
    return (this.replyCount > 0);
}



/** ****************************************************************************
 * See if message is sent (i.e. in sent-mail folder)
 ******************************************************************************/
ThreadVisNS.Message.prototype.isSent = function() {
    return this.sent;
}



/** ****************************************************************************
 * Get simplyfied subject of message
 * Strip all Re:
 * fixxme
 ******************************************************************************/
/*
private String simplifySubject(String subject)
{
    if (subject != null)
    {
        String old_subject = "";
        while (! subject.equals(old_subject))
        {
            old_subject = subject;
            // trim whitespace
            subject = subject.trim();

            // try to remove single "re:"
            if (subject.matches("^[rR][eE]:.*"))
            {
                subject = subject.replaceFirst("^[rR][eE](:|\\[\\d*\\]:)", "");
                reply_count_++;
            }
            // try to remove "re[?]:"
            else if (subject.matches("^[rR][eE]\\[\\d*\\]:.*"))
            {
                // get integer in [?], add to reply count
                int reply_count = Integer.parseInt(subject.replaceFirst("^[rR][eE]\\[(\\d*)\\]:.*","$1"));
                subject = subject.replaceFirst("^[rR][eE]\\[\\d*\\]:", "");
                reply_count_ += reply_count;
            }
            // "(no subject)" means "";
            if (subject == "(no subject)")
            {
                subject = "";
            }
        }
        return subject;
    }
    return "";
}
*/



/** ****************************************************************************
 * Set if message is sent (i.e. in sent-mail folder)
 ******************************************************************************/
ThreadVisNS.Message.prototype.setSent = function(sent) {
    this.sent = sent;
}



/** ****************************************************************************
 * Return message as string
 ******************************************************************************/
ThreadVisNS.Message.prototype.toString = function() {
    return "Message: Subject: '" + this.subject + "'. From: '" + this.from +
        "'. MsgId: '" + this.messageId + "'. MsgKey: '" + this.messageKey +
        "'. Date: '" + this.date + "'. Folder: '" + this.folder +
        "'. Refs: '" + this.references + "'. Sent: '" + this.sent + "'";
}
