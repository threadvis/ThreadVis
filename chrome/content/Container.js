/** ****************************************************************************
 * Container.js
 *
 * (c) 2005-2006 Alexander C. Hubmann
 *
 * Implements container for messages
 * Re-write form Java
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor
 ******************************************************************************/
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
}



/** ****************************************************************************
 * Add child to this container
 * Removes child from old sibling list
 * Inserts child and all its children
 ******************************************************************************/
Container.prototype.addChild = function(child)
{
    // check if child is already our child
    // if so, do nothing
    if (child.getParent == this)
        return;
    
    /* check to see if this container is a child of child
     * this should never happen, because we would create a loop
     * that's why we don't allow it
     */
    if (child.findChild(this))
    {
        alert("Error: Loop detected in message structure.");
        THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_ERROR_,
                                   "Container.addChild()" ,
                                   {"error" : "tried to create loop",
                                    "child container" : child.toString(),
                                    "parent container" : this.toString()});
        return;
    }

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



/** ****************************************************************************
 * Inserts children into child list
 * Children have to be removed from old position first!
 ******************************************************************************/
Container.prototype.addChildren = function(child)
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



/** ****************************************************************************
 * Insert a container into sibling list
 ******************************************************************************/
Container.prototype.addSibling = function(sibling)
{
    if (this.hasNext())
        this.getNext().setPrevious(sibling);

    this.setParentForContainer(sibling, this.getParent());
    
    sibling.getLast().setNext(this.getNext());
    sibling.setPrevious(this);
    this.setNext(sibling);
}



/** ****************************************************************************
 * Low level check if tree is valid
 ******************************************************************************/
Container.prototype.check = function()
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



/** ****************************************************************************
 * See if this container or any of its children
 * contains a specific container
 ******************************************************************************/
Container.prototype.findChild = function(target)
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



/** ****************************************************************************
 * Get first child in child list
 ******************************************************************************/
Container.prototype.getChild = function()
{
    return this.child_;
}



/** ****************************************************************************
 * Get child count
 ******************************************************************************/
Container.prototype.getChildCount = function()
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



/** ****************************************************************************
 * return at which position child is in child list
 ******************************************************************************/
Container.prototype.getChildPosition = function(child)
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



/** ****************************************************************************
 * Get all children of this container as array
 ******************************************************************************/
Container.prototype.getChildren = function()
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



/** ****************************************************************************
 * Get recursive container count
 ******************************************************************************/
Container.prototype.getCountRecursive = function()
{
    var count = 1;
    var container = null;
    for (container = this.getChild();
         container != null;
         container = container.getNext())
    {
        count += container.getCountRecursive();
    }
    return count;
}



/** ****************************************************************************
 * Get date of message
 ******************************************************************************/
Container.prototype.getDate = function()
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



/** ****************************************************************************
 * Get depth of message in tree
 ******************************************************************************/
Container.prototype.getDepth = function()
{
    if (this.hasParent())
        if (this.getParent().isRoot())
            return 0;
        else
            return 1 + this.getParent().getDepth();
    else
        return 0;
}



/** ****************************************************************************
 * Get first dummy child
 ******************************************************************************/
Container.prototype.getDummy = function()
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



/** ****************************************************************************
 * Get last sibling in list
 ******************************************************************************/
Container.prototype.getLast = function()
{
    var current = this;
    while (current.hasNext())
    {
        current = current.getNext();
    }
    return current;
}



/** ****************************************************************************
 * Get next sibling in list
 ******************************************************************************/
Container.prototype.getNext = function()
{
    return this.next_;
}



/** ****************************************************************************
 * Get message of this container
 ******************************************************************************/
Container.prototype.getMessage = function()
{
    return this.message_;
}



/** ****************************************************************************
 * Set parent of this container
 ******************************************************************************/
Container.prototype.getParent = function()
{
    return this.parent_;
}



/** ****************************************************************************
 * Get previous sibling in list
 ******************************************************************************/
Container.prototype.getPrevious = function()
{
    return this.previous_;
}



/** ****************************************************************************
 * Get reply count of message of this container
 ******************************************************************************/
Container.prototype.getReplyCount = function()
{
    return (this.isDummy() ? 0 : this.getMessage().getReplyCount());
}



/** ****************************************************************************
 * Get simplified subject of this thread
 ******************************************************************************/
Container.prototype.getSimplifiedSubject = function()
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



/** ****************************************************************************
 * Get subject of message of this thread
 ******************************************************************************/
Container.prototype.getSubject = function()
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



/** ****************************************************************************
 * Get tooltip text to display
 ******************************************************************************/
Container.prototype.getToolTipText = function()
{
    if (this.isDummy())
        return null;
    
    var msg = this.getMessage();
    
    return msg.getFrom() + ": " + msg.getSubject() + ", " + msg.getDate();
}



/** ****************************************************************************
 * Get topmost container that is not the root container
 ******************************************************************************/
Container.prototype.getTopContainer = function()
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



/** ****************************************************************************
 * See if this container has at least 1 child
 ******************************************************************************/
Container.prototype.hasChild = function()
{
    return (this.getChild() != null);
}



/** ****************************************************************************
 * See if this container contains at least 2 children
 ******************************************************************************/
Container.prototype.hasChildren = function()
{
    return (this.hasChild() ? this.getChild().hasSiblings() : false);
}



/** ****************************************************************************
 * See if this container has a dummy child
 ******************************************************************************/
Container.prototype.hasDummy = function()
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



/** ****************************************************************************
 * See if we have a next sibling in list
 ******************************************************************************/
Container.prototype.hasNext = function()
{
    return (this.getNext() != null);
}



/** ****************************************************************************
 * See if this container has exactly 1 child
 ******************************************************************************/
Container.prototype.hasOneChild = function()
{
    return (this.hasChild() ? (this.getChild().hasNext() == false) : false);
}



/** ****************************************************************************
 * See if this container has a parent
 ******************************************************************************/
Container.prototype.hasParent = function()
{
    return (this.getParent() != null);
}



/** ****************************************************************************
 * See if we have a previous sibling in list
 ******************************************************************************/
Container.prototype.hasPrevious = function()
{
    return (this.getPrevious() != null);
}



/** ****************************************************************************
 * See if we have other containers in sibling list
 ******************************************************************************/
Container.prototype.hasSiblings = function()
{
    return (this.hasNext() || this.hasPrevious());
}



/** ****************************************************************************
 * See if this container contains a message
 ******************************************************************************/
Container.prototype.isDummy = function()
{
    return (this.getMessage() == null);
}



/** ****************************************************************************
 * See if this container is a reply
 ******************************************************************************/
Container.prototype.isReply = function()
{
    return (this.isDummy() ? false : this.getMessage().isReply());
}



/** ****************************************************************************
 * Return if this container is the topmost container
 ******************************************************************************/
Container.prototype.isRoot = function()
{
    return this.is_root_;
}



/** ****************************************************************************
 * Merge container into this container
 * add children as this children
 * set message as this message
 ******************************************************************************/
Container.prototype.mergeChild = function(dummy, child)
{
    dummy.addChildren(child.getChild());
    dummy.setMessage(child.getMessage());
}



/** ****************************************************************************
 * Prune empty containers in this container
 ******************************************************************************/
Container.prototype.pruneEmptyContainers = function()
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



/** ****************************************************************************
 * Unlink all children
 ******************************************************************************/
Container.prototype.removeChildren = function()
{
    this.setChild(null);
}



/** ****************************************************************************
 * Remove a child from the list
 ******************************************************************************/
Container.prototype.removeChild = function(child)
{
    // check if child is in fact our child
    if (child.getParent() != this)
        return;
    
    /* if child is the first in list, we can remove it
     * by setting the next child in list as first
     */
    if (this.getChild() == child)
    {
        this.setChild(child.getNext());
        
        if (child.hasNext())
            child.getNext().removePrevious();
        
        child.removeParent();
        child.removePrevious();
        child.removeNext();
    }
    /* otherwise we have to look it up in child list
     * and do some pointer juggling
     */
    else
    {
        if (child.hasPrevious())
            child.getPrevious().setNext(child.getNext());
        
        if (child.hasNext())
            child.getNext().setPrevious(child.getPrevious());
        
        child.removeParent();
        child.removePrevious();
        child.removeNext();
    }
}



/** ****************************************************************************
 * Unlink next sibling in list
 ******************************************************************************/
Container.prototype.removeNext = function()
{
    this.setNext(null);
}



/** ****************************************************************************
 * Unlink parent
 ******************************************************************************/
Container.prototype.removeParent = function()
{
    this.setParent(null);
}



/** ****************************************************************************
 * Unlink previous sibling in list
 ******************************************************************************/
Container.prototype.removePrevious = function()
{
    this.setPrevious(null);
}



/** ****************************************************************************
 * Set first child in list
 ******************************************************************************/
Container.prototype.setChild = function(child)
{
    this.child_ = child;
}



/** ****************************************************************************
 * Set next sibling in list
 ******************************************************************************/
Container.prototype.setNext = function(next)
{
    this.next_ = next;
}



/** ****************************************************************************
 * Set message of this container
 ******************************************************************************/
Container.prototype.setMessage = function(message)
{
    this.message_ = message;
}



/** ****************************************************************************
 * Set parent of this container
 ******************************************************************************/
Container.prototype.setParent = function(parent)
{
    this.parent_ = parent;
}



/** ****************************************************************************
 * Set parent for all containers in list
 ******************************************************************************/
Container.prototype.setParentForContainer = function(sibling, parent)
{
    var container = null;
    for (container = sibling;
         container != null;
         container = container.getNext())
    {
        container.setParent(parent);
    }
}



/** ****************************************************************************
 * Set previous sibling in list
  ******************************************************************************/
Container.prototype.setPrevious = function(prev)
{
    this.previous_ = prev;
}



/** ****************************************************************************
 * Sort function for sorting javascript array
 ******************************************************************************/
function Container_sortFunction(one, two)
{
    // just to be sure, we never want to sort a child
    // before one of its parents
    // (could happen if time information in mail is wrong,
    // e.g. time of mailclient is off)
    if (one.findChild(two))
    {
        return -1;
    }
    if (two.findChild(one))
    {
        return 1;
    }
    
    // sort all others by date
    // if one of the containers is a dummy, getDate() returns the date
    // of its first child. this should be enough to ensure the timeline
    var difference = one.getDate().getTime() - two.getDate().getTime();
    
    if (difference < 0)
        return - 1;
    else
        return 1;
}



/** ****************************************************************************
 * Output string representation of this container
 ******************************************************************************/
Container.prototype.toString = function(prefix)
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



/** ****************************************************************************
 * Output string representation of this container
 ******************************************************************************/
Container.prototype.toStringThread = function()
{
    if (this.hasParent())
      if (this.getParent().hasParent())
        return this.getParent().toStringThread();

    return this.toString("\n");
}
