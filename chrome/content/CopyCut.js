/* *****************************************************************************
 * CopyCut.js
 *
 * (c) 2005 Alexander C. Hubmann
 *
 * JavaScript file to copy and cut messages
 *
 * Version: $Id$
 ******************************************************************************/



var COPYCUT_EXTENSION_PATH_ = "extensions";
var COPYCUT_EXTENSION_GUID_ = "{A23E4120-431F-4753-AE53-5D028C42CFDC}";
var COPYCUT_FILENAME_ = "threadarcsjs.copycut";
var COPYCUT_DIVIDER = "<<<<<<<<<<>>>>>>>>>>";



/** ****************************************************************************
 * constructor
 * create new object, create file pointers
 ******************************************************************************/
function CopyCut()
{
    // try to create file
    this.file_ = Components.classes["@mozilla.org/file/directory_service;1"]
                 .getService(Components.interfaces.nsIProperties)
                 .get("ProfD", Components.interfaces.nsIFile);
    
    this.file_.append(COPYCUT_EXTENSION_PATH_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    
    this.file_.append(COPYCUT_EXTENSION_GUID_);
    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    
    this.file_.append(COPYCUT_FILENAME_);
    
    this.ready_ = false;
    
    this.cuts_ = new Array();
    this.copies_ = new Array();
}



/** ****************************************************************************
 * add a copy
 * format: msgid_child msgid_parent
 * if we are adding a copy for a pair that was previously cut,
 * just remove the cut
 ******************************************************************************/
CopyCut.prototype.addCopy = function(msg_msg)
{
    var splits = msg_msg.split(" ");
    if (splits[0] != "" && splits[1] != "")
    {
        if (this.cuts_[splits[0]] == splits[1])
        {
            delete this.cuts_[splits[0]];
        }
        else
        {
            this.copies_[splits[0]] = splits[1];
        }
    }
}



/** ****************************************************************************
 * add a cut
 * format: msgid_child msgid_parent
 * if we are adding a cut for a pair that was previously copied,
 * just remove the copy
 ******************************************************************************/
CopyCut.prototype.addCut= function(msg_msg)
{
    var splits = msg_msg.split(" ");
    if (splits[0] != "" && splits[1] != "")
    {
        if (this.copies_[splits[0]] == splits[1])
        {
            delete this.copies_[splits[0]];
        }
        else
        {
            this.cuts_[splits[0]] = splits[1];
        }
    }
}



/** ****************************************************************************
 * close the file
 ******************************************************************************/
CopyCut.prototype.close = function()
{
    // if file is open, close it
    if (this.ready_)
    {
        this.ready_ = false;
        this.scriptable_input_stream_.close();
        this.file_input_stream_.close();
        this.file_output_stream_.close();
    }
}



/** ****************************************************************************
 * get copy for message
 * (return msg_id of new parent)
 ******************************************************************************/
CopyCut.prototype.getCopy = function(msg)
{
    return this.copies_[msg];
}



/** ****************************************************************************
 * get cut for message
 * (return msg_id of old parent)
 ******************************************************************************/
CopyCut.prototype.getCut = function(msg)
{
    return this.cuts_[msg];
}



/** ****************************************************************************
 * return the file object
 ******************************************************************************/
CopyCut.prototype.getFile = function()
{
    return this.file_;
}



/** ****************************************************************************
 * open the file
 * create streams
 ******************************************************************************/
CopyCut.prototype.open = function()
{
    this.ready_ = false;

    if (! this.file_.exists())
        this.file_.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);

    if (this.file_.exists())
    {
        this.file_output_stream_ = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                   .createInstance(Components.interfaces.nsIFileOutputStream);
        this.file_input_stream_ = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                   .createInstance(Components.interfaces.nsIFileInputStream);
        var options = 0x2 | 0x8 | 0x10;
        this.file_output_stream_.init(this.file_, options, 0, false);
        this.file_input_stream_.init(this.file_, 1, 0, false);

        this.scriptable_input_stream_ = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                           .createInstance(Components.interfaces.nsIScriptableInputStream);
        this.scriptable_input_stream_.init(this.file_input_stream_);

        this.ready_ = true;
    }
}



/** ****************************************************************************
 * read copies and cuts from file
 ******************************************************************************/
CopyCut.prototype.read = function()
{
    if (! this.ready_)
        this.open();
    
    if (! this.ready_)
        return;
    
    var file_size = this.scriptable_input_stream_.available();
    var file_contents = this.scriptable_input_stream_.read(file_size);
    
    // format of file is one cut or copy per line
    var lines = file_contents.split(/\n/);
    var i = 0;
    for (i; i < lines.length; i++)
    {
        // we use a simple format to divide the file into copies and cuts
        if (lines[i] == COPYCUT_DIVIDER)
            break;
        if (lines[i] != "")
            this.addCut(lines[i]);
    }
    // just assume that the rest after the divider is all copies
    i++;
    for (i; i < lines.length; i++)
    {
        if (lines[i] != "")
            this.addCopy(lines[i]);
    }
}



/** ****************************************************************************
 * reset the file (i.e. delete)
 ******************************************************************************/
CopyCut.prototype.reset = function()
{
    if (this.ready_)
        this.close();

    try
    {
        if (this.file_)
            this.file_.remove(false);
    }
    catch (ex)
    {
        alert(ex);
    }
}



/** ****************************************************************************
 * write copies and cuts to file
 * write one per line
 ******************************************************************************/
CopyCut.prototype.write = function()
{
    this.reset();
    
    if (! this.ready_)
        this.open();
    
    if (! this.ready_)
        return;
    
    for (var msg in this.cuts_)
    {
        var line = msg + " " + this.cuts_[msg] + "\n";
        this.file_output_stream_.write(line, line.length);
    }
    
    var line = COPYCUT_DIVIDER + "\n";
    this.file_output_stream_.write(line, line.length);
    
    for (var msg in this.copies_)
    {
        var line = msg + " " + this.copies_[msg] + "\n";
        this.file_output_stream_.write(line, line.length);
    }
}
