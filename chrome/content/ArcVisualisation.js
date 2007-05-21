/** ****************************************************************************
 * ArcVisualisation.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to visualise message in threadvis
 *
 * $Id$
 ******************************************************************************/



/** ****************************************************************************
 * Constructor for visualisation class
 ******************************************************************************/
function ArcVisualisation(stack, dotSize, resize, arcMinHeight, arcDifference, 
    arcRadius, arcWidth, colour, vPosition, height, left, right, top, opacity) {
    
    /**
     * XUL stack on which to draw
     */
    this.stack = stack;
    
    /**
     * size of the dot representing a message in px
     */
    this.dotSize = dotSize;
    
    /**
     * resize multiplicator
     */
    this.resize = resize;
    
    /**
     * the minimum arc height in px
     */
    this.arcMinHeight = arcMinHeight;
    
    /**
     * the (height) difference between two arcs in px
     */
    this.arcDifference = arcDifference;
    
    /**
     * the corner radius for an arc in px
     */
    this.arcRadius = arcRadius;
    
    /**
     * width of an arc in px
     */
    this.arcWidth = arcWidth;
    
    /**
     * colour of the arc
     */
    this.colour = colour;
    
    /**
     * vertical position of arc ("top" or "bottom")
     */
    this.vPosition = vPosition;
    
    /**
     * height of arc (counting from 0)
     * multiplied by arc_difference_ to get height in px
     */
    this.height = height;
    
    /**
     * left edge of arc in px
     */
    this.left = left;
    
    /**
     * right edge of arc in pc
     */
    this.right = right;
    
    /**
     * top edge of arc in px
     */
    this.top = top;
    
    /**
     * opacity of item
     */
    this.opacity = opacity;
    
    if (THREADVIS.logger.isDebug(THREADVIS.logger.LEVEL_VIS)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_VIS, 
            "ArcVisualisation()", {"action" : "start", "colour" : this.colour,
            "vposition" : this.vPosition, "height" : this.height,
            "left" : this.left, "right" : this.right});
    }
    
    this.drawArc();
}



/** ****************************************************************************
 * Draw arc
 ******************************************************************************/
ArcVisualisation.prototype.drawArc = function() {
    this.arc = document.createElementNS(THREADVIS.XUL_NAMESPACE, "box");
    
    this.visualise();
    this.stack.appendChild(this.arc);
}



/** ****************************************************************************
 * Re-Draw arc
 ******************************************************************************/
ArcVisualisation.prototype.redrawArc = function(resize, left, right, top, colour,
    opacity) {
    this.resize = resize;
    this.left = left;
    this.top = top;
    this.right = right;
    this.colour = colour;
    this.opacity = opacity;
    
    this.visualise();
}



/** ****************************************************************************
 * Visualise arc
 ******************************************************************************/
ArcVisualisation.prototype.visualise = function() {
    var arcTop = 0;
    var fillTop = 0;
    if (this.vPosition == "top") {
        arcTop = (this.top - ((this.dotSize / 2) + this.arcMinHeight + 
            (this.arcDifference * this.height))) * this.resize;
    } else {
        arcTop = (this.top + (this.dotSize / 2)) * this.resize;
    }
    
    var styleTop = (arcTop) + "px";
    var styleLeft = ((this.left - (this.arcWidth / 2)) * this.resize) + "px";
    var styleHeight = ((this.arcMinHeight + this.arcDifference * this.height) * this.resize) + "px";
    var styleWidth = ((this.right - this.left + this.arcWidth) * this.resize)+ "px";
    var styleBackground = this.colour;
    var styleOpacity = this.opacity;
    
    if (THREADVIS.logger.isDebug(THREADVIS.logger.LEVEL_VIS)) {
        THREADVIS.logger.logDebug(THREADVIS.logger.LEVEL_VIS, 
            "Visualisation.drawArc()", {"action" : "draw arc",
            "top" : styleTop, "left" : styleLeft, "height" : styleHeight,
            "width" : styleWidth, "background" : styleBackground});
    }
    
    this.arc.style.position = "relative";
    this.arc.style.top = styleTop;
    this.arc.style.left = styleLeft;
    this.arc.style.height = styleHeight;
    this.arc.style.width = styleWidth;
    this.arc.style.verticalAlign = "top";
    this.arc.style.opacity = styleOpacity;
    if (this.vPosition == "top") {
        this.arc.style.MozBorderRadiusTopleft = this.arcRadius + "px";
        this.arc.style.MozBorderRadiusTopright = this.arcRadius + "px"
        this.arc.style.borderTop = (this.arcWidth * this.resize) +  "px solid " + styleBackground;
        this.arc.style.borderLeft = (this.arcWidth * this.resize) +  "px solid " + styleBackground;
        this.arc.style.borderRight = (this.arcWidth * this.resize) + "px solid " + styleBackground;
    } else {
        this.arc.style.MozBorderRadiusBottomleft = this.arcRadius + "px";
        this.arc.style.MozBorderRadiusBottomright = this.arcRadius + "px";
        this.arc.style.borderBottom = (this.arcWidth * this.resize) + "px solid " + styleBackground;
        this.arc.style.borderLeft = (this.arcWidth * this.resize) + "px solid " + styleBackground;
        this.arc.style.borderRight = (this.arcWidth * this.resize) + "px solid " + styleBackground;
    }
}
