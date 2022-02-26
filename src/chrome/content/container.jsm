/* *********************************************************************************************************************
 * This file is part of ThreadVis.
 * https://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis titled
 * "ThreadVis for Thunderbird: A Thread Visualisation Extension for the Mozilla Thunderbird Email Client"
 * at Graz University of Technology, Austria. An electronic version of the thesis is available online at
 * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with ThreadVis.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *********************************************************************************************************************
 * Implements container for messages
 **********************************************************************************************************************/

var EXPORTED_SYMBOLS = [ "Container", "sortFunction"];
class Container {
    /**
     * Constructor
     * 
     * @constructor
     * @return A new container
     */
    constructor() {
        /**
         * First container in child list
         * 
         * @type {Container}
         */
        this.child = null;

        /**
         * Store message in this container
         * 
         * @type {Message}
         */
        this.message = null;

        /**
         * Next container in sibling list
         * 
         * @type {Container}
         */
        this.next = null;

        /**
         * Parent of this container
         * 
         * @type {Container}
         */
        this.parent = null;

        /**
         * Previous container in sibling list
         * 
         * @type {Container}
         */
        this.previous = null;

        /**
         * save horizontal position of dot
         */
        // TODO move to containervis
        this.xPosition = 0;
    };

    /**
     * Add child to this container. Removes child from old sibling list. Inserts child and all its children.
     * 
     * @param {Container} child - The child to add
     */
    addChild(child) {
        // check if child is already our child. if so, do nothing
        if (child.getParent() == this) {
            return;
        }

        // check to see if this container is a child of child.
        // this should never happen, because we would create a loop. that's why we don't allow it
        if (this.findParent(child)) {
            return;
        }

        // remove it from old chain.
        // child.hasPrevious means that it's not the first in chain,
        // so take it out of old chain by juggling the pointers
        if (child.hasPrevious()) {
            child.getPrevious().setNext(child.getNext());
            if (child.getNext() != null) {
                child.getNext().setPrevious(child.getPrevious());
            }
        }
        // child has no previous, so it's the first in child list.
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

    /**
     * Inserts children into child list. Children have to be removed from old position first!
     * 
     * @param {Container} child - The child to add
     */
    addChildren(child) {
        // we always want to be passed the first child in list
        if (child.hasPrevious()) {
            throw new Error("Cannot add non-first child");
        }

        if (! this.hasChild()) {
            this.setChild(child);
            this.setParentForContainer(child, this);
        } else {
            this.getChild().addSibling(child);
        }
    }

    /**
     * Insert a container into sibling list
     * 
     * @param {Container} sibling - The container to add as a sibling
     */
    addSibling(sibling) {
        if (this.hasNext()) {
            this.getNext().setPrevious(sibling);
        }

        this.setParentForContainer(sibling, this.getParent());

        sibling.getLast().setNext(this.getNext());
        sibling.setPrevious(this);
        this.setNext(sibling);
    }

    /**
     * See if this container or any of its parents contains a specific container
     * 
     * @param {Container} target - The container to find
     * @return {Boolean} - True if the container is contained in the parent list, false if not
     */
    findParent(target) {
        const container = this.getParent();

        if (container == null) {
            return false;
        }

        if (container == target) {
            return true;
        }

        return container.findParent(target);
    }

    /**
     * Get first child in child list
     * 
     * @return {Container} - Return the first child
     */
    getChild() {
        return this.child;
    }

    /**
     * Get all children of this container as array
     * 
     * @return {Array<Container>} - All children of the current container, recursively
     */
    getChildren() {
        let containers = new Array();
        for (let container = this.getChild(); container != null; container = container.getNext()) {
            containers.push(container);
            containers = containers.concat(container.getChildren());
        }
        return containers;
    }

    /**
     * Get recursive container count
     * 
     * @return {Number} - The number of all children, counted recursively
     */
    getCount() {
        let count = 1;
        for (let container = this.getChild(); container != null; container = container.getNext()) {
            count += container.getCount();
        }
        return count;
    }

    /**
     * Get date of message
     * 
     * @ {Date} - The date of the message
     */
    getDate() {
        if (!this.isDummy()) {
            return this.getMessage().getDate();
        }

        if (this.hasChild()) {
            return this.getChild().getDate();
        }

        // we are dummy, we have NO child: this shouldn't happen
        return new Date();
    }

    /**
     * Get depth of message in tree
     * 
     * @return {Number} - The generational depth of the message
     */
    getDepth() {
        if (this.hasParent()) {
            return 1 + this.getParent().getDepth();
        } else {
            return 0;
        }
    }

    /**
     * Get last sibling in list
     * 
     * @return {Container} - The last sibling
     */
    getLast() {
        let current = this;
        while (current.hasNext()) {
            current = current.getNext();
        }
        return current;
    }

    /**
     * Get next sibling in list
     * 
     * @return {Container} - The next container in the sibling list
     */
    getNext() {
        return this.next;
    }

    /**
     * Get message of this container
     * 
     * @return {Message} - The message
     */
    getMessage() {
        return this.message;
    }

    /**
     * Get parent of this container
     * 
     * @return {Container} - The parent of the message
     */
    getParent() {
        return this.parent;
    }

    /**
     * Get previous sibling in list
     * 
     * @return {Container} - The previous sibling in the list
     */
    getPrevious() {
        return this.previous;
    }

    /**
     * Get topmost container
     * 
     * @return {Container} - The topmost container of the thread
     */
    getTopContainer() {
        if (this.hasParent()) {
            return this.getParent().getTopContainer();
        }
        return this;
    }

    /**
     * See if this container has at least 1 child
     * 
     * @return {Boolean} - True if the container has a child container
     */
    hasChild() {
        return (this.getChild() != null);
    }

    /**
     * See if we have a next sibling in list
     * 
     * @return {Boolean} - True if the container has a next sibling in the list
     */
    hasNext() {
        return (this.getNext() != null);
    }

    /**
     * See if this container has a parent
     * 
     * @return {Boolean} - True if the container has a parent container
     */
    hasParent() {
        return (this.getParent() != null);
    }

    /**
     * See if we have a previous sibling in list
     * 
     * @return {Boolean} - True if the container has a previous sibling in the list
     */
    hasPrevious() {
        return (this.getPrevious() != null);
    }

    /**
     * See if this container contains a message
     * 
     * @return {Boolean} - True if the container is a dummy container (i.e. contains no message)
     */
    isDummy() {
        return (this.getMessage() == null);
    }

    /**
     * Remove a child from the list
     * 
     * @param {ThreadVis.Container} child - The child container to remove
     */
    removeChild(child) {
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

    /**
     * Unlink next sibling in list
     */
    removeNext() {
        this.setNext(null);
    }

    /**
     * Unlink parent
     */
    removeParent() {
        this.setParent(null);
    }

    /**
     * Unlink previous sibling in list
     */
    removePrevious() {
        this.setPrevious(null);
    }

    /**
     * Set first child in list
     * 
     * @param {ThreadVis.Container} child - The child to set
     */
    setChild(child) {
        this.child = child;
    }

    /**
     * Set next sibling in list
     * 
     * @param {ThreadVis.Container} next - The container to set
     */
    setNext(next) {
        this.next = next;
    }

    /**
     * Set message of this container
     * 
     * @param {ThreadVis.Message} message - The message to set
     */
    setMessage(message) {
        this.message = message;
    }

    /**
     * Set parent of this container
     * 
     * @param {ThreadVis.Container} parent - The parent container
     */
    setParent(parent) {
        this.parent = parent;
    }

    /**
     * Set parent for all containers in list
     * 
     * @param {ThreadVis.Container} sibling - The first sibling in the list
     * @param {ThreadVis.Container} parent - The parent to set
     */
    setParentForContainer(sibling, parent) {
        for (let container = sibling; container != null; container = container.getNext()) {
            container.setParent(parent);
        }
    }

    /**
     * Set previous sibling in list
     * 
     * @param {ThreadVis.Container} prev - The previous container
     */
    setPrevious(prev) {
        this.previous = prev;
    }

    /**
     * Output string representation of this container
     * 
     * @param {String} prefix - The prefix
     * @return {String} - The string representation
     */
    toString(prefix) {
        if (prefix == null) {
            prefix = "\n";
        }

        let string = prefix;

        if (this.isDummy()) {
            string += "DUMMY";
        } else {
            string += this.getMessage().toString();
        }

        for (let container = this.getChild(); container != null; container = container.getNext()) {
            string += container.toString(prefix + "XXXX");
        }
        return string;
    }
}

/**
 * Sort function for sorting javascript array
 * Sort by date, but never sort child before parent
 * 
 * @param {ThreadVis.Container} one - The first container
 * @param {ThreadVis.Container} two - The second container
 * @return {Number} - -1 to sort one before two, +1 to sort two before one
 */
const sortFunction = (one, two) => {
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
    // if one of the containers is a dummy, getDate() returns the date of its first child.
    // this should be enough to ensure the timeline
    const difference = one.getDate().getTime() - two.getDate().getTime();

    if (difference < 0) {
        return -1;
    } else {
        return 1;
    }
};