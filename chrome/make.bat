@rem ========================================================================
@rem Makefile for zipping XUL application
@rem
@rem (c) 2005 Alexander C. Hubmann
@rem
@rem $Id$
@rem ========================================================================

@echo ======================================================================
@echo Deleting chrome JAR file ...
@echo ======================================================================

@del threadarcsjs.jar

@echo ======================================================================
@echo Creating chrome JAR file ...
@echo ======================================================================

@c:\Programme\7-Zip\7z a -tzip threadarcsjs.jar @make.list

@echo ======================================================================
@echo Done creating chrome JAR file
@echo ======================================================================

@echo ======================================================================
@echo Waiting to copy file
@echo ======================================================================
@rem @pause

@echo ======================================================================
@echo Copying file
@echo ======================================================================

@copy threadarcsjs.jar "c:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Thunderbird\Profiles\n0t5glfc.default\extensions\{A23E4120-431F-4753-AE53-5D028C42CFDC}\chrome\"
@copy threadarcsjs.jar "C:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Mozilla\Profiles\default\6rdqou0o.slt\chrome"
@rem @pause