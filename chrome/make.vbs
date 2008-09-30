' ========================================================================
' Makefile for extension
' 
' Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
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

Set exec = shell.Exec("svn status ..")
svnstatus = exec.StdOut.ReadAll
position = InStr(1, svnstatus, "M     ", 1)
If position > 0 Then
    revision = revision + ".dev"
End If

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

' DE Settings.dtd
Set file = fso.OpenTextFile("locale\de-DE\Settings.dtd")
settingsDe = file.ReadAll
newContent = Replace(settingsDe, "<<build>>", revision)
newContent = Replace(newContent, "<<version>>", version)
file.Close

Set file = fso.OpenTextFile("locale\de-DE\Settings.dtd", 2)
file.write(newContent)
file.Close

' DE ThreadVis.dtd
Set file = fso.OpenTextFile("locale\de-DE\ThreadVis.dtd")
threadvisDe = file.ReadAll
newContent = Replace(threadvisDe, "<<build>>", revision)
newContent = Replace(newContent, "<<version>>", version)
file.Close

Set file = fso.OpenTextFile("locale\de-DE\ThreadVis.dtd", 2)
file.write(newContent)
file.Close

' DE ThreadVisAbout.dtd
Set file = fso.OpenTextFile("locale\de-DE\ThreadVisAbout.dtd")
aboutDe = file.ReadAll
newContent = Replace(aboutDe, "<<build>>", revision)
newContent = Replace(newContent, "<<version>>", version)
file.Close

Set file = fso.OpenTextFile("locale\de-DE\ThreadVisAbout.dtd", 2)
file.write(newContent)
file.Close

' EN Settings.dtd
Set file = fso.OpenTextFile("locale\en-US\Settings.dtd")
settingsEn = file.ReadAll
newContent = Replace(settingsEn, "<<build>>", revision)
newContent = Replace(newContent, "<<version>>", version)
file.Close

Set file = fso.OpenTextFile("locale\en-US\Settings.dtd", 2)
file.write(newContent)
file.close

' EN ThreadVis.dtd
Set file = fso.OpenTextFile("locale\en-US\ThreadVis.dtd")
threadvisEn = file.ReadAll
newContent = Replace(threadvisEn, "<<build>>", revision)
newContent = Replace(newContent, "<<version>>", version)
file.Close

Set file = fso.OpenTextFile("locale\en-US\ThreadVis.dtd", 2)
file.write(newContent)
file.Close

' EN ThreadVisAbout.dtd
Set file = fso.OpenTextFile("locale\en-US\ThreadVisAbout.dtd")
aboutEn = file.ReadAll
newContent = Replace(aboutEn, "<<build>>", revision)
newContent = Replace(newContent, "<<version>>", version)
file.Close

Set file = fso.OpenTextFile("locale\en-US\ThreadVisAbout.dtd", 2)
file.write(newContent)
file.Close

' logger
Set file = fso.OpenTextFile("content\Logger.js")
loggerText = file.ReadAll
newContent = Replace(loggerText, "<<build>>", revision)
newContent = Replace(newContent, "<<version>>", version)
file.Close

Set file = fso.OpenTextFile("content\Logger.js", 2)
file.write(newContent)
file.close

WScript.Sleep 2000

' ========================================================================
' Create JAR file
' ========================================================================

shell.Exec("c:\Programme\7-Zip\7z a -mx0 -tzip threadvis.jar @make.list")
WScript.Sleep 2000

' ========================================================================
' Reset source
' ========================================================================

' DE Settings.dtd
Set file = fso.OpenTextFile("locale\de-DE\Settings.dtd", 2)
file.Write(settingsDe)
file.Close

' DE ThreadVis.dtd
Set file = fso.OpenTextFile("locale\de-DE\ThreadVis.dtd", 2)
file.Write(threadvisDe)
file.Close

' DE ThreadVisAbout.dtd
Set file = fso.OpenTextFile("locale\de-DE\ThreadVisAbout.dtd", 2)
file.Write(aboutDe)
file.Close

' EN Settings.dtd
Set file = fso.OpenTextFile("locale\en-US\Settings.dtd", 2)
file.write(settingsEn)
file.Close

' EN ThreadVis.dtd
Set file = fso.OpenTextFile("locale\en-US\ThreadVis.dtd", 2)
file.write(threadvisEn)
file.Close

' EN ThreadVisAbout.dtd
Set file = fso.OpenTextFile("locale\en-US\ThreadVisAbout.dtd", 2)
file.Write(aboutEn)
file.Close

' logger
Set file = fso.OpenTextFile("content\Logger.js", 2)
file.write(loggerText)
file.Close

' ========================================================================
' Copy JAR file
' ========================================================================

Set jar = fso.GetFile("threadvis.jar")
jar.copy("c:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Thunderbird\Profiles\u0f36pb7.default\extensions\{A23E4120-431F-4753-AE53-5D028C42CFDC}\chrome\")
'jar.copy("C:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Mozilla\Profiles\default\6sp0b816.slt\chrome\")
'jar.copy("C:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Mozilla\SeaMonkey\Profiles\w3sdwezu.default\extensions\{A23E4120-431F-4753-AE53-5D028C42CFDC}\chrome\")

MsgBox "Build " + revision + " successful."
