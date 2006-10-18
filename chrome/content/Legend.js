/** ****************************************************************************
 * Legend.js
 *
 * (c) 2006 Alexander C. Hubmann
 *
 * JavaScript file to visualise legend
 *
 * Version: $Id$
 ******************************************************************************/



function displayLegend()
{
    var legendbox = document.getElementById("LegendContent");

    while(legendbox.firstChild != null)
        legendbox.removeChild(legendbox.firstChild);

    var legend = opener.THREADVIS.getLegend();
    legendbox.appendChild(legend);
    window.sizeToContent();
}