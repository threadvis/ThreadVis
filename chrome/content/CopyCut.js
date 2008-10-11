/* *****************************************************************************
 * This file is part of ThreadVis.
 * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
 * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
 * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
 *
 * Copyright (C) 2005-2007 Alexander C. Hubmann
 * Copyright (C) 2007-2008 Alexander C. Hubmann-Haidvogel
 *
 * JavaScript file to copy and cut messages
 * TODO move this into database
 *
 * $Id$
 ******************************************************************************/



if (! window.ThreadVisNS) {
    window.ThreadVisNS = {};
}



/** ****************************************************************************
 * Constructor
 * Create new object, create file pointers
 *
 * @return
 *          A new copycut object
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
 * Add a copy
 * format: msgid_child msgid_parent
 * If we are adding a copy for a pair that was previously cut,
 * just remove the cut
 *
 * @param msgMsg
 *          The new entry
 * @return
 *          void
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
 * Add a cut
 * Format: msgid_child msgid_parent
 * If we are adding a cut for a pair that was previously copied,
 * just remove the copy
 *
 * @param msgMsg
 *          The new entry
 * @return
 *          void
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
 * Close the file
 *
 * @return
 *          void
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
 * Get copy for message
 *
 * @param msg
 *          The message
 * @return
 *          Any copies of the message (msg id of the new parent)
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.getCopy = function(msg) {
    return this.copies[msg];
}



/** ****************************************************************************
 * Get cut for message
 *
 * @param msg
 *          The message
 * @return
 *          Any cuts of the message (msg id of the old parent)
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.getCut = function(msg) {
    return this.cuts[msg];
}



/** ****************************************************************************
 * Return the file object
 *
 * @return
 *          The file object
 ******************************************************************************/
ThreadVisNS.CopyCut.prototype.getFile = function() {
    return this.file;
}



/** ****************************************************************************
 * Open the file
 * Create streams
 *
 * @return
 *          void
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
 * Read copies and cuts from file
 *
 * @return
 *          void
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
 * Reset the file (i.e. delete)
 *
 * @return
 *          void
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
 * Write copies and cuts to file
 * Write one per line
 *
 * @return
 *          void
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
