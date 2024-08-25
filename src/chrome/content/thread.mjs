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
 * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023, 2024 Alexander C. Hubmann-Haidvogel
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
 * Thread utilities
 **********************************************************************************************************************/

import { PositionedThread } from "./positionedthread.mjs";

export class Thread {

    /**
     * List of containers
     */
    #containers = [];

    #selectedContainer;

    #authors = {};

    constructor(containers) {
        Object.seal(this);
        this.#containers = containers
            // filter all containers that neither have a parent nor children nor a message.
            // this would be caused by references pointing to nowhere
            .filter((container) => container.parent || container.children.length > 0 || container.message);
        this.#populateAuthors();
    }

    select(messageId) {
        this.#selectedContainer = this.#containers
            .find((container) => container.id === messageId);
    }

    contains(messageId) {
        return this.#containers.some((container) => container.id === messageId);
    }

    get selected() {
        return this.#selectedContainer;
    }

    get size() {
        return this.#containers.length;
    }

    get root() {
        return this.#containers[0].root;
    }

    get authors() {
        return this.#authors;
    }

    getPositioned(width) {
        return new PositionedThread(this.#containers, this.#selectedContainer, this.#authors, width);
    }

    #populateAuthors() {
        this.#authors = this.#containers
            .filter((container) => container.message)
            .reduce((authors, container) => {
                if (authors[container.message.fromEmail]) {
                    authors[container.message.fromEmail].count++;
                } else {
                    authors[container.message.fromEmail] = {
                        "name" : container.message.from,
                        "count" : 1
                    };
                }
                return authors;
            }, {});
    }
}
