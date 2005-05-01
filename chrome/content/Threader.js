/* *******************************************************
 * Threader.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * based on the algorithm from Jamie Zawinski <jwz@jwz.org>
 * www.jwz.org/doc/threading.html
 * Re-write from Java
 *
 * $Id$
 ********************************************************/


/**
 * Constructor
 */
function Threader()
{
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


    this.done_1_ = false;
    this.doing_1_ = false;
    this.doing_11_ = false;

    this.doing_2_ = false;
    this.done_2_ = false;
    this.doing_21_ = false;

    this.doing_4_ = false;
    this.done_4_ = false;

    this.subject_table_ = null;
    this.doing_5b_ = false;
    this.done_5b_ = false;

    this.doing_5c_ = false;
    this.done_5c_ = false;
}


/**
 * Add a new message
 * @param message The new Message to add
 */
Threader.prototype.addMessage = function(message)
{
    this.messages_.push(message);
}


/**
 * Add a new message
 * construct message here
 */
Threader.prototype.addMessageDetail = function(subject, author, messageId, messageKey, date, uri, references, issent)
{
    this.addMessage(new Message(subject, author, messageId, messageKey, date, uri, references, issent));
}


/**
 * Find a message
 */
Threader.prototype.findContainer = function(message_id)
{
    return this.id_table_[message_id];
}


/**
 * Get root container
 */
Threader.prototype.getRoot = function()
{
    return root_set_;
}


Threader.prototype.do1 = function()
{
    if (! this.doing_1_ && ! this.done_1_)
    {
        this.doing_1_ = true;
        this.start_1_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.do11();}, 10);
    }
    if (this.done_1_)
    {
        this.end_1_ = (new Date()).getTime();
        return;
    }
    var ref = this;
    setTimeout(function(){ref.do1();}, 10);
}

Threader.prototype.do11 = function()
{
    if (this.doing_11_)
    {
        return;
    }
    
    this.doing_11_ = true;
    
    var key = null;
    for (key in this.messages_)
    {
        var message = this.messages_[key];

        // try to get message container
        var message_container = this.id_table_[message.getId()];

        if (message_container != null)
        {
            if (message_container.isDummy())
            {
                // 1.A. id_table contains empty container for this message
                // store message in this container
                message_container.setMessage(message);
                // index container in hashtable
                this.id_table_[message.getId()] = message_container;
            }
            else
            {
                message_container = null;
            }
        }

        if (message_container == null)
        {
            // no suitable container found, create new one
            message_container = new Container();
            message_container.setMessage(message);
            // index container in hashtable
            this.id_table_[message.getId()] = message_container;
        }

        // for each element in references field of message
        var parent_reference_container = null;
        var references = message.getReferences().getReferences();
        for (referencekey in references)
        {
            var reference_id = references[referencekey];

            // try to find container for referenced message
            var reference_container = this.id_table_[reference_id];
            if (reference_container == null)
            {
                // no container found, create new one
                reference_container = new Container();
                // index container
                this.id_table_[reference_id] = reference_container;
            }

            // 1.B. link reference container together

            if (parent_reference_container != null &&                           // if we have a parent container
                ! reference_container.hasParent() &&                            // and current container does not have a parent
                parent_reference_container != reference_container &&            // and we are not looking at the same container
                ! parent_reference_container.findChild(reference_container))      // see if we are already a child of parent
            {
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
            parent_reference_container = null;
        }

        // if current message already has a parent
        if (message_container.hasParent() && parent_reference_container != null)
        {
            // remove us from this parent
            message_container.getParent().removeChild(message_container);
        }

        // if we have a suitable parent
        if (parent_reference_container != null)
        {
            // add us as child
            parent_reference_container.addChild(message_container);
        }
    }
    
    this.done_11_ = true;
    this.doing_11_ = false;
    this.done_1_ = true;
}


Threader.prototype.do2 = function()
{
    if (! this.doing_2_ && ! this.done_2_ && this.done_1_)
    {
        this.doing_2_ = true;
        this.start_2_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.do21();}, 10);
    }
    if (this.done_2_)
    {
        this.end_2_ = (new Date()).getTime();
        return;
    }
    var ref = this;
    setTimeout(function(){ref.do2();}, 10);
}


Threader.prototype.do21 = function()
{
    if (this.doing_21_)
    {
        return;
    }
    
    this.doing_21_ = true;

    var rootkey = null;
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

    this.done_21_ = true;
    this.doing_21_ = false;
    this.done_2_ = true;
}


Threader.prototype.do4 = function()
{
    if (! this.doing_4_ && ! this.done_4_ && this.done_2_)
    {
        this.doing_4_ = true;
        this.start_4_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.do41();}, 10);
    }
    if (this.done_4_)
    {
        this.end_4_ = (new Date()).getTime();
        return;
    }
    var ref = this;
    setTimeout(function(){ref.do4();}, 10);
}


Threader.prototype.do41 = function()
{
    if (this.doing_41_)
    {
        return;
    }
    
    this.doing_41_ = true;

    var container = null;
    for (container = this.root_set_.getChild(); container != null; container = container.getNext())
    {

        // if container is empty and has no children
        if (container.isDummy() && ! container.hasChild())
        {
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
    this.done_41_ = true;
    this.doing_41_ = false;
    this.done_4_ = true;
}


Threader.prototype.do5b = function()
{
    if (! this.doing_5b_ && ! this.done_5b_ && this.done_4_)
    {
        this.doing_5b_ = true;
        this.start_5b_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.do5b1();}, 10);
    }
    if (this.done_5b_)
    {
        this.end_5b_ = (new Date()).getTime();
        return;
    }
    var ref = this;
    setTimeout(function(){ref.do5b();}, 10);
}


Threader.prototype.do5b1 = function()
{
    if (this.doing_5b1_)
    {
        return;
    }
    
    this.doing_5b1_ = true;

    var container = null;
    for (container = this.root_set_.getChild(); container != null; container = container.getNext())
    {
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

        if (subject_container == null ||                                        // if we have to container with this subject OR
           (subject_container.isDummy() && ! container.isDummy()) ||           // if found one is empty, but this one is not OR
           (subject_container.getReplyCount() > container.getReplyCount()))    // if current is less reply than subject container
        {
            this.subject_table_[subject] = container;
        }
    }

    this.done_5b1_ = true;
    this.doing_5b1_ = false;
    this.done_5b_ = true;
}


Threader.prototype.do5c = function()
{
    if (! this.doing_5c_ && ! this.done_5c_ && this.done_5b_)
    {
        this.doing_5c_ = true;
        this.start_5c_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.do5c1();}, 10);
    }
    if (this.done_5c_)
    {
        this.end_5c_ = (new Date()).getTime();
        var ref = this;
        setTimeout(function(){ref.logInfo();}, 10);
        return;
    }
    var ref = this;
    setTimeout(function(){ref.do5c();}, 10);
}

Threader.prototype.do5c1 = function()
{
    if (this.doing_5c1_)
    {
        return;
    }
    
    this.doing_5c1_ = true;
    
    var container = null;
    for (container = this.root_set_.getChild(); container != null; container = container.getNext())
    {
        // get subject of this container
        var subject = "";
        subject = container.getSimplifiedSubject();

        // get container for this subject in subject_table
        var subject_container = this.subject_table_[subject];
        if (subject_container == null || subject_container == container)
        {
            // if no container found, or found ourselfs
            continue;
        }
        // if both containers are dummies
        if (container.isDummy() && subject_container.isDummy())
        {
            // append children of subject_container to container
            container.addChild(subject_container.getChild());
        }
        // if container is dummy, subject container no dummy
        else if (container.isDummy() && ! subject_container.isDummy())
        {
            // add non empty container as child of empty container
            container.addChild(subject_container);
        }
        // if container is no dummy but subject container is dummy
        else if (! container.isDummy() && subject_container.isDummy())
        {
            // add non empty container as child of empty container
            subject_container.addChild(container);
        }
        // if containers are misordered, change order
        else if (! subject_container.isDummy() && subject_container.getReplyCount() < container.getReplyCount())
        {
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
        else if (! subject_container.isDummy() && subject_container.getReplyCount() > container.getReplyCount())
        {
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
    this.done_5c1_ = true;
    this.doing_5c1_ = false;
    this.done_5c_ = true;
    this.done_threading_ = true;
}


Threader.prototype.thread = function()
{
    LOGGER_.log("Threader.js: start threading.");
    // 1. For each message
    this.id_table_ = new Object();
    this.do1();

    // 2. Find the root set
    // walk over all elements in id_table
    this.do2();

    // 3. Discard id_table
    // do not discard id_table_, we might need it to find individual messages
    //id_table_ = null;

    // 4. Prune empty containers
    // recursively walk all containers under root set
    // for each container
    this.do4();

    // 5. Group root set by subject
    // 5.A. create new hashtable for all subjects
    //var subject_table = new Object();
    this.subject_table_ = new Object();

    // 5.B. iterate over all containers in root set
    this.do5b();

    // 5.C. iterator over root set
    this.do5c();

    // 6. that's it
    //root_set_.check();
}
// =============================================================================
// / HALF SETTIMEOUT IMPLEMENTATION
// =============================================================================




Threader.prototype.getDone = function()
{
    return this.done_5c_;
}


/**
 * Output root set as string
 */
Threader.prototype.toString = function()
{
    var string = "\n-----\n";
    string += root_set_.toString("\n");
    return string;
}


/**
 * visualise a message
 */
Threader.prototype.visualise = function(message_id)
{
    var container = this.findContainer(message_id);
    if (container != null)
    {
        THREADARCS_.visualise(container);
    }
    else
    {
        THREADARCS_.clearVisualisation();
    }
    container = null;
}


/**
 * Test Method
 */
Threader.prototype.test = function()
{
    threader = new Threader();
    threader.addMessage(new Message("Subject 1", "From 1 <from1@inter.net>", "1@inter.net", "0", "9. 7. 2004 17:33:56", "Inbox", ""));
    threader.addMessage(new Message("Subject 2", "From 2 <from2@inter.net>", "2@inter.net", "0", "9. 7. 2004 17:33:56", "Inbox", "1@inter.net"));

    threader.thread();
    alert(threader.toString());
}


Threader.prototype.logInfo = function()
{
    var time_1 = this.end_1_ - this.start_1_;
    var time_2 = this.end_2_ - this.start_2_;
    var time_4 = this.end_4_ - this.start_4_;
    var time_5b = this.end_5b_ - this.start_5b_;
    var time_5c = this.end_5c_ - this.start_5c_;
    var time_total = time_1 + time_2 + time_4 + time_5b + time_5c;
    
    var total_messages = this.messages_.length;
    var logtext = "Threader.js: Threading done.";
    logtext += "\nTotal messages threaded: " + total_messages;
    logtext += "\nTiming information:";
    logtext += "\n1: " + time_1 + "ms";
    logtext += "\n2: " + time_2 + "ms";
    logtext += "\n4: " + time_4 + "ms";
    logtext += "\n5b: " + time_5b + "ms";
    logtext += "\n5c: " + time_5c + "ms";
    logtext += "\nTotal: " + time_total + "ms";
    logtext += "\nThat are " + (time_total / total_messages) + "ms per message";
    LOGGER_.log(logtext);
}