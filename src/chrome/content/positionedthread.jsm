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
 * Wrap {Thread} to add chronological order and positions
 **********************************************************************************************************************/

const EXPORTED_SYMBOLS = [ "PositionedThread" ];

const { PositionedContainer } = ChromeUtils.import("chrome://threadvis/content/positionedcontainer.jsm");
const { Preferences } = ChromeUtils.import("chrome://threadvis/content/utils/preferences.jsm");

class PositionedThread {

    /**
     * List of positioned containers
     */
    #containers = [];

    /**
     * Available width to the visualisation
     */
    #width = 0;

    /**
     * Stacked arcs height (top)
     */
    #topHeight = 0;

    /**
     * Stacked arcs height (bottom)
     */
    #bottomHeight = 0;

    /**
     * Calculated minimal time difference between two messages
     */
    #minimalTimeDifference = Number.MAX_VALUE;

    constructor(containers, selectedContainer, authors, width) {
        Object.seal(this);
        this.#containers = containers
            .toSorted(PositionedThread.#sortFunction)
            .map((container) => {
                const author = authors[container.message?.fromEmail];
                const isSelected = container === selectedContainer;
                const inThread = container.findParent(selectedContainer) || selectedContainer.findParent(container);
                return new PositionedContainer(container, author, isSelected, inThread);
            });

        // now that we have all positioned containers, link parents
        this.#containers = this.#containers.map((item, _index, array) => {
            if (item.container.parent) {
                item.parent = array.find((i) => i.id === item.container.parent.id);
            }
            return item;
        });

        this.#width = width;

        this.#calculateSize();
        this.#timeScaling();
        this.#position();
    }

    get containers() {
        return this.#containers;
    }

    get selected() {
        return this.#containers.find((container) => container.selected);
    }

    get topHeight() {
        return this.#topHeight;
    }

    get bottomHeight() {
        return this.#bottomHeight;
    }

    get maxX() {
        return this.#containers.reduce((maxX, container) => Math.max(maxX, container.x), 0);
    }

    /**
     * Calculate size
     */
    #calculateSize() {
        this.#calculateArcHeights();

        this.#topHeight = 0;
        this.#bottomHeight = 0;
        this.#minimalTimeDifference = Number.MAX_VALUE;
        this.#containers.forEach((container, index, array) => {
            const parent = container.parent;
            if (parent) {
                // also keep track of the current maximal stacked arc height,
                // so that we can resize the whole extension
                if (parent.depth % 2 === 0 && container.arcHeight > this.#topHeight) {
                    this.#topHeight = container.arcHeight;
                }

                if (parent.depth %2 !== 0 && container.arcHeight > this.#bottomHeight) {
                    this.#bottomHeight = container.arcHeight;
                }
            }

            // also keep track of the time difference between two adjacent messages
            if (index < array.length - 1) {
                const timeDifference = array[index + 1].date.getTime() - container.date.getTime();
                // timeDifference stores the time difference to the _next_ message
                container.timeDifference = timeDifference;

                // since we could have dummy containers that have the same time as
                // the next message, or malformed threads where the answer is _before_ the parent,
                // skip any time difference <= 0
                if (timeDifference < this.#minimalTimeDifference && timeDifference > 0) {
                    this.#minimalTimeDifference = timeDifference;
                }
            }
        });
    }

    /**
    * Calculate heights for all arcs.
    */
    #calculateArcHeights() {
        // init heights
        const currentArcHeightIncoming = {};
        const currentArcHeightOutgoing = {};

        this.#containers.forEach((container, index) => {
            currentArcHeightIncoming[container.id] = [];
            currentArcHeightOutgoing[container.id] = [];

            const parent = container.parent;
            if (parent) {
                let parentIndex = this.#containers.findIndex((i) => i.container.id === parent.id);

                // find a free arc height between the parent message and this one
                // since we want to draw an arc between this message and its parent,
                // and we do not want any arcs to overlap
                let freeHeight = 1;
                while (
                    this.#containers.slice(parentIndex, index).some((containerBetween) => {
                        if (
                            containerBetween.depth % 2 === parent.depth % 2
                            && currentArcHeightOutgoing[containerBetween.id][freeHeight] === 1
                        ) {
                            return true;
                        }
                        if (
                            containerBetween.depth % 2 !== parent.depth % 2
                            && currentArcHeightIncoming[containerBetween.id][freeHeight] === 1
                        ) {
                            return true;
                        }
                        return false;
                    })
                ) {
                    freeHeight++;
                }
                currentArcHeightOutgoing[parent.id][freeHeight] = 1;
                currentArcHeightIncoming[container.id][freeHeight] = 1;

                container.arcHeight = freeHeight;
            }
        });
    }

    /**
     * If time scaling is enabled, we want to layout the messages so that their
     * horizontal spacing is proportional to the time difference between those
     * two messages
     */
    #timeScaling() {
        if (! Preferences.get(Preferences.TIMESCALING)) {
            return;
        }
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);
        const prefTimescalingMethod = Preferences.get(Preferences.TIMESCALING_METHOD);
        const prefTimescalingMinimalTimeDifference = Preferences.get(Preferences.TIMESCALING_MINTIMEDIFF);

        // we want to scale the messages horizontally according to their time difference
        // therefore we calculate the overall scale factor
        const minimalTimeDifference = Math.max(this.#minimalTimeDifference, prefTimescalingMinimalTimeDifference);

        let totalTimeScale = 0;
        this.#containers.forEach((container) => {
            let xScaling = 1;
            if (container.timeDifference > 0) {
                xScaling = container.timeDifference / minimalTimeDifference;
                // instead of linear scaling, we might use other scaling factor
                if (prefTimescalingMethod === "log") {
                    xScaling = Math.log(xScaling) / Math.log(2) + 1;
                }
                // check if we might encounter a dummy container, see above
                xScaling = Math.max(xScaling, 1);
            }
            totalTimeScale += xScaling;
            container.timeScaling = xScaling;
        });

        // max_count_x tells us how many messages we could display if all are laid out with the minimal horizontal spacing
        // e.g.
        // |---|---|---|
        // width / spacing would lead to 3
        const maxCountX = this.#width / prefSpacing;

        // if the time scaling factor is bigger than what we can display, we have a problem
        // this means, we have to scale the timing factor down
        let scaling = 0.9;
        let iteration = 0;
        while (totalTimeScale > maxCountX && iteration < 10000) {
            iteration++;
            totalTimeScale = 0;
            this.#containers.forEach((container) => {
                let xScaling = container.timeScaling;
                if (container.timeDifferences === 0) {
                    xScaling = 1;
                } else {
                    if (prefTimescalingMethod === "linear") {
                        xScaling = xScaling * scaling;
                    } else if (prefTimescalingMethod === "log") {
                        xScaling = Math.log(container.timeDifference / minimalTimeDifference) / Math.log(2 / Math.pow(scaling, iteration)) + 1;
                    }
                    xScaling = Math.max(xScaling, 1);
                }
                totalTimeScale += xScaling;
                container.timeScaling = xScaling;
            });
            // if the totalTimeScale === containers.length, we reduced every horizontal spacing to its minimum and
            // we can't do anything more
            // this means we have to lay out more messages than we can
            // this is dealt with later in resizing
            if (totalTimeScale === this.#containers.length - 1) {
                break;
            }
        }
    }

    #position() {
        const prefSpacing = Preferences.get(Preferences.VIS_SPACING);
        let x = (prefSpacing / 2);

        this.#containers.forEach((item) => {
            item.x = x;
            // calculate position for next container
            x = x + (item.timeScaling * prefSpacing);
        });
        return x;
    }

    /**
     * Sort function for sorting javascript array
     * Sort by date, but never sort child before parent
     * 
     * @param {ThreadVis.Container} one - The first container
     * @param {ThreadVis.Container} two - The second container
     * @return {Number} - -1 to sort one before two, +1 to sort two before one
    */
    static #sortFunction(one, two) {
        // just to be sure, we never want to sort a child before one of its parents
        // (could happen if time information in mail is wrong, e.g. time of mailclient is off)
        if (two.findParent(one)) {
            return -1;
        }
        if (one.findParent(two)) {
            return 1;
        }

        // sort all others by date
        // if one of the containers is a dummy, date returns the date of its first child.
        // this should be enough to ensure the timeline
        const difference = one.date.getTime() - two.date.getTime();

        if (difference < 0) {
            return -1;
        } else {
            return 1;
        }
    }
}
