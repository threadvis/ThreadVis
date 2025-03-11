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
 * Copyright (C) 2007, 2008, 2009,
 *               2010, 2011, 2013, 2018, 2019,
 *               2020, 2021, 2022, 2023, 2024, 2025 Alexander C. Hubmann-Haidvogel
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

export class Container {

    /**
     * Unique id of the container
     */
    #id;

    /**
     * Store message in this container
     * 
     * @type {Message}
     */
    #message;

    /**
     * Parent of this container
     * 
     * @type {Container}
     */
    #parent;

    /**
     * Children of this container
     * 
     * @type {Array<Container>}
     */
    #children = [];

    /**
     * Constructor
     * 
     * @constructor
     * @return A new container
     */
    constructor(id, message) {
        Object.seal(this);
        this.#id = id;
        this.#message = message;
    }

    /**
     * Get unique id of this container
     */
    get id() {
        return this.#id;
    }

    /**
     * Add child to this container.
     * Removes child from old parent.
     * Inserts child and all its children.
     * 
     * @param {Container} child - The child to add
     */
    addChild(child) {
        // check if child is already our child. if so, do nothing
        if (child.#parent === this) {
            return;
        }

        // check to see if this container is a child of child.
        // this should never happen, because we would create a loop. that's why we don't allow it
        if (this.findParent(child)) {
            return;
        }

        // remove from previous parent
        child.#parent?.removeChild(child);
        // set new parent
        child.#parent = this;
        this.#children.push(child);
    }

    /**
     * See if this container or any of its parents contains a specific container
     * 
     * @param {Container} target - The container to find
     * @returns {Boolean} - True if the container is contained in the parent list, false if not
     */
    findParent(target) {
        const container = this.#parent;

        if (!container) {
            return false;
        }

        if (container === target) {
            return true;
        }

        return container.findParent(target);
    }

    /**
     * Get all children of this container as a flat array
     * 
     * @return {Array<Container>} - All children of the current container, recursively
     */
    get children() {
        return this.#children
            .map((container) => [container, container.children])
            .flat(Infinity);
    }

    /**
     * Get recursive container count
     * 
     * @return {Number} - The number of all children, counted recursively
     */
    get count() {
        return this.#children.reduce((count, container) => count += container.count, 1);
    }

    /**
     * Get date of message
     * 
     * @ {Date} - The date of the message
     */
    get date() {
        if (this.message) {
            return this.message.date;
        }

        if (this.#children.length > 0) {
            return this.#children[0].date;
        }

        // we are dummy, we have NO child: this shouldn't happen
        return new Date();
    }

    /**
     * Get depth of message in tree
     * 
     * @return {Number} - The generational depth of the message
     */
    get depth() {
        if (this.#parent) {
            return 1 + this.#parent.depth;
        } else {
            return 0;
        }
    }

    /**
     * Get message of this container
     * 
     * @return {Message} - The message
     */
    get message() {
        return this.#message;
    }

    /**
     * Set message of this container
     *
     * @param {GlodaMessage} message
     */
    set message(message) {
        this.#message = message;
    }

    /**
     * Get parent of this container
     * 
     * @return {Container} - The parent of the message
     */
    get parent() {
        return this.#parent;
    }

    /**
     * Get topmost container
     * 
     * @return {Container} - The topmost container of the thread
     */
    get root() {
        if (this.#parent) {
            return this.#parent.root;
        }
        return this;
    }

    /**
     * Remove a child from the list
     * 
     * @param {ThreadVis.Container} child - The child container to remove
     */
    removeChild(child) {
        // check if child is in fact our child
        if (child.parent !== this) {
            return;
        }

        this.#children = this.#children.filter((container) => container !== child);
        child.#parent = undefined;
    }
}
