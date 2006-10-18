/** ****************************************************************************
 * Legend.js
 *
 * (c) 2006 Alexander C. Hubmann
 *
 * JavaScript file to visualise legend
 *
 * Version: $Id$
 ******************************************************************************/



function clearLegend()
{
    var legendbox = document.getElementById("LegendContent");
    while(legendbox.firstChild != null)
        legendbox.removeChild(legendbox.firstChild);

    //window.sizeToContent();
}



function displayLegend()
{
    clearLegend();

    var legendbox = document.getElementById("LegendContent");
    var legend = opener.THREADVIS.getLegend();
    legendbox.appendChild(legend);
    window.sizeToContent();
}