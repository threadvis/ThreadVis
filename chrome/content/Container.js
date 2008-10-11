/** ****************************************************************************
 * Container.js
 *
 * Copyright (C) 2005-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * Implements container for messages
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor
 *
 * @param root
 *          True if container is the root conainer
 * @return
 *          A new container
 ******************************************************************************/
ThreadVisNS.Container = function(root) {
    /**
     * First container in child list
     */
    this.child = null;

    /**
     * We are root container
     */
    this.root = root;

    /**
     * Store message in this container
     */
    this.message = null;

    /**
     * Next container in sibling list
     */
    this.next = null;

    /**
     * Parent of this container
     */
    this.parent = null;

    /**
     * Previous container in sibling list
     */
    this.previous = null;

    /**
     * save horizontal position of dot
     */
    this.xPosition = 0;
}



/** ****************************************************************************
 * Add child to this container
 * Removes child from old sibling list
 * Inserts child and all its children
 *
 * @param child
 *          The child to add
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.addChild = function(child) {
    // check if child is already our child
    // if so, do nothing
    if (child.getParent() == this)
        return;

    // check to see if this container is a child of child
    // this should never happen, because we would create a loop
    // that's why we don't allow it
    if (this.findParent(child)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_ERROR,
            "Container.addChild()" , {"error" : "tried to create loop"});
        return;
    }

    // remove it from old chain
    // child.hasPrevious means that it's not the first in chain,
    // so take it out of old chain by juggling the pointers
    if (child.getPrevious() != null) {
        child.getPrevious().setNext(child.getNext());
        if (child.getNext() != null) {
            child.getNext().setPrevious(child.getPrevious());
        }
    }
    // child has no previous, so it's the first in child list
    // remove it by letting the parent point to the next child in list
    else if (child.getParent() != null) {
        child.getParent().setChild(child.getNext());
        if (child.getNext() != null) {
            child.getNext().removePrevious();
        }
    }
    child.removeNext();
    child.removePrevious();
    child.removeParent();

    this.addChildren(child);
}



/** ****************************************************************************
 * Inserts children into child list
 * Children have to be removed from old position first!
 *
 * @param child
 *          The child to add
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.addChildren = function(child) {
    // we always want to be passed the first child in list
    if (child.getPrevious() != null) {
        // fixxme
        alert("not happen");
    }

    if (this.getChild() == null) {
        this.setChild(child);
        this.setParentForContainer(child, this);
    } else {
        this.getChild().addSibling(child);
    }
}



/** ****************************************************************************
 * Insert a container into sibling list
 *
 * @param sibling
 *          The container to add as a sibling
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.addSibling = function(sibling) {
    if (this.hasNext()) {
        this.getNext().setPrevious(sibling);
    }

    this.setParentForContainer(sibling, this.getParent());

    sibling.getLast().setNext(this.getNext());
    sibling.setPrevious(this);
    this.setNext(sibling);
}



/** ****************************************************************************
 * See if this container or any of its parents contains a specific container
 *
 * @param target
 *          The container to find
 * @return
 *          True if the container is contained in the parent list, false if not
 ******************************************************************************/
ThreadVisNS.Container.prototype.findParent = function(target) {
    var container = this.getParent();

    if (container == null) {
        return false;
    }

    if (container == target) {
        return true;
    }

    return container.findParent(target);
}



/** ****************************************************************************
 * Get first child in child list
 *
 * @return
 *          Return the first child
 ******************************************************************************/
ThreadVisNS.Container.prototype.getChild = function() {
    return this.child;
}



/** ****************************************************************************
 * Get child count
 *
 * @return
 *          The number of children
 ******************************************************************************/
ThreadVisNS.Container.prototype.getChildCount = function() {
    var count = 0;
    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        count++;
    }
    return count;
}



/** ****************************************************************************
 * Return at which position child is in child list
 *
 * @return
 *          The position of the child in the child list
 ******************************************************************************/
ThreadVisNS.Container.prototype.getChildPosition = function(child) {
    var count = 0;
    var container = 0;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        if (container == child) {
            return count;
        }
        count++;
    }
    return 0;
}



/** ****************************************************************************
 * Get all children of this container as array
 *
 * @return
 *          All children of the current container, recursively
 ******************************************************************************/
ThreadVisNS.Container.prototype.getChildren = function() {
    var containers = new Array();
    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        containers.push(container);
        containers = containers.concat(container.getChildren());
    }
    return containers;
}



/** ****************************************************************************
 * Get recursive container count
 *
 * @return
 *          The number of all children, counted recursively
 ******************************************************************************/
ThreadVisNS.Container.prototype.getCountRecursive = function() {
    var count = 1;
    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        count += container.getCountRecursive();
    }
    return count;
}



/** ****************************************************************************
 * Get date of message
 *
 * @return
 *          The date of the message
 ******************************************************************************/
ThreadVisNS.Container.prototype.getDate = function() {
    if (! this.isDummy()) {
        return this.getMessage().getDate();
    }

    if (this.getChild() != null) {
        return this.getChild().getDate();
    }

    // we are dummy
    // we have NO child
    // this shouldn't happen
    return null;
}



/** ****************************************************************************
 * Get depth of message in tree
 *
 * @return
 *          The generational depth of the message
 ******************************************************************************/
ThreadVisNS.Container.prototype.getDepth = function() {
    if (this.hasParent()) {
        if (this.getParent().isRoot()) {
            return 0;
        } else {
            return 1 + this.getParent().getDepth();
        }
    } else {
        return 0;
    }
}



/** ****************************************************************************
 * Get first dummy child
 *
 * @return
 *          The first dummy child, null if none exists
 ******************************************************************************/
ThreadVisNS.Container.prototype.getDummy = function() {
    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        if (container.isDummy()) {
            return container;
        }
    }
    return null;
}



/** ****************************************************************************
 * Get last sibling in list
 *
 * @return
 *          The last sibling
 ******************************************************************************/
ThreadVisNS.Container.prototype.getLast = function() {
    var current = this;
    while (current.hasNext()) {
        current = current.getNext();
    }
    return current;
}



/** ****************************************************************************
 * Get next sibling in list
 *
 * @return
 *          The next container in the sibling list
 ******************************************************************************/
ThreadVisNS.Container.prototype.getNext = function() {
    return this.next;
}



/** ****************************************************************************
 * Get message of this container
 *
 * @return
 *          The message
 ******************************************************************************/
ThreadVisNS.Container.prototype.getMessage = function() {
    return this.message;
}



/** ****************************************************************************
 * Get parent of this container
 *
 * @return
 *          The parent of the message
 ******************************************************************************/
ThreadVisNS.Container.prototype.getParent = function() {
    return this.parent;
}



/** ****************************************************************************
 * Get previous sibling in list
 *
 * @return
 *          The previous sibling in the list
 ******************************************************************************/
ThreadVisNS.Container.prototype.getPrevious = function() {
    return this.previous;
}



/** ****************************************************************************
 * Get subject of message of this thread
 *
 * @return
 *          The subject of the thread (i.e. the subject of the first message)
 ******************************************************************************/
ThreadVisNS.Container.prototype.getSubject = function() {
    if (! this.isDummy()) {
        return this.getMessage().getSubject();
    } else if (this.getChild() != null) {
        return this.getChild().getSubject();
    } else {
        return "";
    }
}



/** ****************************************************************************
 * Get topmost container that is not the root container
 *
 * @return
 *          The topmost container of the thread
 ******************************************************************************/
ThreadVisNS.Container.prototype.getTopContainer = function() {
    if (this.hasParent()) {
        if (! this.getParent().isRoot()) {
            return this.getParent().getTopContainer();
        } else {
            return this;
        }
    }
    return this;
}



/** ****************************************************************************
 * See if this container has at least 1 child
 *
 * @return
 *          True if the container has a child container
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasChild = function() {
    return (this.getChild() != null);
}



/** ****************************************************************************
 * See if this container contains at least 2 children
 *
 * @return
 *          True if the container has at least two children
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasChildren = function() {
    return (this.hasChild() ? this.getChild().hasSiblings() : false);
}



/** ****************************************************************************
 * See if this container has a dummy child
 *
 * @return
 *          True if the container has a dummy child
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasDummy = function() {
    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        if (container.isDummy()) {
            return true;
        }
    }
    return false;
}



/** ****************************************************************************
 * See if we have a next sibling in list
 *
 * @return
 *          True if the container has a next sibling in the list
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasNext = function() {
    return (this.getNext() != null);
}



/** ****************************************************************************
 * See if this container has exactly 1 child
 *
 * @return
 *          True if the container has exactly one child
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasOneChild = function() {
    return (this.hasChild() ? (! this.getChild().hasNext()) : false);
}



/** ****************************************************************************
 * See if this container has a parent
 *
 * @return
 *          True if the container has a parent container
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasParent = function() {
    return (this.getParent() != null);
}



/** ****************************************************************************
 * See if we have a previous sibling in list
 *
 * @return
 *          True if the container has a previous sibling in the list
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasPrevious = function() {
    return (this.getPrevious() != null);
}



/** ****************************************************************************
 * See if we have other containers in sibling list
 *
 * @return
 *          True if the container has any siblings
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasSiblings = function() {
    return (this.hasNext() || this.hasPrevious());
}



/** ****************************************************************************
 * See if this container contains a message
 *
 * @return
 *          True if the container is a dummy container
 *          (i.e. contains no message)
 ******************************************************************************/
ThreadVisNS.Container.prototype.isDummy = function() {
    return (this.getMessage() == null);
}



/** ****************************************************************************
 * Return if this container is the top most container
 *
 * @return
 *          True if this container is the root container
 ******************************************************************************/
ThreadVisNS.Container.prototype.isRoot = function() {
    return this.root;
}



/** ****************************************************************************
 * Return if this container is a top container
 * (topmost container that is not the root container)
 *
 * @return
 *          True if this container is the first container in a thread
 ******************************************************************************/
ThreadVisNS.Container.prototype.isTopContainer = function() {
    if (this.hasParent()) {
        if (this.getParent().isRoot()) {
            return true;
        }
    }
    return false;
}



/** ****************************************************************************
 * Merge container into this container
 * add children as this children
 * set message as this message
 *
 * @param dummy
 *          The dummy container into which to merge the child
 * @param child
 *          The child container to merge
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.mergeChild = function(dummy, child) {
    dummy.addChildren(child.getChild());
    dummy.setMessage(child.message.getMessage());
}



/** ****************************************************************************
 * Prune empty containers in this container
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.pruneEmptyContainers = function() {
    // 4. Prune empty containers
    // prune if this container is dummy (empty)
    // and does not have a child and has a parent
    if (this.isDummy() && (! this.hasChild()) && this.hasParent()) {
        this.getParent().removeChild(this);
    }

     // do not prune if is dummy and has one child, because
     // then we lose information about missing messages

    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        container.pruneEmptyContainers();
    }
}



/** ****************************************************************************
 * Unlink all children
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeChildren = function() {
    this.removeChild();
}



/** ****************************************************************************
 * Remove a child from the list
 *
 * @param child
 *          The child container to remove
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeChild = function(child) {
    // check if child is in fact our child
    if (child.getParent() != this) {
        return;
    }

    // if child is the first in list, we can remove it
    // by setting the next child in list as first
    if (this.getChild() == child) {
        this.setChild(child.getNext());
        
        if (child.hasNext()) {
            child.getNext().removePrevious();
        }

        child.removeParent();
        child.removePrevious();
        child.removeNext();
    }
    // otherwise we have to look it up in child list
    // and do some pointer juggling
    else {
        if (child.hasPrevious()) {
            child.getPrevious().setNext(child.getNext());
        }
        
        if (child.hasNext()) {
            child.getNext().setPrevious(child.getPrevious());
        }

        child.removeParent();
        child.removePrevious();
        child.removeNext();
    }
}



/** ****************************************************************************
 * Unlink next sibling in list
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeNext = function() {
    this.setNext(null);
}



/** ****************************************************************************
 * Unlink parent
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeParent = function() {
    this.setParent(null);
}



/** ****************************************************************************
 * Unlink previous sibling in list
 *
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.removePrevious = function() {
    this.setPrevious(null);
}



/** ****************************************************************************
 * Set first child in list
 *
 * @param child
 *          The child to set
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.setChild = function(child) {
    this.child = child;
}



/** ****************************************************************************
 * Set next sibling in list
 *
 * @param next
 *          The container to set
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.setNext = function(next) {
    this.next = next;
}



/** ****************************************************************************
 * Set message of this container
 *
 * @param message
 *          The message to set
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.setMessage = function(message) {
    this.message = message;
}



/** ****************************************************************************
 * Set parent of this container
 *
 * @param parent
 *          The parent container
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.setParent = function(parent) {
    this.parent = parent;
}



/** ****************************************************************************
 * Set parent for all containers in list
 *
 * @param sibling
 *          The first sibling in the list
 * @param parent
 *          The parent to set
 * @return
 *          void
 ******************************************************************************/
ThreadVisNS.Container.prototype.setParentForContainer = function(sibling,
    parent) {
    var container = null;
    for (container = sibling; container != null;
        container = container.getNext()) {
        container.setParent(parent);
    }
}



/** ****************************************************************************
 * Set previous sibling in list
 *
 * @param prev
 *          The previous container
 * @return
 *          void
  ******************************************************************************/
ThreadVisNS.Container.prototype.setPrevious = function(prev) {
    this.previous = prev;
}



/** ****************************************************************************
 * Sort function for sorting javascript array
 * Sort by date, but never sort child before parent
 *
 * @param one
 *          The first container
 * @param two
 *          The second container
 * @return
 *          -1 to sort one before two, +1 to sort two before one
 ******************************************************************************/
function Container_sortFunction(one, two) {
    // just to be sure, we never want to sort a child
    // before one of its parents
    // (could happen if time information in mail is wrong,
    // e.g. time of mailclient is off)
    if (two.findParent(one)) {
        return -1;
    }

    if (one.findParent(two)) {
        return 1;
    }

    // sort all others by date
    // if one of the containers is a dummy, getDate() returns the date
    // of its first child. this should be enough to ensure the timeline
    var difference = one.getDate().getTime() - two.getDate().getTime();

    if (difference < 0) {
        return - 1;
    } else {
        return 1;
    }
}



/** ****************************************************************************
 * Output string representation of this container
 *
 * @param prefix
 *          The prefix
 * @return
 *          The string representation
 ******************************************************************************/
ThreadVisNS.Container.prototype.toString = function(prefix) {
    if (prefix == null) {
        prefix = "\n";
    }

    var string = "";
    string = prefix;
    
    if (this.isRoot()) {
        string += "ROOT ";
    }

    if (this.isDummy()) {
        string += "DUMMY";
    } else {
        string += this.getMessage().toString();
    }

    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        string += container.toString(prefix + "XXXX");
    }
    return string;
}



/** ****************************************************************************
 * Output string representation of this container
 *
 * @return
 *          A string representation
 ******************************************************************************/
ThreadVisNS.Container.prototype.toStringThread = function() {
    if (! this.isDummy()) {
        if (! this.getParent().isDummy()) {
            return this.getParent().toStringThread();
        }
    }

    return this.toString("\n");
}



/** ****************************************************************************
 * Get string cache
 *
 * @return
 *          An array of all message ids in the container
 ******************************************************************************/
ThreadVisNS.Container.prototype.getCache = function() {
    var cache = [];

    if (! this.isDummy()) {
        cache.push(this.getMessage().getId());
    }

    if (this.hasChild()) {
        // get cache for all children
        var container = null;
        for (container = this.getChild(); container != null;
            container = container.getNext()) {
            cache = cache.concat(container.getCache());
        }
    }
    return cache;
}
