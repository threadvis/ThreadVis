/** ****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2006-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to visualise legend
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Clear the legend box
 ******************************************************************************/
function clearLegend() {
    var legendBox = document.getElementById("LegendContent");
    while(legendBox.firstChild != null) {
        legendBox.removeChild(legendBox.firstChild);
    }
}



/** ****************************************************************************
 * Display the legend
 ******************************************************************************/
function displayLegend() {
    clearLegend();

    var legendBox = document.getElementById("LegendContent");
    var legend = opener.THREADVIS.getLegend();
    legendBox.appendChild(legend);
    window.sizeToContent();
}
