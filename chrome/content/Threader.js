/** ****************************************************************************
 * Threader.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * based on the algorithm from Jamie Zawinski <jwz@jwz.org>
 * www.jwz.org/doc/threading.html
 * Re-write from Java
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor
 ******************************************************************************/
function Threader()
{
    LOGGER_.logDebug("Threader()", {});
    /**
     * Link message ids to container objects
     */
    this.id_table_ = new Object();


    /**
     * Messages to be processes
     */
    this.messages_ = new Array;


    /**
     * The set of all root threads
     */
    this.root_set_ = new Container(true);


    /**
     * instance variables for methods
     */
    this.put_messages_in_container_done_ = false;
    this.put_messages_in_container_top_doing_ = false;
    this.put_messages_in_container_doing_ = false;
    this.put_messages_in_container_increment_ = 100;
    this.put_messages_in_container_counter_ = 0;

    this.find_rootset_top_doing_ = false;
    this.find_rootset_done_ = false;
    this.find_rootset_doing_ = false;

    this.prune_empty_containers_done_ = false;
    this.prune_empty_containers_top_doing_ = false;
    this.prune_empty_containers_doing_ = false;

    this.subject_table_ = new Object();

    this.put_containers_in_subject_table_done_ = false;
    this.put_containers_in_subject_table_top_doing_ = false;
    this.put_containers_in_subject_table_doing_ = false;

    this.group_by_subject_done_ = false;
    this.group_by_subject_top_doing_ = false;
    this.group_by_subject_doing_ = false;

    this.start_ = null;
    this.end_ = null;
    this.put_messages_in_container_start_ = null;
    this.put_messages_in_container_end_ = null;
    this.find_rootset_start_ = null;
    this.find_rootset_end_ = null;
    this.prune_empty_containers_start_ = null;
    this.prune_empty_containers_end_ = null;
    this.put_containers_in_subject_table_start_ = null;
    this.put_containers_in_subject_table_end_ = null;
    this.group_by_subject_start_ = null;
    this.group_by_subject_end_ = null;

    this.total_messages_ = 0;
}



/** ****************************************************************************
 * Add a new message
 * @param message The new Message to add
 ******************************************************************************/
Threader.prototype.addMessage = function(message)
{
    LOGGER_.logDebug("Threader.addMessage()",
                        {"message" : message});
    this.messages_.push(message);
}



/** ****************************************************************************
 * Add a new message
 * construct message here
 ******************************************************************************/
Threader.prototype.addMessageDetail = function(subject,
                                               author,
                                               messageId,
                                               messageKey,
                                               date,
                                               uri,
                                               references,
                                               issent)
{
    this.addMessage(new Message(subject,
                                author,
                                messageId,
                                messageKey,
                                date,
                                uri,
                                references,
                                issent));
}



/** ****************************************************************************
 * Find a message
 ******************************************************************************/
Threader.prototype.findContainer = function(message_id)
{
    LOGGER_.logDebug("Threader.findContainer()",
                        {"message_id" : message_id,
                         "return" : this.id_table_[message_id]});
    return this.id_table_[message_id];
}



/** ****************************************************************************
 * Get root container
 ******************************************************************************/
Threader.prototype.getRoot = function()
{
    LOGGER_.logDebug("Threader.getRoot()", {});
    return this.root_set_;
}



/** ***************************************************************************
 * top method to add all messages to a container
 ******************************************************************************/
Threader.prototype.topPutMessagesInContainer = function()
{
    if (! this.put_messages_in_container_top_doing_ &&
        ! this.put_messages_in_container_done_)
    {
        this.put_messages_in_container_top_doing_ = true;
        this.put_messages_in_container_counter_ = 0;
        LOGGER_.logDebug("Threader.topPutMessagesInContainer()",
                            {"action" : "start"});
        this.put_messages_in_container_start_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.putMessagesInContainer();}, 10);
    }
    if (this.put_messages_in_container_done_)
    {
        this.put_messages_in_container_end_ = (new Date()).getTime();
        this.put_messages_in_container_top_doing_ = false;
        LOGGER_.logDebug("Threader.topPutMessagesInContainer()",
                            {"action" : "end"});
        return;
    }
    var ref = this;
    setTimeout(function(){ref.topPutMessagesInContainer();}, 10);
}



/** ****************************************************************************
 * put all messages in a container
 * loop over all messages
 * use setTimeout to give mozilla time
 ******************************************************************************/
Threader.prototype.putMessagesInContainer = function()
{
    if (this.put_messages_in_container_doing_ &&
        ! this.put_messages_in_container_done_)
    {
        var ref = this;
        setTimeout(function() { ref.putMessagesInContainer(); }, 10);
        return;
    }

    this.put_messages_in_container_doing_ = true;

    //var counter = this.put_messages_in_container_counter_;
    //var maxcounter = counter + this.put_messages_in_container_increment_;
    var counter = 0;
    var maxcounter = this.put_messages_in_container_increment_;

    LOGGER_.logDebug("Threader.putMessagesInContainer()",
                        {"action" : "loop over all messages",
                         "startcounter" : counter,
                         "endcounter" : maxcounter,
                         "messages.length" : this.messages_.length});

    //for (counter;
    //     counter < this.messages_.length && counter < maxcounter;
    //     counter++)
    for (counter;
         counter < maxcounter;
         counter++)
    {
        //var message = this.messages_[counter];
        var message = this.messages_.pop();
        if (! message)
            break;
        this.total_messages_++;
        this.putMessageInContainer(message);
    }
    //this.put_messages_in_container_counter_ = counter;

    //if (this.put_messages_in_container_counter_ == this.messages_.length)
    if (this.messages_.length == 0)
    {
        this.put_messages_in_container_done_ = true;
    }
    else
    {
        var ref = this;
        setTimeout(function() { ref.putMessagesInContainer(); }, 10);
    }
    this.put_messages_in_container_doing_ = false;
}



/** ****************************************************************************
 * put this message in a container
 ******************************************************************************/
Threader.prototype.putMessageInContainer = function(message)
{
    LOGGER_.logDebug("Threader.putMessageInContainer()",
                        {"looking at" : message});

    // try to get message container
    var message_container = this.id_table_[message.getId()];

    if (message_container != null)
    {
        LOGGER_.logDebug("Threader.putMessageInContainer()",
                            {"action" : "found dummy container with message id",
                             "dummy" : message_container.isDummy(),
                             "sent" : message_container.isDummy() ? "false" : message_container.getMessage().isSent()});
        // if we found a container for this message id, either it's a dummy
        // or we have two mails with the same message-id
        // this should only happen if we sent a mail to a list and got back
        // our sent-mail in the inbox
        // in that case we want that our sent-mail takes precedence over
        // the other, since we want to display it as sent, and we only want
        // to display it once
        if (message_container.isDummy() ||
           (! message_container.isDummy() &&
            ! message_container.getMessage().isSent()))
        {
            // 1.A. id_table contains empty container for this message
            // store message in this container
            message_container.setMessage(message);
            // index container in hashtable
            this.id_table_[message.getId()] = message_container;
        }
        else if (! message_container.isDummy() && message_container.getMessage().isSent())
        {
            // the message in message_container is a sent message,
            // the new message is not the sent one
            // in this case we simply ignore the new message, since
            // the sent message takes precedence
            return;
        }
        else
        {
            message_container = null;
        }
    }

    if (message_container == null)
    {
        LOGGER_.logDebug("Threader.putMessageInContainer()",
                            {"action" : "no container found, create new one"});
        // no suitable container found, create new one
        message_container = new Container();
        message_container.setMessage(message);
        // index container in hashtable
        this.id_table_[message.getId()] = message_container;
    }

    LOGGER_.logDebug("Threader.putMessageInContainer()",
                        {"action" : "loop over references"});
    // for each element in references field of message
    var parent_reference_container = null;
    var references = message.getReferences().getReferences();
    for (referencekey in references)
    {
        var reference_id = references[referencekey];

        LOGGER_.logDebug("Threader.putMessageInContainer()",
                            {"reference" : reference_id});
        // try to find container for referenced message
        var reference_container = this.id_table_[reference_id];
        if (reference_container == null)
        {
            LOGGER_.logDebug("Threader.putMessageInContainer()",
                                {"action" : "no container found, create new one"});
            // no container found, create new one
            reference_container = new Container();
            // index container
            this.id_table_[reference_id] = reference_container;
        }

        // 1.B. link reference container together
        LOGGER_.logDebug("Threader.putMessageInContainer()",
                            {"action" : "link references together"});
        if (parent_reference_container != null &&                           // if we have a parent container
            ! reference_container.hasParent() &&                            // and current container does not have a parent
            parent_reference_container != reference_container &&            // and we are not looking at the same container
            ! parent_reference_container.findChild(reference_container))    // see if we are already a child of parent
        {
            LOGGER_.logDebug("Threader.putMessageInContainer()",
                                {"action" : "add us to parent reference container"});
            parent_reference_container.addChild(reference_container);
        }
        parent_reference_container = reference_container;
    }

    // set parent of current message to last element in references

    // if we have a suitable parent container, and the parent container is the current container
    // or the parent container is a child of the current container, discard it as parent
    if (parent_reference_container != null &&
        (parent_reference_container == message_container ||
        message_container.findChild(parent_reference_container)))
    {
        LOGGER_.logDebug("Threader.putMessageInContainer()",
                            {"action" : "set parent reference container to null"});
        parent_reference_container = null;
    }

    // if current message already has a parent
    if (message_container.hasParent() &&
        parent_reference_container != null)
    {
        // remove us from this parent
        LOGGER_.logDebug("Threader.putMessageInContainer()",
                            {"action" : "remove us from parent"});
        message_container.getParent().removeChild(message_container);
    }

    // if we have a suitable parent
    if (parent_reference_container != null)
    {
        // add us as child
        LOGGER_.logDebug("Threader.putMessageInContainer()",
                            {"action" : "add us as child to parent reference container"});
        parent_reference_container.addChild(message_container);
    }
}



/** ****************************************************************************
 * Top method to find the root set
 ******************************************************************************/
Threader.prototype.topFindRootSet = function()
{
    if (! this.find_rootset_top_doing_ &&
        ! this.find_rootset_done_ &&
        this.put_messages_in_container_done_)
    {
        this.find_rootset_top_doing_ = true;
        LOGGER_.logDebug("Threader.topFindRootSet()",
                            {"action" : "start"});
        this.find_rootset_start_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.findRootSet();}, 10);
    }
    if (this.find_rootset_done_)
    {
        this.find_rootset_end_ = (new Date()).getTime();
        this.find_rootset_top_doing_ = false;
        LOGGER_.logDebug("Threader.topFindRootSet()",
                            {"action" : "end"});
        return;
    }
    var ref = this;
    setTimeout(function(){ref.topFindRootSet();}, 10);
}



/** ****************************************************************************
 * Find the root set
 * These are all containers which have no parent
 ******************************************************************************/
Threader.prototype.findRootSet = function()
{
    if (this.find_rootset_doing_)
    {
        return;
    }

    this.find_rootset_doing_ = true;

    var rootkey = null;
    LOGGER_.logDebug("Threader.findRootSet()",
                        {"action" : "find root set"});
    for (rootkey in this.id_table_)
    {
        var container = this.id_table_[rootkey];
        if (! container.hasParent())
       {
           // root set contains all containers that have no parents
           this.root_set_.addChild(container);
           //root_set_.check();
        }
    }

    this.find_rootset_doing_ = false;
    this.find_rootset_done_ = true;
}



/** ****************************************************************************
 * Top method to prune all empty containers
 ******************************************************************************/
Threader.prototype.topPruneEmptyContainers = function()
{
    if (! this.prune_empty_containers_doing_ &&
        ! this.prune_empty_containers_top_done_ &&
        this.find_rootset_done_)
    {
        this.prune_empty_containers_top_doing_ = true;
        LOGGER_.logDebug("Threader.topPruneEmptyContainers()",
                            {"action" : "start"});
        this.prune_empty_containers_start_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.pruneEmptyContainers();}, 10);
    }
    if (this.prune_empty_containers_done_)
    {
        this.prune_empty_containers_end_ = (new Date()).getTime();
        this.prune_empty_containers_doing_ = false;
        LOGGER_.logDebug("Threader.topPruneEmptyContainers()",
                            {"action" : "end"});
        return;
    }
    var ref = this;
    setTimeout(function(){ref.topPruneEmptyContainers();}, 10);
}



/** ****************************************************************************
 * Prune all empty containers
 * do recursive pruneing on all containers
 ******************************************************************************/
Threader.prototype.pruneEmptyContainers = function()
{
    if (this.prune_empty_containers_doing_)
    {
        return;
    }

    this.prune_empty_containers_doing_ = true;

    LOGGER_.logDebug("Threader.pruneEmptyContainers()",
                        {"action" : "loop over root set"});
    var container = null;
    for (container = this.root_set_.getChild();
         container != null;
         container = container.getNext())
    {
        LOGGER_.logDebug("Threader.pruneEmptyContainers()",
                            {"container" : container});
        // if container is empty and has no children
        if (container.isDummy() &&
            ! container.hasChild())
        {
            LOGGER_.logDebug("Threader.pruneEmptyContainers()",
                                {"action" : "container does not belong to root set"});
            // remove from root_set_
            if (container.hasPrevious())
                container.getPrevious().setNext(container.getNext());
            else
                container.getParent().setChild(container.getNext());

            continue;
        }
        // if the container has no message, but children
        // actually we want to keep this dummy to preserve structure

        //else if (container.isDummy() && container.hasOneChild())
        //{
        //    // add children to root set
        //    var child = container.getChild();
        //
        //    var lastchild = child.getLast();
        //    lastchild.setNext(container.getNext());
        //
        //    // remove children from container
        //    container.removeChild();
        //
        //    // remove container from root_set_
        //
        //    if (container.hasPrevious())
        //    {
        //        container.getPrevious().setNext(child);
        //    }
        //    else
        //    {
        //        root_set_.setChild(child);
        //    }
        //
        //
        //    if (prev != null)
        //    {
        //        prev.setNext(child);
        //        container = prev;
        //    }
        //    else
        //    {
        //        root_set_.setChild(child);
        //        container = prev;
        //    }
        //    continue;
        //}

        // recursively prune empty containers
        container.pruneEmptyContainers();
    }

    this.prune_empty_containers_doing_ = false;
    this.prune_empty_containers_done_ = true;
}



/** ****************************************************************************
 * Top method to put all containers in the subject table
 ******************************************************************************/
Threader.prototype.topPutContainersInSubjectTable = function()
{
    if (! this.put_containers_in_subject_table_top_doing_ &&
        ! this.put_containers_in_subject_table_done_ &&
        this.prune_empty_containers_done_)
    {
        this.put_containers_in_subject_table_top_doing_ = true;
        LOGGER_.logDebug("Threader.topPutContainersInSubjectTable()",
                            {"action" : "start"});
        this.put_containers_in_subject_table_start_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.putContainersInSubjectTable();}, 10);
    }
    if (this.put_containers_in_subject_table_done_)
    {
        this.put_containers_in_subject_table_end_ = (new Date()).getTime();
        this.end_ = (new Date()).getTime();
        this.put_containers_in_subject_table_top_doing_ = false;
        LOGGER_.logDebug("Threader.topPutContainersInSubjectTable()",
                            {"action" : "end"});
        this.done_threading_ = true;
        var ref = this;
        setTimeout(function(){ref.logInfo();}, 10);
        return;
    }
    var ref = this;
    setTimeout(function(){ref.topPutContainersInSubjectTable();}, 10);
}



/** ****************************************************************************
 * Put all containers in subject table
 * always put topmost container in subject table
 * (i.e. container which is "least" reply
 ******************************************************************************/
Threader.prototype.putContainersInSubjectTable = function()
{
    if (this.put_containers_in_subject_table_doing_)
    {
        return;
    }

    this.put_containers_in_subject_table_doing_ = true;

    LOGGER_.logDebug("Threader.putContainersInSubjectTable()",
                        {"action" : "loop over root set"});
    var container = null;
    for (container = this.root_set_.getChild();
         container != null;
         container = container.getNext())
    {
        LOGGER_.logDebug("Threader.putContainersInSubjectTable()",
                            {"container" : container});
        // 5.B. find subject of subtree
        var subject = "";
        subject = container.getSimplifiedSubject();

        if (subject == "")
        {
            // in case of empty subject, give up on this container
            continue;
        }

        // try to find existing container with same subject
        var subject_container = this.subject_table_[subject];

        if (subject_container == null ||                                       // if we have to container with this subject OR
           (subject_container.isDummy() && ! container.isDummy()) ||           // if found one is empty, but this one is not OR
           (subject_container.getReplyCount() > container.getReplyCount()))    // if current is less reply than subject container
        {
            LOGGER_.logDebug("Threader.putContainersInSubjectTable()",
                                {"action" : "putting container in subject table"});
            this.subject_table_[subject] = container;
        }
    }

    this.put_containers_in_subject_table_doing_ = false;
    this.put_containers_in_subject_table_done_ = true;
}



/** ****************************************************************************
 * Top method to group containers by subject
 ******************************************************************************/
Threader.prototype.topGroupBySubject = function()
{
    if (! this.group_by_subject_top_doing_ &&
        ! this.group_by_subject_done_ &&
        this.put_containers_in_subject_table_done_)
    {
        this.group_by_subject_top_doing_ = true;
        LOGGER_.logDebug("Threader.topGroupBySubject()",
                            {"action" : "start"});
        this.group_by_subject_top_start_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.groupBySubject();}, 10);
    }
    if (this.group_by_subject_done_)
    {
        this.group_by_subject_end_ = (new Date()).getTime();
        this.end_ = (new Date()).getTime();
        this.group_by_subject_top_doing_ = false;
        LOGGER_.logDebug("Threader.topGroupBySubject()",
                            {"action" : "end"});
        var ref = this;
        setTimeout(function(){ref.logInfo();}, 10);
        return;
    }
    var ref = this;
    setTimeout(function(){ref.topGroupBySubject();}, 10);
}



/** ****************************************************************************
 * Group all containers by subject
 ******************************************************************************/
Threader.prototype.groupBySubject = function()
{
    if (this.group_by_subject_doing_)
    {
        return;
    }

    this.group_by_subject_doing_ = true;

    LOGGER_.logDebug("Threader.groupBySubject()",
                        {"action" : "loop over root set"});
    var container = null;
    for (container = this.root_set_.getChild();
         container != null;
         container = container.getNext())
    {
        LOGGER_.logDebug("Threader.groupBySubject()",
                            {"container" : container});
        // get subject of this container
        var subject = "";
        subject = container.getSimplifiedSubject();

        // get container for this subject in subject_table
        var subject_container = this.subject_table_[subject];
        if (subject_container == null ||
            subject_container == container)
        {
            // if no container found, or found ourselfs
            LOGGER_.logDebug("Threader.groupBySubject()",
                                {"action" : "no container in subject table or found ourselves"});
            continue;
        }
        // if both containers are dummies
        if (container.isDummy() &&
            subject_container.isDummy())
        {
            // append children of subject_container to container
            LOGGER_.logDebug("Threader.groupBySubject()",
                                {"action" : "both dummies"});
            container.addChild(subject_container.getChild());
        }
        // if container is dummy, subject container no dummy
        else if (container.isDummy() &&
                 ! subject_container.isDummy())
        {
            // add non empty container as child of empty container
            LOGGER_.logDebug("Threader.groupBySubject()",
                                {"action" : "container dummy, subject_container not"});
            container.addChild(subject_container);
        }
        // if container is no dummy but subject container is dummy
        else if (! container.isDummy() &&
                 subject_container.isDummy())
        {
            // add non empty container as child of empty container
            LOGGER_.logDebug("Threader.groupBySubject()",
                                {"action" : "container not dummy, subject_container dummy"});
            subject_container.addChild(container);
        }
        // if containers are misordered, change order
        else if (! subject_container.isDummy() &&
                 subject_container.getReplyCount() < container.getReplyCount())
        {
            LOGGER_.logDebug("Threader.groupBySubject()",
                                {"action" : "misordered 1"});
            // calculate difference between the messages
            var difference = container.getReplyCount() - subject_container.getReplyCount();
            var top = subject_container;
            while (difference > 1)
            {
                // insert dummy containers for missing messages
                difference--;
                var new_container = null;
                // if container has child, use that
                if (top.hasChild())
                {
                    new_container = top.getChild();
                }
                // otherwise create dummy container
                else
                {
                    new_container = new Container();
                    top.addChild(new_container);
                }
                top = new_container;
            }
            // add current container as child
            // if top has a dummy container, merge us in there
            if (top.hasDummy())
            {
                dummy = top.getDummy();
                top.mergeChild(dummy, container);
            }
            // otherwise just add us as child
            else
            {
                top.addChild(container);
            }

            // remove us from root set
            if (container.hasPrevious())
            {
                container.getPrevious().setNext(container.getNext());
            }
            else
            {
                container.getParent().setChild(container.getNext());
            }
        }
        // misordered again
        else if (! subject_container.isDummy() &&
                 subject_container.getReplyCount() > container.getReplyCount())
        {
            LOGGER_.logDebug("Threader.groupBySubject()", {"action" : "misordered 2"});
            // calculate difference between the messages
            var difference = subject_container.getReplyCount() - container.getReplyCount();
            var top = container;
            while (difference > 1)
            {
                // insert dummy containers for missing messages
                difference--;
                var new_container = null;
                // if container has child, use that
                if (top.hasChild())
                {
                    new_container = top.getChild();
                }
                // otherwise create dummy container
                else
                {
                    new_container = new Container();
                    top.addChild(new_container);
                }
                top = new_container;
            }

            // add current container as child
            // if top has a dummy container, merge us in there
            if (top.hasDummy())
            {
                dummy = top.getDummy();
                top.mergeChild(dummy, subject_container);
            }
            // otherwise just add us as child
            else
            {
                top.addChild(subject_container);
            }
        }
        // if none of the above, create new dummy container and add both as children
        else
        {
            // remove both from list of siblings

            var new_container = new Container();

            var tmp = container.getPrevious();;
            new_container.addChild(container);
            new_container.addChild(subject_container);
            this.root_set_.addChild(new_container);
            container = tmp;
        }
    }

    this.group_by_subject_doing_ = false;
    this.group_by_subject_done_ = true;
    this.done_threading_ = true;
}



/** ****************************************************************************
 * Thread all messages
 ******************************************************************************/
Threader.prototype.thread = function()
{
    this.done_threading_ = false;
    this.put_messages_in_container_done_ = false;
    this.find_rootset_done_ = false;
    this.prune_empty_containers_done_ = false;
    this.put_containers_in_subject_table_done_ = false;
    this.group_by_subject_done_ = false;
    
    this.start_ = (new Date()).getTime();
    LOGGER_.log("threader", {"action" : "start"});
    // 1. For each message
    //this.id_table_ = new Object();
    this.topPutMessagesInContainer();

    // 2. Find the root set
    // walk over all elements in id_table
    this.topFindRootSet();

    // 3. Discard id_table
    // do not discard id_table_, we might need it to find individual messages
    //id_table_ = null;

    // 4. Prune empty containers
    // recursively walk all containers under root set
    // for each container
    this.topPruneEmptyContainers();

    // 5. Group root set by subject
    // 5.A. create new hashtable for all subjects
    //this.subject_table_ = new Object();

    // 5.B. put all containers in subject table
    this.topPutContainersInSubjectTable();

    // 5.C. group all containers by subject
    //this.topGroupBySubject();

    // 6. that's it
    //root_set_.check();
}



/** ****************************************************************************
 * return true if threading is done
 ******************************************************************************/
Threader.prototype.getDone = function()
{
    return this.done_threading_;
}



/** ****************************************************************************
 * Output root set as string
 ******************************************************************************/
Threader.prototype.toString = function()
{
    var string = "\n-----\n";
    string += root_set_.toString("\n");
    return string;
}



/** ****************************************************************************
 * Test Method
 ******************************************************************************/
Threader.prototype.test = function()
{
    threader = new Threader();
    threader.addMessage(new Message("Subject 1",
                                    "From 1 <from1@inter.net>",
                                    "1@inter.net",
                                    "0",
                                    "9. 7. 2004 17:33:56",
                                    "Inbox",
                                    ""));
    threader.addMessage(new Message("Subject 2",
                                    "From 2 <from2@inter.net>",
                                    "2@inter.net",
                                    "0",
                                    "9. 7. 2004 17:33:56",
                                    "Inbox",
                                    "1@inter.net"));

    threader.thread();
    alert(threader.toString());
}


/** ****************************************************************************
 * Log info about threading
 ******************************************************************************/
Threader.prototype.logInfo = function()
{
    if (! LOGGER_.doLogging())
        return;

    var time_put_messages_in_container = this.put_messages_in_container_end_ -
                                         this.put_messages_in_container_start_;
    var time_find_rootset = this.find_rootset_end_ -
                            this.find_rootset_start_;
    var time_prune_empty_containers = this.prune_empty_containers_end_ -
                                      this.prune_empty_containers_start_;
    var time_put_containers_in_subject_table = this.put_containers_in_subject_table_end_ -
                                               this.put_containers_in_subject_table_start_;
    var time_group_by_subject = this.group_by_subject_end_ -
                                this.group_by_subject_start_;
    var time_total = this.end_ -
                     this.start_;

    //var total_messages = this.messages_.length;
    var total_messages = this.total_messages_;
    var time_per_message = time_total / total_messages;

    var num_threads = this.getRoot().getChildCount();
    var msg_per_thread = total_messages / num_threads;

    var distribution = this.getThreadDistribution();

    var timing = {"put messages in container" : time_put_messages_in_container,
                  "find root set" : time_find_rootset,
                  "prune empty containers" : time_prune_empty_containers,
                  "put containers in subject table" : time_put_containers_in_subject_table,
                  "group by subject" : time_group_by_subject,
                  "total" : time_total,
                  "per message" : time_per_message};

    LOGGER_.log("threader",
                    {"action" : "end",
                     "total messages" : total_messages,
                     "total threads" : num_threads, 
                     "messages per thread" : msg_per_thread,
                     "distribution" : distribution,
                     "timing" : timing});
}



/** ****************************************************************************
 * get statistical info about message distribution
 ******************************************************************************/
Threader.prototype.getThreadDistribution = function()
{
    LOGGER_.logDebug("Threader.getThreadDistribution()", {});
    var distribution = new Array();
    var container = null;
    for (container = this.root_set_.getChild();
         container != null;
         container = container.getNext())
    {
        var count = container.getCountRecursive();
        if (distribution[count])
            distribution[count]++;
        else
            distribution[count] = 1;
    }
    return distribution;
}
