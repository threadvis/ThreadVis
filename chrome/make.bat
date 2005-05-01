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

@c:\Programme\7-Zip\7z a -tzip threadarcsjs.jar content\Container.js content\contents.rdf content\Logger.js content\Message.js content\MozillaMenuOverlay.xul content\References.js content\Settings.js content\Settings.xul content\ThreadArcs.js content\ThreadArcs.xul content\Threader.js content\Visualisation.js content\threadarcs_arc_blue_bottom_left.png content\threadarcs_arc_blue_bottom_middle.png content\threadarcs_arc_blue_bottom_right.png  content\threadarcs_arc_blue_left_middle.png content\threadarcs_arc_blue_right_middle.png content\threadarcs_arc_blue_top_left.png content\threadarcs_arc_blue_top_middle.png content\threadarcs_arc_blue_top_right.png content\threadarcs_arc_grey_bottom_left.png content\threadarcs_arc_grey_bottom_middle.png content\threadarcs_arc_grey_bottom_right.png content\threadarcs_arc_grey_left_middle.png content\threadarcs_arc_grey_right_middle.png content\threadarcs_arc_grey_top_left.png content\threadarcs_arc_grey_top_middle.png content\threadarcs_arc_grey_top_right.png content\threadarcs_dot_blue_full.png content\threadarcs_dot_blue_half.png content\threadarcs_dot_grey_dummy.png content\threadarcs_dot_grey_full.png content\threadarcs_dot_grey_half.png content\threadarcs_dot_red_full.png content\threadarcs_dot_red_half.png content\threadarcs_loading.gif

@echo ======================================================================
@echo Done creating chrome JAR file
@echo ======================================================================

@echo ======================================================================
@echo Waiting to copy file
@echo ======================================================================
@pause

@echo ======================================================================
@echo Copying file
@echo ======================================================================

@copy threadarcsjs.jar "c:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Thunderbird\Profiles\n0t5glfc.default\extensions\{A23E4120-431F-4753-AE53-5D028C42CFDC}\chrome\"
@copy threadarcsjs.jar "C:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Mozilla\Profiles\default\6rdqou0o.slt\chrome"
@pause