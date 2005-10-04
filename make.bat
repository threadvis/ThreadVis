@rem ========================================================================
@rem Makefile for zipping whole XPI
@rem
@rem (c) 2005 Alexander C. Hubmann
@rem
@rem $Id$
@rem ========================================================================

@echo ======================================================================
@echo Deleting XPI file
@echo ======================================================================

@del ThreadArcsJS.xpi

@echo ======================================================================
@echo Creating XPI file
@echo ======================================================================

@c:\Programme\7-Zip\7z a -tzip ThreadArcsJS.xpi install.js install.rdf chrome.manifest chrome\threadarcsjs.jar defaults\preferences\ThreadArcsJSDefault.js

@echo ======================================================================
@echo Done creating XPI file
@echo ======================================================================
@pause