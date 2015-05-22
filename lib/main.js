var prefs = require('sdk/simple-prefs').prefs;

const {Cu} = require('chrome');
const {Cc} = require('chrome');
const {Ci} = require('chrome');


Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/Task.jsm');


function onDlChange(download){
    if (!download.succeeded)
        return;
    
    // Some download has finished, launch a notification
    var file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
    file.initWithPath(prefs.exec_path);
    
    var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
    process.init(file);
    
    var args = [];
    if (prefs.use_custom_icon)
        args.push('-i', prefs.icon_path);
    else
        args.push('-i', '/usr/lib/firefox/browser/chrome/icons/default/default16.png');
    if (prefs.is_transient)
        args.push('-h', 'int:transient:1');
    args.push('-t', prefs.notify_timeout);
    if (prefs.custom_args)
        Array.prototype.push.apply(args, prefs.custom_args.split(' '));
    
    var p = download.target.path.split('/');
    var filename = p.pop(p.length-1);
    args.push('Download completed: ' + filename, 'File saved to ' + p.join('/'));
    
    process.run(false, args, args.length);
}


Task.spawn(function (){

    let list = yield Downloads.getList(Downloads.ALL);
    
    let view = {
        onDownloadChanged: download => onDlChange(download)
    }
    
    yield list.addView(view);
    
}).then(null, Cu.reportError);
