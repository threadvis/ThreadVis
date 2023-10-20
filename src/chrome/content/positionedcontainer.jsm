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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023 Alexander C. Hubmann-Haidvogel
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
 * Wraps a {Container} to make it positioned
 **********************************************************************************************************************/

const EXPORTED_SYMBOLS = [ "PositionedContainer" ];

class PositionedContainer {

    /**
     * The wrapped {Container}
     */
    #container;

    /**
     * Link to parent positioned container
     */
    #parent;

    /**
     * True if this container is currently selected (focused)
     */
    #selected = false;

    /**
     * True if this container is in the parent/child hierarchy of the selected container
     */
    #inThread = false;

    /**
     * Height of incoming arc into this positioned container
     */
    #arcHeight = 1;

    /**
     * Time difference towards _next_ positioned container
     */
    #timeDifference = 0;

    /**
     * Time scaling factor
     */
    #timeScaling =  1;

    /**
     * x position
     */
    #x = 0;

    /**
     * Author
     */
    #author;

    /**
     * Constructor
     * 
     * @constructor
     * @param {Container} container - the container to wrap
     * @param {Number} index - position of the container
     * @param {Object} author - the author of the message in the container
     * @param {Boolean} selected - true if this container is selected
     * @param {Boolean} inThread - true if this container is in the parent/child chain of the selected container
     * @return A new positioned container
     */
    constructor(container, author, selected, inThread) {
        Object.seal(this);
        this.#container = container;
        this.#author = author;
        this.#selected = selected;
        this.#inThread = inThread;
    }

    get id() {
        return this.#container.id;
    }

    get container() {
        return this.#container;
    }

    get parent() {
        return this.#parent;
    }

    set parent(parent) {
        this.#parent = parent;
    }

    get date() {
        return this.#container.date;
    }

    get timeDifference() {
        return this.#timeDifference;
    }

    set timeDifference(timeDifference) {
        this.#timeDifference = timeDifference;
    }

    get timeScaling() {
        return this.#timeScaling;
    }

    set timeScaling(timeScaling) {
        this.#timeScaling = timeScaling;
    }

    get x() {
        return this.#x;
    }

    set x(x) {
        this.#x = x;
    }

    get author() {
        return this.#author;
    }

    get message() {
        return this.#container.message;
    }

    get isSent() {
        return this.#container.message?.isSent === true;
    }

    get inThread() {
        return this.#inThread;
    }

    get arcHeight() {
        return this.#arcHeight;
    }

    set arcHeight(arcHeight) {
        this.#arcHeight = arcHeight;
    }

    get selected() {
        return this.#selected;
    }

    get depth() {
        return this.#container.depth;
    }
}
