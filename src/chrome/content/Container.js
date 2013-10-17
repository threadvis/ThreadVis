/* *****************************************************************************
 * This file is part of ThreadVis.
 * http://threadvis.github.io
 *
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 * An electronic version of the thesis is available online at
 * http://www.iicm.tugraz.at/ahubmann.pdf
 *
 * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
 * Copyright (C) 2007, 2008, 2009, 2010, 2011,
 *               2013 Alexander C. Hubmann-Haidvogel
 *
 * ThreadVis is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with ThreadVis. If not, see <http://www.gnu.org/licenses/>.
 *
 * Version: $Id$
 * *****************************************************************************
 * Implements container for messages
 ******************************************************************************/

var ThreadVis = (function(ThreadVis) {

    /**
     * Constructor
     * 
     * @constructor
     * @param {Boolean}
     *            root True if container is the root container
     * @return A new container
     */
    ThreadVis.Container = function(root) {
        this._root = root;
        /**
         * save horizontal position of dot
         */
        // TODO move to containervis
        this.xPosition = 0;
    };

    /**
     * Sort function for sorting javascript array Sort by date, but never sort
     * child before parent
     * 
     * @param {ThreadVis.Container}
     *            one The first container
     * @param {ThreadVis.Container}
     *            two The second container
     * @return {Number} -1 to sort one before two, +1 to sort two before one
     * @type Number
     */
    ThreadVis.Container.sortFunction = function(one, two) {
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
            return -1;
        } else {
            return 1;
        }
    };

    /**
     * Prototype / instance methods
     */
    ThreadVis.Container.prototype = {
        /**
         * First container in child list
         * 
         * @type {ThreadVis.Container}
         */
        _child : null,

        /**
         * We are root container
         * 
         * @type {Boolean}
         */
        _root : false,

        /**
         * Store message in this container
         * 
         * @type {ThreadVis.Message}
         */
        _message : null,

        /**
         * Next container in sibling list
         * 
         * @type {ThreadVis.Container}
         */
        _next : null,

        /**
         * Parent of this container
         * 
         * @type {ThreadVis.Container}
         */
        _parent : null,

        /**
         * Previous container in sibling list
         * 
         * @type {ThreadVis.Container}
         */
        _previous : null,

        /**
         * Add child to this container. Removes child from old sibling list.
         * Inserts child and all its children.
         * 
         * @param {ThreadVis.Container}
         *            child The child to add
         */
        addChild : function(child) {
            // check if child is already our child
            // if so, do nothing
            if (child.getParent() == this) {
                return;
            }

            // check to see if this container is a child of child
            // this should never happen, because we would create a loop
            // that's why we don't allow it
            if (this.findParent(child)) {
                return;
            }

            // remove it from old chain
            // child.hasPrevious means that it's not the first in chain,
            // so take it out of old chain by juggling the pointers
            if (child._hasPrevious()) {
                child._getPrevious()._setNext(child._getNext());
                if (child._getNext() != null) {
                    child._getNext()._setPrevious(child._getPrevious());
                }
            }
            // child has no previous, so it's the first in child list
            // remove it by letting the parent point to the next child in
            // list
            else if (child.getParent() != null) {
                child.getParent()._setChild(child._getNext());
                if (child._getNext() != null) {
                    child._getNext()._removePrevious();
                }
            }
            child._removeNext();
            child._removePrevious();
            child._removeParent();

            this._addChildren(child);
        },

        /**
         * Inserts children into child list. Children have to be removed from
         * old position first!
         * 
         * @param {ThreadVis.Container}
         *            child The child to add
         */
        _addChildren : function(child) {
            // we always want to be passed the first child in list
            if (child._hasPrevious()) {
                // fixxme
                alert("not happen");
            }

            if (! this._hasChild()) {
                this._setChild(child);
                this._setParentForContainer(child, this);
            } else {
                this._getChild()._addSibling(child);
            }
        },

        /**
         * Insert a container into sibling list
         * 
         * @param {ThreadVis.Container}
         *            sibling The container to add as a sibling
         */
        _addSibling : function(sibling) {
            if (this._hasNext()) {
                this._getNext()._setPrevious(sibling);
            }

            this._setParentForContainer(sibling, this.getParent());

            sibling._getLast()._setNext(this._getNext());
            sibling._setPrevious(this);
            this._setNext(sibling);
        },

        /**
         * See if this container or any of its parents contains a specific
         * container
         * 
         * @param {ThreadVis.Container}
         *            target The container to find
         * @return {Boolean} True if the container is contained in the parent
         *         list, false if not
         * @type Boolean
         */
        findParent : function(target) {
            var container = this.getParent();

            if (container == null) {
                return false;
            }

            if (container == target) {
                return true;
            }

            return container.findParent(target);
        },

        /**
         * Get first child in child list
         * 
         * @return {ThreadVis.Container} Return the first child
         * @type ThreadVis.Container
         */
        _getChild : function() {
            return this.child;
        },

        /**
         * Get all children of this container as array
         * 
         * @return {Array} All children of the current container, recursively
         * @type Array
         */
        getChildren : function() {
            var containers = new Array();
            for (var container = this._getChild(); container != null;
                    container = container._getNext()) {
                containers.push(container);
                containers = containers.concat(container.getChildren());
            }
            return containers;
        },

        /**
         * Get recursive container count
         * 
         * @return {Number} The number of all children, counted recursively
         * @type Number
         */
        getCount : function() {
            var count = 1;
            for (var container = this._getChild(); container != null;
                    container = container._getNext()) {
                count += container.getCount();
            }
            return count;
        },

        /**
         * Get date of message
         * 
         * @return {Date} The date of the message
         * @type Date
         */
        getDate : function() {
            if (!this.isDummy()) {
                return this.getMessage().getDate();
            }

            if (this._hasChild()) {
                return this._getChild().getDate();
            }

            // we are dummy
            // we have NO child
            // this shouldn't happen
            return null;
        },

        /**
         * Get depth of message in tree
         * 
         * @return {Number} The generational depth of the message
         * @type Number
         */
        getDepth : function() {
            if (this.hasParent()) {
                if (this.getParent().isRoot()) {
                    return 0;
                } else {
                    return 1 + this.getParent().getDepth();
                }
            } else {
                return 0;
            }
        },

        /**
         * Get last sibling in list
         * 
         * @return {ThreadVis.Container} The last sibling
         * @type ThreadVis.Container
         */
        _getLast : function() {
            var current = this;
            while (current._hasNext()) {
                current = current._getNext();
            }
            return current;
        },

        /**
         * Get next sibling in list
         * 
         * @return {ThreadVis.Container} The next container in the sibling list
         * @type ThreadVis.Container
         */
        _getNext : function() {
            return this.next;
        },

        /**
         * Get message of this container
         * 
         * @return {ThreadVis.Message} The message
         * @type ThreadVis.Message
         */
        getMessage : function() {
            return this.message;
        },

        /**
         * Get parent of this container
         * 
         * @return {ThreadVis.Container} The parent of the message
         * @type ThreadVis.Container
         */
        getParent : function() {
            return this.parent;
        },

        /**
         * Get previous sibling in list
         * 
         * @return {ThreadVis.Container} The previous sibling in the list
         * @type ThreadVis.Container
         */
        _getPrevious : function() {
            return this.previous;
        },

        /**
         * Get topmost container that is not the root container
         * 
         * @return {ThreadVis.Container} The topmost container of the thread
         * @type ThreadVis.Container
         */
        getTopContainer : function() {
            if (this.hasParent()) {
                if (!this.getParent().isRoot()) {
                    return this.getParent().getTopContainer();
                } else {
                    return this;
                }
            }
            return this;
        },

        /**
         * See if this container has at least 1 child
         * 
         * @return {Boolean} True if the container has a child container
         * @type Boolean
         */
        _hasChild : function() {
            return (this._getChild() != null);
        },

        /**
         * See if we have a next sibling in list
         * 
         * @return {Boolean} True if the container has a next sibling in the
         *         list
         * @type Boolean
         */
        _hasNext : function() {
            return (this._getNext() != null);
        },

        /**
         * See if this container has a parent
         * 
         * @return {Boolean} True if the container has a parent container
         * @type Boolean
         */
        hasParent : function() {
            return (this.getParent() != null);
        },

        /**
         * See if we have a previous sibling in list
         * 
         * @return {Boolean} True if the container has a previous sibling in the
         *         list
         * @type Boolean
         */
        _hasPrevious : function() {
            return (this._getPrevious() != null);
        },

        /**
         * See if this container contains a message
         * 
         * @return {Boolean} True if the container is a dummy container (i.e.
         *         contains no message)
         * @type Boolean
         */
        isDummy : function() {
            return (this.getMessage() == null);
        },

        /**
         * Return if this container is the top most container
         * 
         * @return {Boolean} True if this container is the root container
         * @type Boolean
         */
        isRoot : function() {
            return this.root;
        },

        /**
         * Remove a child from the list
         * 
         * @param {ThreadVis.Container}
         *            child The child container to remove
         */
        removeChild : function(child) {
            // check if child is in fact our child
            if (child.getParent() != this) {
                return;
            }

            // if child is the first in list, we can remove it
            // by setting the next child in list as first
            if (this._getChild() == child) {
                this._setChild(child._getNext());
                if (child._hasNext()) {
                    child._getNext()._removePrevious();
                }
                child._removeParent();
                child._removePrevious();
                child._removeNext();
            }
            // otherwise we have to look it up in child list
            // and do some pointer juggling
            else {
                if (child._hasPrevious()) {
                    child._getPrevious()._setNext(child._getNext());
                }
                if (child._hasNext()) {
                    child._getNext()._setPrevious(child._getPrevious());
                }
                child._removeParent();
                child._removePrevious();
                child._removeNext();
            }
        },

        /**
         * Unlink next sibling in list
         */
        _removeNext : function() {
            this._setNext(null);
        },

        /**
         * Unlink parent
         */
        _removeParent : function() {
            this._setParent(null);
        },

        /**
         * Unlink previous sibling in list
         */
        _removePrevious : function() {
            this._setPrevious(null);
        },

        /**
         * Set first child in list
         * 
         * @param {ThreadVis.Container}
         *            child The child to set
         */
        _setChild : function(child) {
            this.child = child;
        },

        /**
         * Set next sibling in list
         * 
         * @param {ThreadVis.Container}
         *            next The container to set
         */
        _setNext : function(next) {
            this.next = next;
        },

        /**
         * Set message of this container
         * 
         * @param {ThreadVis.Message}
         *            message The message to set
         */
        setMessage : function(message) {
            this.message = message;
        },

        /**
         * Set parent of this container
         * 
         * @param {ThreadVis.Container}
         *            parent The parent container
         */
        _setParent : function(parent) {
            this.parent = parent;
        },

        /**
         * Set parent for all containers in list
         * 
         * @param {ThreadVis.Container}
         *            sibling The first sibling in the list
         * @param {ThreadVis.Container}
         *            parent The parent to set
         */
        _setParentForContainer : function(sibling, parent) {
            for (var container = sibling; container != null;
                    container = container._getNext()) {
                container._setParent(parent);
            }
        },

        /**
         * Set previous sibling in list
         * 
         * @param {ThreadVis.Container}
         *            prev The previous container
         */
        _setPrevious : function(prev) {
            this.previous = prev;
        },

        /**
         * Output string representation of this container
         * 
         * @param prefix
         *            The prefix
         * @return The string representation
         */
        toString : function(prefix) {
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

            for (var container = this._getChild(); container != null;
                    container = container._getNext()) {
                string += container.toString(prefix + "XXXX");
            }
            return string;
        }
    };

    return ThreadVis;
}(ThreadVis || {}));
