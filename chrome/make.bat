@rem ========================================================================
@rem Makefile for zipping XUL application
@rem
@rem (c) 2005 Alexander C. Hubmann
@rem
@rem $Id$
@rem ========================================================================

@echo ======================================================================
@echo Creating chrome JAR file ...
@echo ======================================================================

@c:\Programme\7-Zip\7z a -tzip threadarcsjs.jar content\About.css content\About.js content\About.xul content\Container.js content\contents.rdf content\Message.js content\References.js content\ThreadArcs.js content\ThreadArcs.xul content\Threader.js content\Visualisation.js content\threadarcs_arc_blue_bottom_left_1.png content\threadarcs_arc_blue_bottom_middle_1.png content\threadarcs_arc_blue_bottom_right_1.png content\threadarcs_arc_blue_top_left_1.png content\threadarcs_arc_blue_top_middle_1.png content\threadarcs_arc_blue_top_right_1.png content\threadarcs_arc_grey_bottom_left_1.png content\threadarcs_arc_grey_bottom_middle_1.png content\threadarcs_arc_grey_bottom_right_1.png content\threadarcs_arc_grey_top_left_1.png content\threadarcs_arc_grey_top_middle_1.png content\threadarcs_arc_grey_top_right_1.png content\threadarcs_dot_blue_full.png content\threadarcs_dot_blue_half.png content\threadarcs_dot_grey_full.png content\threadarcs_dot_grey_half.png content\threadarcs_dot_red_full.png content\threadarcs_dot_red_half.png content\threadarcs_loading.gif


@echo ======================================================================
@echo Done creating chrome JAR file
@echo ======================================================================

@pause