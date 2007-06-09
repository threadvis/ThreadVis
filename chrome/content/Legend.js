/** ****************************************************************************
 * Legend.js
 *
 * (c) 2006-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to visualise legend
 *
 * $Id$
 ******************************************************************************/



function clearLegend() {
    var legendBox = document.getElementById("LegendContent");
    while(legendBox.firstChild != null) {
        legendBox.removeChild(legendBox.firstChild);
    }
}



function displayLegend() {
    clearLegend();

    var legendBox = document.getElementById("LegendContent");
    var legend = opener.THREADVIS.getLegend();
    legendBox.appendChild(legend);
    window.sizeToContent();
}
