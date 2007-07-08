' ========================================================================
' Makefile for extension
' 
' (c) 2007 Alexander C. Hubmann-Haidvogel
' 
' $Id$
' ========================================================================


' ========================================================================
' Create shell object
' ========================================================================

Set shell = CreateObject("WScript.Shell")

' ========================================================================
' Get newest revision
' ========================================================================

Set exec = shell.Exec("svn info -r HEAD ..")
svninfo = exec.StdOut.ReadAll
position = InStr(1, svninfo, "Revision: ", 1)
position = position + 10
positionEnd = Instr(position, svninfo, vbNewLine, 1)
length = positionEnd - position
version = Mid(svninfo, position, length)

' ========================================================================
' Delete old JAR file
' ========================================================================

Set fso = CreateObject("Scripting.FileSystemObject")
If fso.fileExists("threadvis.jar") Then
    Set jar = fso.GetFile("threadvis.jar")
    jar.Delete
End If

' ========================================================================
' Update about dialog with revision information
' ========================================================================

Set settingsDtd = fso.OpenTextFile("locale\de-DE\Settings.dtd")
contentDe = settingsDtd.ReadAll
contentDeNew = Replace(contentDe, "<<build>>", version)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\de-DE\Settings.dtd", 2)
settingsDtd.write(contentDeNew)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\en-US\Settings.dtd")
contentEn = settingsDtd.ReadAll
contentEnNew = Replace(contentEn, "<<build>>", version)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\de-DE\Settings.dtd", 2)
settingsDtd.write(contentEnNew)
settingsDtd.close

WScript.Sleep 1000

' ========================================================================
' Create JAR file
' ========================================================================

shell.Run "c:\Programme\7-Zip\7z a -mx0 -tzip threadvis.jar @make.list"

WScript.Sleep 1000

' ========================================================================
' Reset about dialog
' ========================================================================

Set settingsDtd = fso.OpenTextFile("locale\de-DE\Settings.dtd", 2)
settingsDtd.Write(contentDe)
settingsDtd.Close

Set settingsDtd = fso.OpenTextFile("locale\en-US\Settings.dtd", 2)
settingsDtd.write(contentEn)
settingsDtd.Close

' ========================================================================
' Copy JAR file
' ========================================================================

Set jar = fso.GetFile("threadvis.jar")
jar.copy("c:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Thunderbird\Profiles\u0f36pb7.default\extensions\{A23E4120-431F-4753-AE53-5D028C42CFDC}\chrome\")
jar.copy("C:\Dokumente und Einstellungen\sascha\Anwendungsdaten\Mozilla\Profiles\default\6sp0b816.slt\chrome\")

MsgBox "Build successful"
