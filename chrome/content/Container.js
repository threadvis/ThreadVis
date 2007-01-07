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
    if (child.parent_ == this)
        return;
    
    /* check to see if this container is a child of child
     * this should never happen, because we would create a loop
     * that's why we don't allow it
     */
    if (child.findChild(this))
    {
        alert("Error: Loop detected in message structure.");
//        THREADVIS.logger_.logDebug(THREADVIS.logger_.LEVEL_ERROR_,
//                                   "Container.addChild()" ,
//                                   {"error" : "tried to create loop",
//                                    "child container" : child.toString(),
//                                    "parent container" : this.toString()});
        return;
    }

    /* remove it from old chain
     * child.hasPrevious means that it's not the first in chain,
     * so take it out of old chain by juggling the pointers
     */
    if (child.previous_ != null)
    {
        child.previous_.next_ = child.next_;
        if (child.next_ != null)
        {
            child.next_.previous_ = child.previous_;
        }
    }
    /* child has no previous, so it's the first in child list
     * remove it by letting the parent point to the next child in list
     */
    else if (child.parent_ != null)
    {
        child.parent_.child_ = child.next_;
        if (child.next_ != null)
            child.next_.previous_ = null;
    }
    child.next_ = null;
    child.previous_ = null;
    child.parent_ = null;

    this.addChildren(child);
}



/** ****************************************************************************
 * Inserts children into child list
 * Children have to be removed from old position first!
 ******************************************************************************/
Container.prototype.addChildren = function(child)
{
    // we always want to be passed the first child in list
    if (child.previous_ != null)
        // fixxme
        alert("not happen");

    if (this.child_ == null)
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
    if (this.next_ != null)
        this.next_.previous_ = sibling;

    this.setParentForContainer(sibling, this.parent_);
    
    sibling.getLast().next_ = this.next_;
    sibling.previous_ = this;
    this.next_ = sibling;
}



/** ****************************************************************************
 * Low level check if tree is valid
 ******************************************************************************/
Container.prototype.check = function()
{
    // check if prev-next relationship holds
    if (this.previous_ != null)
        if (this.previous_.next_ != this)
        {
            alert("CHECK: getPrevious().getNext() did not return this");
            alert("this:" + this);
            alert("previous:" + this.previous_);
            alert("previous.getNext():" + this.previous_.next_);
        }

    if (this.next_ != null)
        if (this.next_.previous_ != this)
        {
            alert("CHECK: getNext().getPrevious() did not return this");
            alert(this);
            alert("this:" + this);
            alert("next:" + this.next_);
            alert("next.getPrevious():" + this.next_.previous_);
        }

    // check if parent relationship holds
    if (this.parent_ != null)
        if (this.parent_.findChild(this) != true)
        {
            alert("CHECK: getParent().findChild() did not return true");
            alert("this: " + this);
            alert("parent: " + this.parent_);
        }

   // check children
   var child = this.child_;
   while (child != null)
   {
        child.check();
        child = child.next_;
    }
}



/** ****************************************************************************
 * See if this container or any of its children
 * contains a specific container
 ******************************************************************************/
Container.prototype.findChild = function(target)
{
    var container = null;
    for (container = this.child_;
         container != null;
         container = container.next_)
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
    for (container = this.child_;
         container != null;
         container = container.next_)
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
    for (container = this.child_;
         container != null;
         container = container.next_)
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
    for (container = this.child_;
         container != null;
         container = container.next_)
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
    for (container = this.child_;
         container != null;
         container = container.next_)
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
    if (this.message_ != null)
        return this.message_.getDate();

    if (this.child_ != null)
        return this.child_.getDate();

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
    if (this.parent_ != null)
        if (this.parent_.is_root_)
            return 0;
        else
            return 1 + this.parent_.getDepth();
    else
        return 0;
}



/** ****************************************************************************
 * Get first dummy child
 ******************************************************************************/
Container.prototype.getDummy = function()
{
    var container = null;
    for (container = this.child_;
         container != null;
         container = container.next_)
    {
        if (container.message_ == null)
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
    while (current.next_ != null)
    {
        current = current.next_;
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
    return (this.message_ == null ? 0 : this.message_.getReplyCount());
}



/** ****************************************************************************
 * Get simplified subject of this thread
 ******************************************************************************/
Container.prototype.getSimplifiedSubject = function()
{
    if (this.message != null)
    {
        return this.message_.getSimplifiedSubject();
    }
    else if (this.child_ != null)
    {
        return this.child_.getSimplifiedSubject();
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
    if (this.message_ != null)
    {
        return this.message_.getSubject();
    }
    else if (this.child_ != null)
    {
        return this.child_.getSubject();
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
    if (this.message_ == null)
        return null;
    
    var msg = this.message_;
    
    return msg.getFrom() + ": " + msg.getSubject() + ", " + msg.getDate();
}



/** ****************************************************************************
 * Get topmost container that is not the root container
 ******************************************************************************/
Container.prototype.getTopContainer = function()
{
    if (this.parent_ != null)
    {
        if (! this.parent_.is_root_)
            return this.parent_.getTopContainer();
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
    return (this.child_ != null);
}



/** ****************************************************************************
 * See if this container contains at least 2 children
 ******************************************************************************/
Container.prototype.hasChildren = function()
{
    return (this.child_ != null ? this.child_.hasSiblings() : false);
}



/** ****************************************************************************
 * See if this container has a dummy child
 ******************************************************************************/
Container.prototype.hasDummy = function()
{
    var container = null;
    for (container = this.child_;
         container != null;
         container = container.next_)
    {
        if (container.message_ == null)
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
    return (this.next_ != null);
}



/** ****************************************************************************
 * See if this container has exactly 1 child
 ******************************************************************************/
Container.prototype.hasOneChild = function()
{
    return (this.child_ != null ? (this.child_.next_ == null) : false);
}



/** ****************************************************************************
 * See if this container has a parent
 ******************************************************************************/
Container.prototype.hasParent = function()
{
    return (this.parent_ != null);
}



/** ****************************************************************************
 * See if we have a previous sibling in list
 ******************************************************************************/
Container.prototype.hasPrevious = function()
{
    return (this.previous_ != null);
}



/** ****************************************************************************
 * See if we have other containers in sibling list
 ******************************************************************************/
Container.prototype.hasSiblings = function()
{
    return (this.next_ != null || this.previous_ != null);
}



/** ****************************************************************************
 * See if this container contains a message
 ******************************************************************************/
Container.prototype.isDummy = function()
{
    return (this.message_ == null);
}



/** ****************************************************************************
 * See if this container is a reply
 ******************************************************************************/
Container.prototype.isReply = function()
{
    return (this.message_ == null ? false : this.message_.isReply());
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
    dummy.addChildren(child.child_);
    dummy.message_ = child.message_;
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
    if (this.message_ == null && (this.child_ == null) && this.parent_ != null)
    {
        this.parent_.removeChild(this);
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
    for (container = this.child_;
         container != null;
         container = container.next_)
    {
        container.pruneEmptyContainers();
    }
}



/** ****************************************************************************
 * Unlink all children
 ******************************************************************************/
Container.prototype.removeChildren = function()
{
    this.child_ = null;
}



/** ****************************************************************************
 * Remove a child from the list
 ******************************************************************************/
Container.prototype.removeChild = function(child)
{
    // check if child is in fact our child
    if (child.parent_ != this)
        return;
    
    /* if child is the first in list, we can remove it
     * by setting the next child in list as first
     */
    if (this.child_ == child)
    {
        this.child_ = child.next_;
        
        if (child.next_ != null)
            child.next_.previous_ = null;
        
        child.parent_ = null;
        child.previous_ = null;
        child.next_ = null;
    }
    /* otherwise we have to look it up in child list
     * and do some pointer juggling
     */
    else
    {
        if (child.previous_ != null)
            child.previous_.next_ = child.next_;
        
        if (child.next_ != null)
            child.next_.previous_ = child.previous_;
        
        child.parent_ = null;
        child.previous_ = null;
        child.next_ = null;
    }
}



/** ****************************************************************************
 * Unlink next sibling in list
 ******************************************************************************/
Container.prototype.removeNext = function()
{
    this.next_ = null;
}



/** ****************************************************************************
 * Unlink parent
 ******************************************************************************/
Container.prototype.removeParent = function()
{
    this.parent_ = null;
}



/** ****************************************************************************
 * Unlink previous sibling in list
 ******************************************************************************/
Container.prototype.removePrevious = function()
{
    this.previous_ = null;
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
         container = container.next_)
    {
        container.parent_ = parent;
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

    if (this.is_root_)
        string += "ROOT ";

    if (this.message_ == null)
    {
        string += "DUMMY";
    }
    else
    {
        string += this.message_.toString();
    }

    var container = null;
    for (container = this.child_;
         container != null;
         container = container.next_)
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
    if (this.parent_ != null)
      if (this.parent_.parent_ != null)
        return this.parent_.toStringThread();

    return this.toString("\n");
}
