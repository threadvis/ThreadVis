/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2005-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Thread a list of messages by looking at the references header and
 * additional information
 *
 * Based on the algorithm from Jamie Zawinski <jwz@jwz.org>
 * www.jwz.org/doc/threading.html
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor
 *
 * @param cache
 *          The cache to look up copy/cuts in
 * @return
 *          A new threader object
 ******************************************************************************/
ThreadVisNS.Threader = function(cache) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Threader()", {});
    }

    /**
     * Link message ids to container objects
     */
    this.idTable = new Object();

    /**
     * Messages to be processes
     */
    this.messages = new Object();

    /**
     * The cache to look up copy/cuts in
     */
    this.cache = cache;
}



/** ****************************************************************************
 * Add a new message
 *
 * @param message
 *          The new Message to add
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Threader.prototype.addMessage = function(message) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Threader.addMessage()", {"message" : message});
    }
    this.messages[message.getId()] = message;
}



/** ****************************************************************************
 * Add a new message
 *
 * @param subject
 *          The subject of the message
 * @param author
 *          The author of the message
 * @param messageId
 *          The messageid of the message
 * @param messageKey
 *          The key of the message
 * @param date
 *          The date of the message
 * @param uri
 *          The URI of the message
 * @param references
 *          The references string
 * @param issent
 *          True if the message is sent
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Threader.prototype.addMessageDetail = function(subject, author, messageId,
    messageKey, date, uri, references, issent) {
    this.addMessage(new ThreadVisNS.Message(subject, author, messageId, messageKey, date, 
        uri, references, issent));
}



/** ****************************************************************************
 * Find a message
 *
 * @return messageId
 *          The message id to search
 * @return
 *          The found message, null if message does not exist
 ******************************************************************************/
ThreadVisNS.Threader.prototype.findContainer = function(messageId) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO, 
            "Threader.findContainer()", {"messageId" : messageId,
            "return" : this.idTable[messageId]});
    }
    return this.idTable[messageId];
}



/** ****************************************************************************
 * Put all messages in a container
 *
 * @param accountKey
 *          The account key in which to thread
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Threader.prototype.putMessagesInContainer = function(accountKey) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Threader.putMessagesInContainer()", {"action" : 
            "loop over all messages"});
    }

    var count = 0;
    for (var id in this.messages) {
        count++;
        var message = this.messages[id];
        this.totalMessages++;
        this.putMessageInContainer(message, accountKey);
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Threader.putMessagesInContainer()", {"action" : 
            "end", "count" : count});
    }

    // reset this.messages
    this.messages = null;
    delete this.messages;
    this.messages = {}
}



/** ****************************************************************************
 * Put this message in a container
 *
 * @param message
 *          The message to put into a container
 * @param accountKey
 *          The account key in which to thread
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Threader.prototype.putMessageInContainer = function(message,
    accountKey) {
    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO, 
            "Threader.putMessageInContainer()", {"looking at" : message});
    }

    // try to get message container
    var messageContainer = this.idTable[message.getId()];

    if (messageContainer != null) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Threader.putMessageInContainer()", {
                "action" : "found dummy container with message id",
                "dummy" : messageContainer.message == null,
                "sent" : messageContainer.message == null ? "false" :
                messageContainer.getMessage().isSent()});
        }

        // if we found a container for this message id, either it's a dummy
        // or we have two mails with the same message-id
        // this should only happen if we sent a mail to a list and got back
        // our sent-mail in the inbox
        // in that case we want that our sent-mail takes precedence over
        // the other, since we want to display it as sent, and we only want
        // to display it once
        if (messageContainer.isDummy() ||
           (! messageContainer.isDummy() &&
            ! messageContainer.getMessage().isSent())) {
            // 1.A. idTable contains empty container for this message
            // store message in this container
            messageContainer.setMessage(message);
            // index container in hashtable
            this.idTable[message.getId()] = messageContainer;
        } else if (! messageContainer.isDummy() &&
            messageContainer.getMessage().isSent()) {
            // the message in message_container is a sent message,
            // the new message is not the sent one
            // in this case we simply ignore the new message, since
            // the sent message takes precedence
            return;
        } else {
            messageContainer = null;
        }
    }

    if (messageContainer == null) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Threader.putMessageInContainer()",
                {"action" : "no container found, create new one"});
        }

        // no suitable container found, create new one
        messageContainer = new ThreadVisNS.Container();
        messageContainer.setMessage(message);
        // index container in hashtable
        this.idTable[message.getId()] = messageContainer;
    }

    if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
            "Threader.putMessageInContainer()", {"action" : "loop over references"});
    }

    // for each element in references field of message
    var parentReferenceContainer = null;
    var parentReferenceId = "";
    var references = message.getReferences().getReferences();

    for (referencekey in references) {
        var referenceId = references[referencekey];

        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Threader.putMessageInContainer()", {"reference" : referenceId});
        }

        // try to find container for referenced message
        var referenceContainer = this.idTable[referenceId];
        if (referenceContainer == null) {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "Threader.putMessageInContainer()", {"action" :
                    "no container found, create new one"});
            }

            // no container found, create new one
            referenceContainer = new ThreadVisNS.Container();
            // index container
            this.idTable[referenceId] = referenceContainer;
        }

        // 1.B. link reference container together
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Threader.putMessageInContainer()",
                {"action" : "link references together"});
        }

        // if we have a parent container
        // and current container does not have a parent
        // and we are not looking at the same container
        // see if we are already a child of parent
        if (parentReferenceContainer != null &&
            ! referenceContainer.hasParent() &&
            parentReferenceContainer != referenceContainer &&
            ! referenceContainer.findParent(parentReferenceContainer)) {
            // check if this reference is overridden by a cut
            // (i.e. thread is split by user)
            if (this.cache.getCut(accountKey, referenceId) == parentReferenceId) {
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                        "Threader.putMessageInContainer()", 
                        {"action" : "message cut, do not add us to parent"});
                    }
            } else {
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                        "Threader.putMessageInContainer()",
                        {"action" : "add us to parent reference container"});
                }
                parentReferenceContainer.addChild(referenceContainer);
            }
        }
        parentReferenceContainer = referenceContainer;
        parentReferenceId = referenceId;
    }

    // set parent of current message to last element in references

    // if we have a suitable parent container, and the parent container is
    // the current container or the parent container is a child of the
    // current container, discard it as parent
    if (parentReferenceContainer != null
        && (parentReferenceContainer == messageContainer
        || parentReferenceContainer.findParent(messageContainer))) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Threader.putMessageInContainer()",
                {"action" : "set parent reference container to null"});
        }
        parentReferenceContainer = null;
    }

    // if current message already has a parent
    if (messageContainer.hasParent() && parentReferenceContainer != null) {
        // remove us from this parent
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Threader.putMessageInContainer()",
                {"action" : "remove us from parent"});
        }
        messageContainer.getParent().removeChild(messageContainer);
    }

    // get copy
    // check if user added a new reference, if so, add us to this parent
    // previous relation should have been taken care of by a cut
    var copyId = this.cache.getCopy(accountKey, message.getId());

    if (copyId) {
        if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
            THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                "Threader.putMessageInContainer()",
                {"action" : "message copied", "copyId" : copyId});
        }

        var parentContainer = this.idTable[copyId];
        if (parentContainer == null) {
            if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
                THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                    "Threader.putMessageInContainer()",
                    {"action" : "no container found, create new one"});
            }

            // no container found, create new one
            parentContainer = new ThreadVisNS.Container();
            // index container
            this.idTable[copyId] = parentContainer;
        }
        parentContainer.addChild(messageContainer);
    } else {
        // if we have a suitable parent
        if (parentReferenceContainer != null) {
            // and this container wasn't cut
            if (this.cache.getCut(accountKey, message.getId()) == parentReferenceId) {
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                        "Threader.putMessageInContainer()",
                        {"action" : "message cut, do not add us to parent"});
                }
            } else {
                // add us as child
                if (THREADVIS.logger.isDebug(THREADVIS.logger.COMPONENT_THREADER)) {
                    THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_INFO,
                     "Threader.putMessageInContainer()",
                     {"action" : "add us as child to parent reference container"});
                }
                parentReferenceContainer.addChild(messageContainer);
            }
        }
    }
}



/** ****************************************************************************
 * Find a message
 *
 * @param messageId
 *          The message id of the message to find
 * @return
 *          True if the message exists in the threader, false if not
 ******************************************************************************/
ThreadVisNS.Threader.prototype.hasMessage = function(messageId) {
    if (this.messages[messageId]) {
        return true;
    }

    if (this.idTable[messageId] && ! this.idTable[messageId].isDummy()) {
        return true;
    }

    return false;
}



/** ****************************************************************************
 * Thread all messages
 *
 * @param accountKey
 *          The account key in which to thread
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Threader.prototype.thread = function(accountKey) {
    THREADVIS.setStatus("Threading ...");

    this.start = (new Date()).getTime();
    THREADVIS.logger.log("threader", {"action" : "start"});
    THREADVIS.setStatus("Threading ...");

    // 1. For each message
    this.putMessagesInContainer(accountKey);

    THREADVIS.setStatus("");
}



/** ****************************************************************************
 * Reset in-memory data
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Threader.prototype.reset = function() {
    delete this.idTable;
    this.idTable = new Object();
    delete this.rootSet;
    this.rootSet = new ThreadVisNS.Container(true);
    delete this.messages;
    this.messages = new Object();
}
