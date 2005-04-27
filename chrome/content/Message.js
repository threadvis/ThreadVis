/* *******************************************************
 * Message.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * Wrap email message
 * Re-write from Java
 * Version: $Id$
 ********************************************************/

/**
 * Constructor
 */
function Message(subject, from, message_id, message_key, date, folder, references)
{
    /**
     * Message date
     */
    // fixxme parseing
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


    // javascript function hooks
    this.getDate = Message_getDate;
    this.getFolder = Message_getFolder;
    this.getFrom = Message_getFrom;
    this.getId = Message_getId;
    this.getKey = Message_getKey;
    this.getReferences = Message_getReferences;
    this.getReplyCount = Message_getReplyCount;
    this.getSimplifiedSubject = Message_getSimplifiedSubject;
    this.getSubject = Message_getSubject;
    this.isReply = Message_isReply;
    this.isSent = Message_isSent;
    this.toString = Message_toString;
}


/**
 * Get date of message
 */
function Message_getDate()
{
    return this.date_;
}


/**
 * Get folder message is in
 */
function Message_getFolder()
{
    return this.folder_;
}


/**
 * Get sender of message
 */
function Message_getFrom()
{
    return this.from_;
}


/**
 * Get message id
 */
function Message_getId()
{
    return this.message_id_;
}


/**
 * Get message key
 */
function Message_getKey()
{
    return this.message_key_;
}


/**
 * Get references
 */
function Message_getReferences()
{
    return this.references_;
}


/**
 * Get reply count of this message
 */
function Message_getReplyCount()
{
    return this.reply_count_;
}


/**
 * Get simplified subject
 */
function Message_getSimplifiedSubject()
{
    return this.simplified_subject_;
}


/**
 * Get original subject
 */
function Message_getSubject()
{
    return this.subject_;
}


/**
 * See if this message is a reply
 */
function Message_isReply()
{
    return (this.reply_count_ > 0);
}


/**
 * See if message is sent (i.e. in sent-mail folder)
 */
function Message_isSent()
{
    // fixxme
    // find a better regex
    return (this.getFolder().search(/.*\/Sent.*/) != -1);
}


/**
 * Get simplyfied subject of message
 * Strip all Re:
 * fixxme
 */
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


/**
 * Return message as string
 */
function Message_toString()
{
    return "Message: '" + this.getSubject() + "' with simplyfied subject '" + this.getSimplifiedSubject() + "' and id '" + this.getId() + "' and refs '" + this.getReferences() + "' and recount '" + this.getReplyCount() + "'";
}



// ********************************************************



/**
 * Test method
 */
function Message_test()
{
    test1 = new Message("subject1", "Sascha", "23", "23", "1.1.2004 12:00", "INBOX", "");
    alert(test1.toString());

    test2 = new Message("RE:subject1", "Iris", "24", "24", "1.1.2004 12:00", "INBOX", "23");
    alert(test2.toString());

    test3 = new Message("RE[2]:subject1", "Christian", "25", "25", "1.1.2004 12:00", "INBOX", "23");
    alert(test3.toString());

    test4 = new Message("subject1 RE:", "Iris", "26", "26", "1.1.2004 12:00", "INBOX", "23");
    alert(test4.toString());

    test5 = new Message("Re:RE[2]:subject1 RE:", "Sascha", "27", "27", "1.1.2004 12:00", "INBOX", "24");
    alert(test5.toString());
}
