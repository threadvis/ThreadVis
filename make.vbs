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

Set exec = shell.Exec("svn info -r HEAD")
svninfo = exec.StdOut.ReadAll
position = InStr(1, svninfo, "Revision: ", 1)
position = position + 10
positionEnd = Instr(position, svninfo, vbNewLine, 1)
length = positionEnd - position
revision = Mid(svninfo, position, length)

' ========================================================================
' Get newest version
' ========================================================================

Set versionFile = fso.OpenTextFile("version")
version = versionFile.readAll
versionFile.Close

' ========================================================================
' Delete old XPI file
' ========================================================================

If fso.fileExists("ThreadVis.xpi") Then
    Set xpi = fso.GetFile("ThreadVis.xpi")
    xpi.Delete
End If

If fso.fileExists("ThreadVis-addons.mozilla.org.xpi") Then
    Set xpi = fso.GetFile("ThreadVis-addons.mozilla.org.xpi")
    xpi.Delete
End If

' ========================================================================
' Update code with version and revision
' ========================================================================

Set installJsFile = fso.OpenTextFile("install.js")
installJs = installJsFile.ReadAll
installJsNew = Replace(installJs, "<<build>>", revision)
installJsNew = Replace(installJsNew, "<<version>>", version)
installJsFile.Close

Set installJsFile = fso.OpenTextFile("install.js", 2)
installJsFile.write(installJsNew)
installJsFile.Close

Set installRdfFile = fso.OpenTextFile("install.rdf")
installRdf = installRdfFile.ReadAll
installRdfNew = Replace(installRdf, "<<build>>", revision)
installRdfNew = Replace(installRdfNew, "<<version>>", version)
installRdfFile.Close

Set installRdfFile = fso.OpenTextFile("install.rdf", 2)
installRdfFile.write(installRdfNew)
installRdfFile.Close

Set updateRdfFile = fso.OpenTextFile("update.rdf")
updateRdf = updateRdfFile.ReadAll
updateRdfNew = Replace(updateRdf, "<<build>>", revision)
updateRdfNew = Replace(updateRdfNew, "<<version>>", version)
updateRdfFile.Close

If fso.fileExists("update." + revision + ".rdf") Then
    Set updateRdfFile = fso.OpenTextFile("update." + revision + ".rdf", 2)
Else
    Set updateRdfFile = fso.CreateTextFile("update." + revision + ".rdf", 2)
End If
updateRdfFile.write(updateRdfNew)
updateRdfFile.Close

WScript.Sleep 1000

' ========================================================================
' Create XPI file
' ========================================================================

shell.Exec("c:\Programme\7-Zip\7z a -tzip ThreadVis.xpi @make.list")

WScript.Sleep 1000

' ========================================================================
' Create XPI file for addons.mozilla.org
' ========================================================================

installRdfNew = Replace(installRdfNew, "<em:updateURL>http://www.student.tugraz.at/ahubmann/threadvis/update.rdf</em:updateURL>", "")

Set installRdfFile = fso.OpenTextFile("install.rdf", 2)
installRdfFile.write(installRdfNew)
installRdfFile.Close

' ========================================================================
' Create XPI file for addons.mozilla.org
' ========================================================================

shell.Exec("c:\Programme\7-Zip\7z a -tzip ThreadVis-addons.mozilla.org.xpi @make.list")

WScript.Sleep 1000

' ========================================================================
' Reset source
' ========================================================================

Set installJsFile = fso.OpenTextFile("install.js", 2)
installJsFile.write(installJs)
installJsFile.Close

Set installRdfFile = fso.OpenTextFile("install.rdf", 2)
installRdfFile.write(installRdf)
installRdfFile.Close

MsgBox "Build " + revision + " successful"
