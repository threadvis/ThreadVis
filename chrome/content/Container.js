/** ****************************************************************************
 * Container.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007-2008 Alexander C. Hubmann-Haidvogel
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
 ******************************************************************************/
ThreadVisNS.Container.prototype.addChild = function(child) {
    // check if child is already our child
    // if so, do nothing
    if (child.getParent() == this)
        return;

    /* check to see if this container is a child of child
     * this should never happen, because we would create a loop
     * that's why we don't allow it
     */
    if (this.findParent(child)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_ERROR,
            "Container.addChild()" , {"error" : "tried to create loop"});
        return;
    }

    /* remove it from old chain
     * child.hasPrevious means that it's not the first in chain,
     * so take it out of old chain by juggling the pointers
     */
    if (child.getPrevious() != null) {
        child.getPrevious().setNext(child.getNext());
        if (child.getNext() != null) {
            child.getNext().setPrevious(child.getPrevious());
        }
    }
    /* child has no previous, so it's the first in child list
     * remove it by letting the parent point to the next child in list
     */
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
 * Low level check if tree is valid
 ******************************************************************************/
ThreadVisNS.Container.prototype.check = function() {
    // check if prev-next relationship holds
    if (this.hasPrevious()) {
        if (this.getPrevious().getNext() != this) {
            alert("CHECK: getPrevious().getNext() did not return this");
            alert("this:" + this);
            alert("previous:" + this.getPrevious());
            alert("previous.getNext():" + this.getPrevious().getNext());
        }
    }

    if (this.hasNext()) {
        if (this.getNext().getPrevious() != this) {
            alert("CHECK: getNext().getPrevious() did not return this");
            alert(this);
            alert("this:" + this);
            alert("next:" + this.getNext());
            alert("next.getPrevious():" + this.getNext().getPrevious());
        }
    }

    // check if parent relationship holds
    if (this.hasParent()) {
        if (this.findParent(this.getParent()) != true) {
            alert("CHECK: getParent().findChild() did not return true");
            alert("this: " + this);
            alert("parent: " + this.getParent());
        }
    }

   // check children
   var child = this.getChild();
   while (child != null) {
        child.check();
        child = child.getNext();
    }
}



/** ****************************************************************************
 * See if this container or any of its parents
 * contains a specific container
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
 ******************************************************************************/
ThreadVisNS.Container.prototype.getChild = function() {
    return this.child;
}



/** ****************************************************************************
 * Get child count
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
 * return at which position child is in child list
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
 ******************************************************************************/
ThreadVisNS.Container.prototype.getNext = function() {
    return this.next;
}



/** ****************************************************************************
 * Get message of this container
 ******************************************************************************/
ThreadVisNS.Container.prototype.getMessage = function() {
    return this.message;
}



/** ****************************************************************************
 * Set parent of this container
 ******************************************************************************/
ThreadVisNS.Container.prototype.getParent = function() {
    return this.parent;
}



/** ****************************************************************************
 * Get previous sibling in list
 ******************************************************************************/
ThreadVisNS.Container.prototype.getPrevious = function() {
    return this.previous;
}



/** ****************************************************************************
 * Get reply count of message of this container
 ******************************************************************************/
ThreadVisNS.Container.prototype.getReplyCount = function() {
    return (this.isDummy() ? 0 : this.getMessage().getReplyCount());
}



/** ****************************************************************************
 * Get simplified subject of this thread
 ******************************************************************************/
ThreadVisNS.Container.prototype.getSimplifiedSubject = function() {
    if (! this.isDummy()) {
        return this.getMessage().getSimplifiedSubject();
    } else if (this.hasChild()) {
        return this.getChild().getSimplifiedSubject();
    } else {
        return "";
    }
}



/** ****************************************************************************
 * Get subject of message of this thread
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
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasChild = function() {
    return (this.getChild() != null);
}



/** ****************************************************************************
 * See if this container contains at least 2 children
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasChildren = function() {
    return (this.hasChild() ? this.getChild().hasSiblings() : false);
}



/** ****************************************************************************
 * See if this container has a dummy child
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
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasNext = function() {
    return (this.getNext() != null);
}



/** ****************************************************************************
 * See if this container has exactly 1 child
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasOneChild = function() {
    return (this.hasChild() ? (! this.getChild().hasNext()) : false);
}



/** ****************************************************************************
 * See if this container has a parent
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasParent = function() {
    return (this.getParent() != null);
}



/** ****************************************************************************
 * See if we have a previous sibling in list
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasPrevious = function() {
    return (this.getPrevious() != null);
}



/** ****************************************************************************
 * See if we have other containers in sibling list
 ******************************************************************************/
ThreadVisNS.Container.prototype.hasSiblings = function() {
    return (this.hasNext() || this.hasPrevious());
}



/** ****************************************************************************
 * See if this container contains a message
 ******************************************************************************/
ThreadVisNS.Container.prototype.isDummy = function() {
    return (this.getMessage() == null);
}



/** ****************************************************************************
 * See if this container is a reply
 ******************************************************************************/
ThreadVisNS.Container.prototype.isReply = function() {
    return (this.isDummy() ? false : this.getMessage().isReply());
}



/** ****************************************************************************
 * Return if this container is the topmost container
 ******************************************************************************/
ThreadVisNS.Container.prototype.isRoot = function() {
    return this.root;
}



/** ****************************************************************************
 * Return if this container is a top container
 * (topmost container that is not the root container)
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
 ******************************************************************************/
ThreadVisNS.Container.prototype.mergeChild = function(dummy, child) {
    dummy.addChildren(child.getChild());
    dummy.setMessage(child.message.getMessage());
}



/** ****************************************************************************
 * Prune empty containers in this container
 ******************************************************************************/
ThreadVisNS.Container.prototype.pruneEmptyContainers = function() {
    /* 4. Prune empty containers
     * prune if this container is dummy (empty)
     * and does not have a child and has a parent
     */
    if (this.isDummy() && (! this.hasChild()) && this.hasParent()) {
        this.getParent().removeChild(this);
    }
    /*
     * do not prune if is dummy and has one child, because
     * then we lose information about missing messages
     *
     */

    var container = null;
    for (container = this.getChild(); container != null;
        container = container.getNext()) {
        container.pruneEmptyContainers();
    }
}



/** ****************************************************************************
 * Unlink all children
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeChildren = function() {
    this.removeChild();
}



/** ****************************************************************************
 * Remove a child from the list
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeChild = function(child) {
    // check if child is in fact our child
    if (child.getParent() != this) {
        return;
    }

    /* if child is the first in list, we can remove it
     * by setting the next child in list as first
     */
    if (this.getChild() == child) {
        this.setChild(child.getNext());
        
        if (child.hasNext()) {
            child.getNext().removePrevious();
        }

        child.removeParent();
        child.removePrevious();
        child.removeNext();
    }
    /* otherwise we have to look it up in child list
     * and do some pointer juggling
     */
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
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeNext = function() {
    this.setNext(null);
}



/** ****************************************************************************
 * Unlink parent
 ******************************************************************************/
ThreadVisNS.Container.prototype.removeParent = function() {
    this.setParent(null);
}



/** ****************************************************************************
 * Unlink previous sibling in list
 ******************************************************************************/
ThreadVisNS.Container.prototype.removePrevious = function() {
    this.setPrevious(null);
}



/** ****************************************************************************
 * Set first child in list
 ******************************************************************************/
ThreadVisNS.Container.prototype.setChild = function(child) {
    this.child = child;
}



/** ****************************************************************************
 * Set next sibling in list
 ******************************************************************************/
ThreadVisNS.Container.prototype.setNext = function(next) {
    this.next = next;
}



/** ****************************************************************************
 * Set message of this container
 ******************************************************************************/
ThreadVisNS.Container.prototype.setMessage = function(message) {
    this.message = message;
}



/** ****************************************************************************
 * Set parent of this container
 ******************************************************************************/
ThreadVisNS.Container.prototype.setParent = function(parent) {
    this.parent = parent;
}



/** ****************************************************************************
 * Set parent for all containers in list
 ******************************************************************************/
ThreadVisNS.Container.prototype.setParentForContainer = function(sibling, parent) {
    var container = null;
    for (container = sibling; container != null;
        container = container.getNext()) {
        container.setParent(parent);
    }
}



/** ****************************************************************************
 * Set previous sibling in list
  ******************************************************************************/
ThreadVisNS.Container.prototype.setPrevious = function(prev) {
    this.previous = prev;
}



/** ****************************************************************************
 * Sort function for sorting javascript array
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
