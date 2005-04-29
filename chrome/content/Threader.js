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


var done_1_ = false;
var doing_1_ = false;
var doing_1_messagekeys_ = new Array();
var doing_11_ = false;
var start_1_ = null;
var end_1_ = null;

var doing_2_ = false;
var done_2_ = false;
var doing_21_ = false;
var doing_2_rootkeys_ = new Array();
var start_2_ = null;
var end_2_ = null;

var doing_4_ = false;
var done_4_ = false;
var doing_4_containers_ = new Array();
var doing_41_ = false;
var start_4_ = null;
var end_4_ = null;

var subject_table_ = null;
var doing_5b_containers_ = new Array();
var doing_5b_ = false;
var done_5b_ = false;
var doing_5b1_ = false;
var start_5b_ = null;
var end_5b_ = null;

var doing_5c_ = false;
var done_5c_ = false;
var doing_5c_containers_ = new Array();
var doing_5c1_ = false;
var start_5c_ = null;
var end_5c_ = null;


var messages_ = new Array;
var id_table_ = new Object();
var root_set_ = new Container(true);
/**
 * Constructor
 */
function Threader()
{
    /**
     * Link message ids to container objects
     */
//    this.id_table_ = new Object();


    /**
     * Messages to be processes
     */
//    this.messages_ = new Array;


    /**
     * The set of all root threads
     */
    //this.root_set_ = new Container(true);


    // javascript links to methods
    this.addMessage = Threader_addMessage;
    this.addMessageDetail = Threader_addMessageDetail;
    this.findContainer = Threader_findContainer;
    this.getRoot = Threader_getRoot;
    this.thread = Threader_thread;
    this.toString = Threader_toString;
    this.visualise = Threader_visualise;
    
    
    

    this.do1 = do1;
    this.do11 = do11;
    this.do2 = do2;
    this.do21 = do21;
    this.do4 = do4;
    this.do41 = do41;
    this.do5b = do5b;
    this.do5b1 = do5b1;
    this.do5c = do5c;
    this.do5c1 = do5c1;
    this.getDone = Threader_getDone;

done_1_ = false;
doing_1_ = false;
doing_1_messagekeys_ = new Array();
doing_11_ = false;

doing_2_ = false;
done_2_ = false;
doing_21_ = false;
doing_2_rootkeys_ = new Array();

doing_4_ = false;
done_4_ = false;
doing_4_containers_ = new Array();

subject_table_ = null;
doing_5b_containers_ = new Array();
doing_5b_ = false;
done_5b_ = false;

doing_5c_ = false;
done_5c_ = false;
doing_5c_containers_ = new Array();

messages_ = new Array;
id_table_ = new Object();
root_set_ = new Container(true);

}


/**
 * Add a new message
 * @param message The new Message to add
 */
function Threader_addMessage(message)
{
    messages_.push(message);
}


/**
 * Add a new message
 * construct message here
 */
function Threader_addMessageDetail(subject, author, messageId, messageKey, date, uri, references, issent)
{
    this.addMessage(new Message(subject, author, messageId, messageKey, date, uri, references, issent));
}


/**
 * Find a message
 */
function Threader_findContainer(message_id)
{
    return id_table_[message_id];
}


/**
 * Get root container
 */
function Threader_getRoot()
{
    return root_set_;
}



// =============================================================================
// NORMAL IMPLEMENTATION
// =============================================================================
/**
 * Do actual threading work
 */
 /*
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
        var container = this.id_table_[rootkey];
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
    // 6. that's it
    //root_set_.check();
}
*/
// =============================================================================
// / NORMAL IMPLEMENTATION
// =============================================================================



// =============================================================================
// FULL SETTIMEOUT IMPLEMENTATION
// =============================================================================
/*
function do1()
{
    if (! doing_1_ && ! done_1_)
    {
        doing_1_ = true;
        start_1_ = (new Date()).getTime();
        for (messagekey in messages_)
        {
            doing_1_messagekeys_.push(messagekey);
        }
        setTimeout("do11()", 10);
        setTimeout("do1()", 10);
    }
    if (done_1_)
    {
        end_1_ = (new Date()).getTime();
        return;
    }
    setTimeout("do1()", 10);
}

function do11()
{
    if (doing_11_)
    {
        return;
    }
    
    doing_11_ = true;
    
    var key = doing_1_messagekeys_.pop();

    if (key == null)
    {
        done_11_ = true;
        doing_11_ = false;
        done_1_ = true;
        return;
    }

    var message = messages_[key];

    // try to get message container
    var message_container = id_table_[message.getId()];

    if (message_container != null)
    {
        if (message_container.isDummy())
        {
            // 1.A. id_table contains empty container for this message
            // store message in this container
            message_container.setMessage(message);
            // index container in hashtable
            id_table_[message.getId()] = message_container;
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
        id_table_[message.getId()] = message_container;
    }

    // for each element in references field of message
    var parent_reference_container = null;
    var references = message.getReferences().getReferences();
    for (referencekey in references)
    {
        var reference_id = references[referencekey];

        // try to find container for referenced message
        var reference_container = id_table_[reference_id];
        if (reference_container == null)
        {
            // no container found, create new one
            reference_container = new Container();
            // index container
            id_table_[reference_id] = reference_container;
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
    
    doing_11_ = false;
    setTimeout("do11()", 0);
}



function do2()
{
    if (! doing_2_ && ! done_2_ && done_1_)
    {
        doing_2_ = true;
        start_2_ = (new Date()).getTime();
        var rootkey = null;
        for (rootkey in id_table_)
        {
            doing_2_rootkeys_.push(rootkey);
        }
        setTimeout("do21()", 10);
        setTimeout("do2()", 10);
    }
    if (done_2_)
    {
        end_2_ = (new Date()).getTime();
        return;
    }
    setTimeout("do2()", 10);
}

function do21()
{
    if (doing_21_)
    {
        return;
    }
    
    doing_21_ = true;
    
    var key = doing_2_rootkeys_.pop();
    
    if (key == null)
    {
        done_21_ = true;
        doing_21_ = false;
        done_2_ = true;
        return;
    }

   var container = id_table_[key];
   if (! container.hasParent())
   {
       // root set contains all containers that have no parents
       root_set_.addChild(container);
       //root_set_.check();
   }
   
   doing_21_ = false;
   setTimeout("do21()", 0);
}



function do4()
{
    if (! doing_4_ && ! done_4_ && done_2_)
    {
        doing_4_ = true;
        start_4_ = (new Date()).getTime();
        var container = null;
        for (container = root_set_.getChild(); container != null; container = container.getNext())
        {
            doing_4_containers_.push(container);
        }
        setTimeout("do41()", 10);
        setTimeout("do4()", 10);
    }
    if (done_4_)
    {
        end_4_ = (new Date()).getTime();
        return;
    }
    setTimeout("do4()", 10);
}

function do41()
{
    if (doing_41_)
    {
        return;
    }
    
    doing_41_ = true;
    
    var container = doing_4_containers_.pop();
    
    if (container == null)
    {
        done_41_ = true;
        doing_41_ = false;
        done_4_ = true;
        return;
    }

    // if container is empty and has no children
    if (container.isDummy() && ! container.hasChild())
    {
        // remove from root_set_
        if (container.hasPrevious())
            container.getPrevious().setNext(container.getNext());
        else
            container.getParent().setChild(container.getNext());
        
        doing_41_ = false;
        setTimeout("do41()", 0);
        return;
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
    
    doing_41_ = false;
    setTimeout("do41()", 0);
}


function do5b()
{
    if (! doing_5b_ && ! done_5b_ && done_4_)
    {
        doing_5b_ = true;
        start_5b_ = (new Date()).getTime();
        var container = null;
        for (container = root_set_.getChild(); container != null; container = container.getNext())
        {
            doing_5b_containers_.push(container);
        }
        setTimeout("do5b1()", 10);
        setTimeout("do5b()", 10);
    }
    if (done_5b_)
    {
        end_5b_ = (new Date()).getTime();
        return;
    }
    setTimeout("do5b()", 10);
}


function do5b1()
{
    if (doing_5b1_)
    {
        return;
    }
    
    doing_5b1_ = true;
    
    var container = doing_5b_containers_.pop();
    
    if (container == null)
    {
        done_5b1_ = true;
        doing_5b1_ = false;
        done_5b_ = true;
        return;
    }

    // 5.B. find subject of subtree
    var subject = "";
    subject = container.getSimplifiedSubject();

    if (subject == "")
    {
        // in case of empty subject, give up on this container
        doing_5b1_ = false;
        setTimeout("do5b1()", 0);
        return;
    }

    // try to find existing container with same subject
    var subject_container = subject_table_[subject];

    if (subject_container == null ||                                        // if we have to container with this subject OR
        (subject_container.isDummy() && ! container.isDummy()) ||           // if found one is empty, but this one is not OR
        (subject_container.getReplyCount() > container.getReplyCount()))    // if current is less reply than subject container
    {
        subject_table_[subject] = container;
    }
    
    doing_5b1_ = false;
    setTimeout("do5b1()", 0);
}


function do5c()
{
    if (! doing_5c_ && ! done_5c_ && done_5b_)
    {
        doing_5c_ = true;
        start_5c_ = (new Date()).getTime();
        var container = null;
        for (container = root_set_.getChild(); container != null; container = container.getNext())
        {
            doing_5c_containers_.push(container);
        }
        
        setTimeout("do5c1()", 10);
        setTimeout("do5c()", 10);
    }
    if (done_5c_)
    {
        end_5c_ = (new Date()).getTime();
        setTimeout("timingInfo()", 10);
        return;
    }
    setTimeout("do5c()", 10);
}

function do5c1()
{
    if (doing_5c1_)
    {
        return;
    }
    
    doing_5c1_ = true;
    
    var container = doing_5c_containers_.pop();
    
    if (container == null)
    {
        done_5c1_ = true;
        doing_5c1_ = false;
        done_5c_ = true;
        done_threading_ = true;
        return;
    }

    // get subject of this container
    var subject = "";
    subject = container.getSimplifiedSubject();

    // get container for this subject in subject_table
    var subject_container = subject_table_[subject];
    if (subject_container == null || subject_container == container)
    {
        // if no container found, or found ourselfs
        doing_5c1_ = false;
        setTimeout("do5c1()", 0);
        return;
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
        root_set_.addChild(new_container);
        container = tmp;
    }
    doing_5c1_ = false;
    setTimeout("do5c1()", 0);

}


function Threader_thread()
{
    // 1. For each message
    id_table_ = new Object();
    this.do1();
    

    // 2. Find the root set
    // walk over all elements in id_table
    this.do2();
    

    //root_set_.check();

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
    subject_table_ = new Object();

    // 5.B. iterate over all containers in root set
    
    this.do5b();
    

    // 5.C. iterator over root set
    this.do5c();

    // 6. that's it
    //root_set_.check();
}
*/
// =============================================================================
// / FULL SETTIMEOUT IMPLEMENTATION
// =============================================================================



// =============================================================================
// HALF SETTIMEOUT IMPLEMENTATION
// =============================================================================

function do1()
{
    if (! doing_1_ && ! done_1_)
    {
        doing_1_ = true;
        start_1_ = (new Date()).getTime();
        setTimeout("do11()", 10);
        setTimeout("do1()", 10);
    }
    if (done_1_)
    {
        end_1_ = (new Date()).getTime();
        return;
    }
    setTimeout("do1()", 10);
}

function do11()
{
    if (doing_11_)
    {
        return;
    }
    
    doing_11_ = true;
    
    var key = null;
    for (key in messages_)
    {

        var message = messages_[key];

        // try to get message container
        var message_container = id_table_[message.getId()];

        if (message_container != null)
        {
            if (message_container.isDummy())
            {
                // 1.A. id_table contains empty container for this message
                // store message in this container
                message_container.setMessage(message);
                // index container in hashtable
                id_table_[message.getId()] = message_container;
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
            id_table_[message.getId()] = message_container;
        }

        // for each element in references field of message
        var parent_reference_container = null;
        var references = message.getReferences().getReferences();
        for (referencekey in references)
        {
            var reference_id = references[referencekey];

            // try to find container for referenced message
            var reference_container = id_table_[reference_id];
            if (reference_container == null)
            {
                // no container found, create new one
                reference_container = new Container();
                // index container
                id_table_[reference_id] = reference_container;
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
    
    done_11_ = true;
    doing_11_ = false;
    done_1_ = true;
}



function do2()
{
    if (! doing_2_ && ! done_2_ && done_1_)
    {
        doing_2_ = true;
        start_2_ = (new Date()).getTime();
        setTimeout("do21()", 10);
        setTimeout("do2()", 10);
    }
    if (done_2_)
    {
        end_2_ = (new Date()).getTime();
        return;
    }
    setTimeout("do2()", 10);
}


function do21()
{
    if (doing_21_)
    {
        return;
    }
    
    doing_21_ = true;

    var rootkey = null;
    for (rootkey in id_table_)
    {
        var container = id_table_[rootkey];
        if (! container.hasParent())
       {
           // root set contains all containers that have no parents
           root_set_.addChild(container);
           //root_set_.check();
        }
    }

    done_21_ = true;
    doing_21_ = false;
    done_2_ = true;
}



function do4()
{
    if (! doing_4_ && ! done_4_ && done_2_)
    {
        doing_4_ = true;
        start_4_ = (new Date()).getTime();
        setTimeout("do41()", 10);
        setTimeout("do4()", 10);
    }
    if (done_4_)
    {
        end_4_ = (new Date()).getTime();
        return;
    }
    setTimeout("do4()", 10);
}


function do41()
{
    if (doing_41_)
    {
        return;
    }
    
    doing_41_ = true;

    var container = null;
    for (container = root_set_.getChild(); container != null; container = container.getNext())
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
    done_41_ = true;
    doing_41_ = false;
    done_4_ = true;
}


function do5b()
{
    if (! doing_5b_ && ! done_5b_ && done_4_)
    {
        doing_5b_ = true;
        start_5b_ = (new Date()).getTime();
        setTimeout("do5b1()", 10);
        setTimeout("do5b()", 10);
    }
    if (done_5b_)
    {
        end_5b_ = (new Date()).getTime();
        return;
    }
    setTimeout("do5b()", 10);
}


function do5b1()
{
    if (doing_5b1_)
    {
        return;
    }
    
    doing_5b1_ = true;

    var container = null;
    for (container = root_set_.getChild(); container != null; container = container.getNext())
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
        var subject_container = subject_table_[subject];

        if (subject_container == null ||                                        // if we have to container with this subject OR
           (subject_container.isDummy() && ! container.isDummy()) ||           // if found one is empty, but this one is not OR
           (subject_container.getReplyCount() > container.getReplyCount()))    // if current is less reply than subject container
        {
            subject_table_[subject] = container;
        }
    }

    done_5b1_ = true;
    doing_5b1_ = false;
    done_5b_ = true;
}


function do5c()
{
    if (! doing_5c_ && ! done_5c_ && done_5b_)
    {
        doing_5c_ = true;
        start_5c_ = (new Date()).getTime();
        
        setTimeout("do5c1()", 10);
        setTimeout("do5c()", 10);
    }
    if (done_5c_)
    {
        end_5c_ = (new Date()).getTime();
        setTimeout("timingInfo()", 10);
        return;
    }
    setTimeout("do5c()", 10);
}

function do5c1()
{
    if (doing_5c1_)
    {
        return;
    }
    
    doing_5c1_ = true;
    
    var container = null;
    for (container = root_set_.getChild(); container != null; container = container.getNext())
    {
        // get subject of this container
        var subject = "";
        subject = container.getSimplifiedSubject();

        // get container for this subject in subject_table
        var subject_container = subject_table_[subject];
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
            root_set_.addChild(new_container);
            container = tmp;
        }
    }
    done_5c1_ = true;
    doing_5c1_ = false;
    done_5c_ = true;
    done_threading_ = true;
}


function Threader_thread()
{
    // 1. For each message
    id_table_ = new Object();
    this.do1();
    

    // 2. Find the root set
    // walk over all elements in id_table
    this.do2();
    

    //root_set_.check();

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
    subject_table_ = new Object();

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




function Threader_getDone()
{
    return done_5c_;
}


/**
 * Output root set as string
 */
function Threader_toString()
{
    var string = "\n-----\n";
    string += root_set_.toString("\n");
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
    else
    {
        visualisation_.createStack();
    }
    container = null;
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


function timingInfo()
{
    var time_1 = end_1_ - start_1_;
    var time_2 = end_2_ - start_2_;
    var time_4 = end_4_ - start_4_;
    var time_5b = end_5b_ - start_5b_;
    var time_5c = end_5c_ - start_5c_;
    var time_total = time_1 + time_2 + time_4 + time_5b + time_5c;
    
    //alert("1: " + time_1 + " ms\n2: " + time_2 + " ms\n4: " + time_4 + " ms\n5b: " + time_5b + " ms\n5c: " + time_5c + " ms\nTotal: " + time_total + " ms");
}