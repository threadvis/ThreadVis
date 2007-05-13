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

@del threadvis.jar

@echo ======================================================================
@echo Creating chrome JAR file ...
@echo ======================================================================

@c:\Programme\7-Zip\7z a -mx0 -tzip threadvis.jar @make.list

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

@rem @copy threadvis.jar "c:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Thunderbird\Profiles\u0f36pb7.default\extensions\{A23E4120-431F-4753-AE53-5D028C42CFDC}\chrome\"
@rem @copy threadvis.jar "C:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Mozilla\Profiles\default\6rdqou0o.slt\chrome"
@rem @pause