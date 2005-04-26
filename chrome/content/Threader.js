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


    // javascript links to methods
    this.addMessage = Threader_addMessage;
    this.addMessageDetail = Threader_addMessageDetail;
    this.findContainer = Threader_findContainer;
    this.getRoot = Threader_getRoot;
    this.thread = Threader_thread;
    this.toString = Threader_toString;
    this.visualise = Threader_visualise;
}


/**
 * Add a new message
 * @param message The new Message to add
 */
function Threader_addMessage(message)
{
    this.messages_.push(message);
}


/**
 * Add a new message
 * construct message here
 */
function Threader_addMessageDetail(subject, author, messageId, messageKey, date, uri, references)
{
    this.addMessage(new Message(subject, author, messageId, messageKey, date, uri, references));
}


/**
 * Find a message
 */
function Threader_findContainer(message_id)
{
    return this.id_table_[message_id];
}


/**
 * Get root container
 */
function Threader_getRoot()
{
    return this.root_set_;
}


/**
 * Do actual threading work
 */
function Threader_thread()
{
    // 1. For each message
    this.id_table_ = new Object();
    for (messagekey in this.messages_)
    {
        var message = this.messages_[messagekey];

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

    // 2. Find the root set
    // walk over all elements in id_table
    var rootkey = null;
    for (rootkey in this.id_table_)
    {
        container = this.id_table_[rootkey];
        if (! container.hasParent())
        {
            // root set contains all containers that have no parents
            this.root_set_.addChild(container);
            //root_set_.check();
        }
    }

    //root_set_.check();

    // 3. Discard id_table
    // do not discard id_table_, we might need it to find individual messages
    //id_table_ = null;

    // 4. Prune empty containers
    // recursively walk all containers under root set
    // for each container
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
        /*
        else if (container.isDummy() && container.hasOneChild())
        {
            // add children to root set
            var child = container.getChild();

            var lastchild = child.getLast();
            lastchild.setNext(container.getNext());

            // remove children from container
            container.removeChild();

            // remove container from root_set_

            if (container.hasPrevious())
            {
                container.getPrevious().setNext(child);
            }
            else
            {
                root_set_.setChild(child);
            }


            if (prev != null)
            {
                prev.setNext(child);
                container = prev;
            }
            else
            {
                root_set_.setChild(child);
                container = prev;
            }
            continue;
        }
        */
        // recursively prune empty containers
        container.pruneEmptyContainers();
    }


    // 5. Group root set by subject
    // 5.A. create new hashtable for all subjects
    var subject_table = new Object();

    // 5.B. iterate over all containers in root set
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
        var subject_container = subject_table[subject];

        if (subject_container == null ||                                        // if we have to container with this subject OR
            (subject_container.isDummy() && ! container.isDummy()) ||           // if found one is empty, but this one is not OR
            (subject_container.getReplyCount() > container.getReplyCount()))    // if current is less reply than subject container
        {
            subject_table[subject] = container;
        }
    }

    // 5.C. iterator over root set
    var container = null;
    for (container = this.root_set_.getChild(); container != null; container = container.getNext())
    {
        // get subject of this container
        var subject = "";
        subject = container.getSimplifiedSubject();

        // get container for this subject in subject_table
        var subject_container = subject_table[subject];
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
                new_container = null;
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
                new_container = null;
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

            new_container = new Container();

            tmp = container.getPrevious();;
            new_container.addChild(container);
            new_container.addChild(subject_container);
            this.root_set_.addChild(new_container);
            container = tmp;
        }
    }
    // 6. that's it
    //root_set_.check();
}


/**
 * Output root set as string
 */
function Threader_toString()
{
    var string = "\n-----\n";
    string += this.root_set_.toString("\n");
    return string;
}


/**
 * visualise a message
 */
function Threader_visualise(message_id)
{
    var container = this.findContainer(message_id);
    if (container != null)
    {
        visualisation_.visualise(container);
    }
}


/**
 * Test Method
 */
function Threader_test()
{
    threader = new Threader();
    threader.addMessage(new Message("Subject 1", "From 1 <from1@inter.net>", "1@inter.net", "0", "9. 7. 2004 17:33:56", "Inbox", ""));
    threader.addMessage(new Message("Subject 2", "From 2 <from2@inter.net>", "2@inter.net", "0", "9. 7. 2004 17:33:56", "Inbox", "1@inter.net"));

    threader.thread();
    alert(threader.toString());
}
