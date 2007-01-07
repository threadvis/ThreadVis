/** ****************************************************************************
 * Message.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * Wrap email message
 * Re-write from Java
 * Version: $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor
 ******************************************************************************/
function Message(subject,
                 from,
                 message_id,
                 message_key,
                 date,
                 folder,
                 references,
                 issent)
{
    /**
     * Message date
     */
    this.date_ = date;

    /**
     * Sender of message
     */
    this.from_ = from;

    /**
     * Folder message is in
     */
    this.folder_ = folder;

    /**
     * if folder stores sent mails
     */
    this.issent_ = issent;

    /**
     * Message id
     */
    this.message_id_ = message_id;

    /**
     * Message key, to identify the message in mozilla
     */
    this.message_key_ = message_key;

    /**
     * References of this message
     */
    this.references_ = new References(references);

    /**
     * Depth of reply of this message
     */
    this.reply_count_ = 0;

    /**
     * Simplified subject of message
     * (RE: is stripped)
     *
     * not really needed, thunderbird strips all re: already
     * fixxme nontheless
     */
    this.simplified_subject_ = subject;

    /**
     * Subject of message
     */
    this.subject_ = subject;
}



/** ****************************************************************************
 * Get date of message
 ******************************************************************************/
Message.prototype.getDate = function()
{
    return this.date_;
}



/** ****************************************************************************
 * Get folder message is in
 ******************************************************************************/
Message.prototype.getFolder = function()
{
    return this.folder_;
}



/** ****************************************************************************
 * Get sender of message
 ******************************************************************************/
Message.prototype.getFrom = function()
{
    return this.from_;
}



/** ****************************************************************************
 * Get sender-email of message
 ******************************************************************************/
Message.prototype.getFromEmail = function()
{
    // parse email address
    var email = this.getFrom();
    email = Components.classes["@mozilla.org/messenger/headerparser;1"]
            .getService(Components.interfaces.nsIMsgHeaderParser).extractHeaderAddressMailboxes(null, email);
    return email;
}



/** ****************************************************************************
 * Get message id
 ******************************************************************************/
Message.prototype.getId = function()
{
    return this.message_id_;
}



/** ****************************************************************************
 * Get message key
 ******************************************************************************/
Message.prototype.getKey = function()
{
    return this.message_key_;
}



/** ****************************************************************************
 * Get references
 ******************************************************************************/
Message.prototype.getReferences = function()
{
    return this.references_;
}



/** ****************************************************************************
 * Get reply count of this message
 ******************************************************************************/
Message.prototype.getReplyCount = function()
{
    return this.reply_count_;
}



/** ****************************************************************************
 * Get simplified subject
 ******************************************************************************/
Message.prototype.getSimplifiedSubject = function()
{
    return this.simplified_subject_;
}



/** ****************************************************************************
 * Get original subject
 ******************************************************************************/
Message.prototype.getSubject = function()
{
    return this.subject_;
}



/** ****************************************************************************
 * See if this message is a reply
 ******************************************************************************/
Message.prototype.isReply = function()
{
    return (this.reply_count_ > 0);
}



/** ****************************************************************************
 * See if message is sent (i.e. in sent-mail folder)
 ******************************************************************************/
Message.prototype.isSent = function()
{
    return this.issent_;
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
Message.prototype.setSent = function(sent)
{
    this.issent_ = sent;
}



/** ****************************************************************************
 * Return message as string
 ******************************************************************************/
Message.prototype.toString = function()
{
    return "Message: Subject: '" + this.subject_ +
                 "'. From: '" + this.from_ +
                 "'. MsgId: '" + this.message_id_ +
                 "'. MsgKey: '" + this.message_key_ +
                 "'. Date: '" + this.date_ +
                 "'. Folder: '" + this.folder_ +
                 "'. Refs: '" + this.references_ +
                 "'. Sent: '" + this.issent_ + "'";
}



/** ****************************************************************************
 * Test method
 ******************************************************************************/
Message.prototype.test = function()
{
    test1 = new Message("subject1",
                        "Sascha",
                        "23",
                        "23",
                        "1.1.2004 12:00",
                        "INBOX",
                        "");
    alert(test1.toString());

    test2 = new Message("RE:subject1",
                        "Iris",
                        "24",
                        "24",
                        "1.1.2004 12:00",
                        "INBOX",
                        "23");
    alert(test2.toString());

    test3 = new Message("RE[2]:subject1",
                        "Christian",
                        "25",
                        "25",
                        "1.1.2004 12:00",
                        "INBOX",
                        "23");
    alert(test3.toString());

    test4 = new Message("subject1 RE:",
                        "Iris",
                        "26",
                        "26",
                        "1.1.2004 12:00",
                        "INBOX",
                        "23");
    alert(test4.toString());

    test5 = new Message("Re:RE[2]:subject1 RE:",
                        "Sascha",
                        "27",
                        "27",
                        "1.1.2004 12:00",
                        "INBOX",
                        "24");
    alert(test5.toString());
}
