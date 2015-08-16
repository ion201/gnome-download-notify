var prefs = require('sdk/simple-prefs').prefs;

const {Cu} = require('chrome');
const {Cc} = require('chrome');
const {Ci} = require('chrome');


Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/Task.jsm');

var activeDownloads = [];

function onDlAdded(download){
    // Downloads are uniquely identified by target path
    activeDownloads.push(download.target.path);
}


function onDlChange(download){
    if (!download.stopped)
        return;

    if (activeDownloads.indexOf(download.target.path) === -1)
        return;

    if (prefs.ignore_tmp && download.target.path.startsWith('/tmp'))
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
    if (prefs.enforce_transient || (Date.now() - download.startTime.valueOf()) < prefs.transient_before_time)
        args.push('-h', 'int:transient:1');
    args.push('-t', prefs.notify_timeout);
    if (prefs.custom_args)
        Array.prototype.push.apply(args, prefs.custom_args.split(' '));

    var p = download.target.path.split('/');
    var filename = p.pop(p.length-1);
    args.push('Download completed: ' + filename, 'File saved to ' + p.join('/'));

    process.run(false, args, args.length);
    activeDownloads.splice(activeDownloads.indexOf(download.target.path), 1);
}


Task.spawn(function (){

    let list = yield Downloads.getList(Downloads.ALL);

    let view = {
        onDownloadAdded: download => onDlAdded(download),
        onDownloadChanged: download => onDlChange(download)
    }

    yield list.addView(view);

}).then(null, Cu.reportError);
