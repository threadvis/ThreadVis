/* *******************************************************
 * Container.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * Implements container for messages
 * Re-write form Java
 *
 * $Id$
 ********************************************************/


/**
 * Constructor
 */
function Container(is_root)
{
    /**
     * First container in child list
     */
    this.child_ = null;


    /**
     * We are root container
     */
    this.is_root_ = is_root;


    /**
     * Store message in this container
     */
    this.message_ = null;


    /**
     * Next container in sibling list
     */
    this.next_ = null;


    /**
     * Parent of this container
     */
    this.parent_ = null;


    /**
     * Previous container in sibling list
     */
    this.previous_ = null;


    /**
     * save horizontal position of dot
     */
    this.xposition_ = 0;


    // javascript links to methos
    this.addChild = Container_addChild;
    this.check = Container_check;
    this.compareTo = Container_compareTo;
    this.findChild = Container_findChild;
    this.getChild = Container_getChild;
    this.getChildCount = Container_getChildCount;
    this.getChildPosition = Container_getChildPosition;
    this.getChildren = Container_getChildren;
    this.getDate = Container_getDate;
    this.getDepth = Container_getDepth;
    this.getDummy = Container_getDummy;
    this.getLast = Container_getLast;
    this.getNext = Container_getNext;
    this.getMessage = Container_getMessage;
    this.getParent = Container_getParent;
    this.getPrevious = Container_getPrevious;
    this.getReplyCount = Container_getReplyCount;
    this.getSimplifiedSubject = Container_getSimplifiedSubject;
    this.getSubject = Container_getSubject;
    this.getToolTipText = Container_getToolTipText;
    this.getTopContainer = Container_getTopContainer;
    this.hasChild = Container_hasChild;
    this.hasChildren = Container_hasChildren;
    this.hasDummy = Container_hasDummy;
    this.hasNext = Container_hasNext;
    this.hasOneChild = Container_hasOneChild;
    this.hasParent = Container_hasParent;
    this.hasPrevious = Container_hasPrevious;
    this.hasSiblings = Container_hasSiblings;
    this.isDummy = Container_isDummy;
    this.isReply = Container_isReply;
    this.isRoot = Container_isRoot;
    this.mergeChild = Container_mergeChild;
    this.pruneEmptyContainers = Container_pruneEmptyContainers;
    this.removeChildren = Container_removeChildren;
    this.removeChild = Container_removeChild;
    this.removeNext = Container_removeNext;
    this.removeParent = Container_removeParent;
    this.removePrevious = Container_removePrevious;
    this.setChild = Container_setChild;
    this.setNext = Container_setNext;
    this.setMessage = Container_setMessage;
    this.setParent = Container_setParent;
    this.setPrevious = Container_setPrevious;
    this.toString = Container_toString;
    this.toStringThread = Container_toStringThread;
    this.addChildren = Container_addChildren;
    this.addSibling = Container_addSibling;
    this.setParentForContainer = Container_setParentForContainer;
}


/**
 * Add child to this container
 * Removes child from old sibling list
 * Inserts child and all its children
 */
function Container_addChild(child)
{
    /* remove it from old chain
     * child.hasPrevious means that it's not the first in chain,
     * so take it out of old chain by juggling the pointers
     */
    if (child.hasPrevious())
    {
        child.getPrevious().setNext(child.getNext());
        if (child.hasNext())
        {
            child.getNext().setPrevious(child.getPrevious());
        }
    }
    /* child has no previous, so it's the first in child list
     * remove it by letting the parent point to the next child in list
     */
    else if (child.hasParent())
    {
        child.getParent().setChild(child.getNext());
        if (child.hasNext())
            child.getNext().removePrevious();
    }
    child.removeNext();
    child.removePrevious();
    child.removeParent();

    this.addChildren(child);
}


/**
 * Inserts children into child list
 * Children have to be removed from old position first!
 */
function Container_addChildren(child)
{
    // we always want to be passed the first child in list
    if (child.hasPrevious())
        // fixxme
        alert("not happen");

    if (! this.hasChild())
    {
        this.child_ = child;
        this.setParentForContainer(child, this);
    }
    else
    {
        this.child_.addSibling(child);
    }
}


/**
 * Insert a container into sibling list
 */
function Container_addSibling(sibling)
{
    if (this.hasNext())
        this.getNext().setPrevious(sibling);

    this.setParentForContainer(sibling, this.getParent());
    
    sibling.getLast().setNext(this.getNext());
    sibling.setPrevious(this);
    this.setNext(sibling);
}


/**
 * Low level check if tree is valid
 */
function Container_check()
{
    // check if prev-next relationship holds
    if (this.hasPrevious())
        if (this.getPrevious().getNext() != this)
        {
            alert("CHECK: getPrevious().getNext() did not return this");
            alert("this:" + this);
            alert("previous:" + this.getPrevious());
            alert("previous.getNext():" + this.getPrevious().getNext());
        }

    if (this.hasNext())
        if (this.getNext().getPrevious() != this)
        {
            alert("CHECK: getNext().getPrevious() did not return this");
            alert(this);
            alert("this:" + this);
            alert("next:" + this.getNext());
            alert("next.getPrevious():" + this.getNext().getPrevious());
        }

    // check if parent relationship holds
    if (this.hasParent())
        if (this.getParent().findChild(this) != true)
        {
            alert("CHECK: getParent().findChild() did not return true");
            alert("this: " + this);
            alert("parent: " + getParent());
        }

   // check children
   var child = this.getChild();
   while (child != null)
   {
        child.check();
        child = child.getNext();
    }
}


/**
 * needed to sort containers by message date
 * fixxme
 */
function Container_compareTo(object)
{
    if (this.isDummy() && object.isDummy())
        return 0;

    if (this.isDummy() && !object.isDummy())
        return -1;

    if (!this.isDummy() && object.isDummy())
        return 1;

    // fixxme
    //return getDate().compareTo(object.getDate());
    return 1;
}


/**
 * See if this container or any of its children
 * contains a specific container
 */
function Container_findChild(target)
{
    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
     {
        if (container == target)
        {
            return true;
        }
        else if (container.findChild(target))
        {
            return true;
        }
    }
    return false;
}


/**
 * Get first child in child list
 */
function Container_getChild()
{
    return this.child_;
}


/**
 * Get child count
 */
function Container_getChildCount()
{
    var count = 0;
    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        count++;
    }
    return count;
}


/**
 * return at which position child is in child list
 */
function Container_getChildPosition(child)
{
    var count = 0;
    var container = 0;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        if (container == child)
            return count;
        count++;
    }
    return 0;
}


/**
 * Get all children of this container as array
 */
function Container_getChildren()
{
    var containers = new Array();
    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        containers.push(container);
        containers = containers.concat(container.getChildren());
    }
    return containers;
}


/**
 * Get date of message
 */
function Container_getDate()
{
    if (! this.isDummy())
        return this.message_.getDate();

    if (this.hasChild())
        return this.getChild().getDate();

    // we are dummy
    // we have NO child
    // this shouldn't happen
    return null;
}


/**
 * Get depth of message in tree
 */
function Container_getDepth()
{
    if (this.hasParent())
        if (this.getParent().isRoot())
            return 0;
        else
            return 1 + this.getParent().getDepth();
    else
        return 0;
}


/**
 * Get first dummy child
 */
function Container_getDummy()
{
    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        if (container.isDummy())
        {
            return container;
        }
    }
    return null;
}


/**
 * Get last sibling in list
 */
function Container_getLast()
{
    var current = this;
    while (current.hasNext())
    {
        current = current.getNext();
    }
    return current;
}


/**
 * Get next sibling in list
 */
function Container_getNext()
{
    return this.next_;
}


/**
 * Get message of this container
 */
function Container_getMessage()
{
    return this.message_;
}


/**
 * Set parent of this container
 */
function Container_getParent()
{
    return this.parent_;
}


/**
 * Get previous sibling in list
 */
function Container_getPrevious()
{
    return this.previous_;
}


/**
 * Get reply count of message of this container
 */
function Container_getReplyCount()
{
    return (this.isDummy() ? 0 : this.getMessage().getReplyCount());
}


/**
 * Get simplified subject of this thread
 */
function Container_getSimplifiedSubject()
{
    if (! this.isDummy())
    {
        return this.getMessage().getSimplifiedSubject();
    }
    else if (this.hasChild())
    {
        return this.getChild().getSimplifiedSubject();
    }
    else
    {
        return "";
    }
}


/**
 * Get subject of message of this thread
 */
function Container_getSubject()
{
    if (! this.isDummy())
    {
        return this.getMessage().getSubject();
    }
    else if (this.hasChild())
    {
        return this.getChild().getSubject();
    }
    else
    {
        return "";
    }
}


/**
 * Get tooltip text to display
 */
function Container_getToolTipText()
{
    if (this.isDummy())
        return null;
    
    var msg = this.getMessage();
    
    return msg.getFrom() + ": " + msg.getSubject() + ", " + msg.getDate();
}


/**
 * Get topmost container that is not the root container
 */
function Container_getTopContainer()
{
    if (this.hasParent())
    {
        if (! this.getParent().isRoot())
            return this.getParent().getTopContainer();
        else
            return this;
    }
    return this;
}


/**
 * See if this container has at least 1 child
 */
function Container_hasChild()
{
    return (this.getChild() != null);
}


/**
 * See if this container contains at least 2 children
 */
function Container_hasChildren()
{
    return (this.hasChild() ? this.getChild().hasSiblings() : false);
}


/**
 * See if this container has a dummy child
 */
function Container_hasDummy()
{
    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        if (container.isDummy())
        {
            return true;
        }
    }
    return false;
}


/**
 * See if we have a next sibling in list
 */
function Container_hasNext()
{
    return (this.getNext() != null);
}


/**
 * See if this container has exactly 1 child
 */
function Container_hasOneChild()
{
    return (this.hasChild() ? (this.getChild().hasNext() == false) : false);
}


/**
 * See if this container has a parent
 */
function Container_hasParent()
{
    return (this.getParent() != null);
}


/**
 * See if we have a previous sibling in list
 */
function Container_hasPrevious()
{
    return (this.getPrevious() != null);
}


/**
 * See if we have other containers in sibling list
 */
function Container_hasSiblings()
{
    return (this.hasNext() || this.hasPrevious());
}


/**
 * See if this container contains a message
 */
function Container_isDummy()
{
    return (this.getMessage() == null);
}


/**
 * See if this container is a reply
 */
function Container_isReply()
{
    return (this.isDummy() ? false : this.getMessage().isReply());
}


/**
 * Return if this container is the topmost container
 */
function Container_isRoot()
{
    return this.is_root_;
}


/**
 * Merge container into this container
 * add children as this children
 * set message as this message
 */
function Container_mergeChild(dummy, child)
{
    dummy.addChildren(child.getChild());
    dummy.setMessage(child.getMessage());
}


/**
 * Prune empty containers in this container
 */
function Container_pruneEmptyContainers()
{
    /* 4. Prune empty containers
     * prune if this container is dummy (empty)
     * and does not have a child and has a parent
     */
    if (this.isDummy() && (! this.hasChild()) && this.hasParent())
    {
        this.getParent().removeChild(this);
    }
    /*
     * do not prune if is dummy and has one child, because
     * then we lose information about missing messages
     *
    if (this.isDummy() && this.hasOneChild() && this.hasParent())
    {
        this.getParent().addChildren(this.getChild());
        this.getParent().removeChild(this);
    }
    */

    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        container.pruneEmptyContainers();
    }
}


/**
 * Unlink all children
 */
function Container_removeChildren()
{
    this.setChild(null);
}


/**
 * Remove a child from the list
 */
function Container_removeChild(child)
{
    /* if child is the first in list, we can remove it
     * by setting the next child in list as first
     */
    if (this.getChild() == child)
    {
        this.setChild(child.getNext());
    }
    /* otherwise we have to look it up in child list
     * and do some pointer juggling
     */
    else
    {
        var container = null;
        for (container = this.getChild();
             container != null;
             container = container.getNext())
        {
            if (child == container)
            {
                if (child.hasPrevious())
                    child.getPrevious().setNext(container.getNext());

                if (child.hasNext())
                    child.getNext().setPrevious(container.getPrevious());

                container.removeParent();
                container.removePrevious();
                container.removeNext();

                return;
            }
        }
    }
}


/**
 * Unlink next sibling in list
 */
function Container_removeNext()
{
    this.setNext(null);
}


/**
 * Unlink parent
 */
function Container_removeParent()
{
    this.setParent(null);
}


/**
 * Unlink previous sibling in list
 */
function Container_removePrevious()
{
    this.setPrevious(null);
}


/**
 * Set first child in list
 */
function Container_setChild(child)
{
    this.child_ = child;
}


/**
 * Set next sibling in list
 */
function Container_setNext(next)
{
    this.next_ = next;
}


/**
 * Set message of this container
 */
function Container_setMessage(message)
{
    this.message_ = message;
}


/**
 * Set parent of this container
 */
function Container_setParent(parent)
{
    this.parent_ = parent;
}


/**
 * Set parent for all containers in list
 */
function Container_setParentForContainer(sibling, parent)
{
    var container = null;
    for (container = sibling;
         container != null;
         container = container.getNext())
    {
        container.setParent(parent);
    }
}


/**
 * Set previous sibling in list
 */
function Container_setPrevious(prev)
{
    this.previous_ = prev;
}


/**
 * Sort function for sorting javascript array
 */
function Container_sortFunction(one, two)
{
    if (one.isDummy() && two.isDummy())
        return 0;

    if (one.isDummy() && !two.isDummy())
        return -1;

    if (!one.isDummy() && two.isDummy())
        return 1;

    // fixxme
    //return getDate().compareTo(object.getDate());
    return one.getDate().getTime() - two.getDate().getTime();
}

/**
 * Output string representation of this container
 */
function Container_toString(prefix)
{
    if (prefix == null)
        prefix = "";

    var string = "";
    string = prefix;

    if (this.isRoot())
        string += "ROOT ";

    if (this.isDummy())
    {
        string += "DUMMY";
    }
    else
    {
        string += this.getMessage().toString();
    }

    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        string += container.toString(prefix + "XXXX");
    }
    return string;
}


/**
 * Output string representation of this container
 */
function Container_toStringThread()
{
    if (this.hasParent())
      if (this.getParent().hasParent())
        return this.getParent().toStringThread();

    return this.toString("\n");
}
