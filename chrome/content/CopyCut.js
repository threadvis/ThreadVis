/* *****************************************************************************
 * CopyCut.js
 *
 * (c) 2005-2007 Alexander C. Hubmann
 * (c) 2007 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to copy and cut messages
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * constructor
 * create new object, create file pointers
 ******************************************************************************/
ThreadVisNS.CopyCut = function() {
    this.EXTENSION_PATH = "extensions";
    this.EXTENSION_GUID = "{A23E4120-431F-4753-AE53-5D028C42CFDC}";
    this.FILENAME = "threadvis.copycut";
    this.DIVIDER = "<<<<<<<<<<>>>>>>>>>>";

    // try to create file
    this.file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsIFile);

    this.file.append(this.EXTENSION_PATH);
    if (! this.file.exists()) {
        this.file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    this.file.append(this.EXTENSION_GUID);
    if (! this.file.exists()) {
        this.file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    this.file.append(this.FILENAME);

    this.ready = false;

    this.cuts = new Array();
    this.copies = new Array();
}



/** ****************************************************************************
 * add a copy
 * format: msgid_child msgid_parent
 * if we are adding a copy for a pair that was previously cut,
 * just remove the cut
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.addCopy = function(msgMsg) {
    var splits = msgMsg.split(" ");
    if (splits[0] != "" && splits[1] != "") {
        if (this.cuts[splits[0]] == splits[1]) {
            delete this.cuts[splits[0]];
        } else {
            this.copies[splits[0]] = splits[1];
        }
    }
}



/** ****************************************************************************
 * add a cut
 * format: msgid_child msgid_parent
 * if we are adding a cut for a pair that was previously copied,
 * just remove the copy
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.addCut= function(msgMsg) {
    var splits = msgMsg.split(" ");
    if (splits[0] != "" && splits[1] != "") {
        if (this.copies[splits[0]] == splits[1]) {
            delete this.copies[splits[0]];
        } else {
            this.cuts[splits[0]] = splits[1];
        }
    }
}



/** ****************************************************************************
 * close the file
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.close = function() {
    // if file is open, close it
    if (this.ready) {
        this.ready = false;
        this.scriptableInputStream.close();
        this.fileInputStream.close();
        this.fileOutputStream.close();
    }
}



/** ****************************************************************************
 * get copy for message
 * (return msg_id of new parent)
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.getCopy = function(msg) {
    return this.copies[msg];
}



/** ****************************************************************************
 * get cut for message
 * (return msg_id of old parent)
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.getCut = function(msg) {
    return this.cuts[msg];
}



/** ****************************************************************************
 * return the file object
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.getFile = function() {
    return this.file;
}



/** ****************************************************************************
 * open the file
 * create streams
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.open = function() {
    this.ready = false;

    if (! this.file.exists()) {
        this.file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
    }

    if (this.file.exists()) {
        this.fileOutputStream = Components
            .classes["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Components.interfaces.nsIFileOutputStream);
        this.fileInputStream = Components
            .classes["@mozilla.org/network/file-input-stream;1"]
            .createInstance(Components.interfaces.nsIFileInputStream);
        var options = 0x2 | 0x8 | 0x10;
        this.fileOutputStream.init(this.file, options, 0, false);
        this.fileInputStream.init(this.file, 1, 0, false);

        this.scriptableInputStream = Components
            .classes["@mozilla.org/scriptableinputstream;1"]
            .createInstance(Components.interfaces.nsIScriptableInputStream);
        this.scriptableInputStream.init(this.fileInputStream);

        this.ready = true;
    }
}



/** ****************************************************************************
 * read copies and cuts from file
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.read = function() {
    if (! this.ready) {
        this.open();
    }

    if (! this.ready) {
        return;
    }

    var fileSize = this.scriptableInputStream.available();
    var fileContents = this.scriptableInputStream.read(fileSize);

    // format of file is one cut or copy per line
    var lines = fileContents.split(/\n/);
    var i = 0;
    for (i; i < lines.length; i++) {
        // we use a simple format to divide the file into copies and cuts
        if (lines[i] == this.DIVIDER) {
            break;
        }
        if (lines[i] != "") {
            this.addCut(lines[i]);
        }
    }
    // just assume that the rest after the divider is all copies
    i++;
    for (i; i < lines.length; i++) {
        if (lines[i] != "") {
            this.addCopy(lines[i]);
        }
    }
}



/** ****************************************************************************
 * reset the file (i.e. delete)
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.reset = function() {
    if (this.ready) {
        this.close();
    }

    try {
        if (this.file) {
            this.file.remove(false);
        }
    } catch (ex) {
    }
}



/** ****************************************************************************
 * write copies and cuts to file
 * write one per line
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.write = function() {
    this.reset();

    if (! this.ready) {
        this.open();
    }

    if (! this.ready) {
        return;
    }

    for (var msg in this.cuts) {
        var line = msg + " " + this.cuts[msg] + "\n";
        this.fileOutputStream.write(line, line.length);
    }

    var line = this.DIVIDER + "\n";
    this.fileOutputStream.write(line, line.length);

    for (var msg in this.copies) {
        var line = msg + " " + this.copies[msg] + "\n";
        this.fileOutputStream.write(line, line.length);
    }
}
