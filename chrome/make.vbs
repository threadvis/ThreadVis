' ========================================================================
' Makefile for extension
' 
' (c) 2007 Alexander C. Hubmann-Haidvogel
' 
' $Id$
' ========================================================================


' ========================================================================
' Create shell object and file system object
' ========================================================================

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' ========================================================================
' Get newest revision
' ========================================================================

Set exec = shell.Exec("svn info -r HEAD ..")
svninfo = exec.StdOut.ReadAll
position = InStr(1, svninfo, "Revision: ", 1)
position = position + 10
positionEnd = Instr(position, svninfo, vbNewLine, 1)
length = positionEnd - position
revision = Mid(svninfo, position, length)

' ========================================================================
' Get newest version
' ========================================================================

Set versionFile = fso.OpenTextFile("..\version")
version = versionFile.readAll
versionFile.Close

' ========================================================================
' Delete old JAR file
' ========================================================================

If fso.fileExists("threadvis.jar") Then
    Set jar = fso.GetFile("threadvis.jar")
    jar.Delete
End If

' ========================================================================
' Update code with version and revision
' ========================================================================

Set settingsDtd = fso.OpenTextFile("locale\de-DE\Settings.dtd")
contentDe = settingsDtd.ReadAll
contentDeNew = Replace(contentDe, "<<build>>", revision)
contentDeNew = Replace(contentDeNew, "<<version>>", version)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\de-DE\Settings.dtd", 2)
settingsDtd.write(contentDeNew)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\en-US\Settings.dtd")
contentEn = settingsDtd.ReadAll
contentEnNew = Replace(contentEn, "<<build>>", revision)
contentEnNew = Replace(contentEnNew, "<<version>>", version)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\en-US\Settings.dtd", 2)
settingsDtd.write(contentEnNew)
settingsDtd.close

Set logger = fso.OpenTextFile("content\Logger.js")
loggerText = logger.ReadAll
loggerTextNew = Replace(loggerText, "<<build>>", revision)
loggerTextNew = Replace(loggerTextNew, "<<version>>", version)
logger.Close

Set logger = fso.OpenTextFile("content\Logger.js", 2)
logger.write(loggerTextNew)
logger.close

' ========================================================================
' Create JAR file
' ========================================================================

shell.Exec("c:\Programme\7-Zip\7z a -mx0 -tzip threadvis.jar @make.list")
WScript.Sleep 2000

' ========================================================================
' Reset source
' ========================================================================

Set settingsDtd = fso.OpenTextFile("locale\de-DE\Settings.dtd", 2)
settingsDtd.Write(contentDe)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\en-US\Settings.dtd", 2)
settingsDtd.write(contentEn)
settingsDtd.Close

Set logger = fso.OpenTextFile("content\Logger.js", 2)
logger.write(loggerText)
logger.Close

' ========================================================================
' Copy JAR file
' ========================================================================

Set jar = fso.GetFile("threadvis.jar")
jar.copy("c:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Thunderbird\Profiles\u0f36pb7.default\extensions\{A23E4120-431F-4753-AE53-5D028C42CFDC}\chrome\")
jar.copy("C:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Mozilla\Profiles\default\6sp0b816.slt\chrome\")

MsgBox "Build " + revision + " successful."
