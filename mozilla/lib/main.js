var prefs = require('sdk/simple-prefs').prefs;

const {Cu} = require('chrome');
const {Cc} = require('chrome');
const {Ci} = require('chrome');


Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/Task.jsm');

var activeDownloads = [];

function onDlAdded(download){
    // Downloads are uniquely identified by start time
    activeDownloads.push(download.startTime.valueOf());
}


function onDlChange(download){
    if (!download.stopped){
        if (activeDownloads.indexOf(download.startTime.valueOf()) === -1)
            activeDownloads.push(download.startTime.valueOf());
        return;
    }

    if (download.canceled){
        activeDownloads.splice(activeDownloads.indexOf(download.startTime.valueOf()), 1);
        return;
    }

    if (activeDownloads.indexOf(download.startTime.valueOf()) === -1)
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

    var p = download.target.path.split('/');
    var filename = p.pop(p.length-1);
    if (download.succeeded){
        args.push('Download completed: ' + filename, 'File saved to ' + p.join('/'));
    } else if (download.error !== null)
        args.push('Download interrupted: ' + filename);

    activeDownloads.splice(activeDownloads.indexOf(download.startTime.valueOf()), 1);
    process.run(false, args, args.length);
}


Task.spawn(function (){

    let list = yield Downloads.getList(Downloads.ALL);

    let view = {
        onDownloadAdded: download => onDlAdded(download),
        onDownloadChanged: download => onDlChange(download)
    }

    yield list.addView(view);

}).then(null, Cu.reportError);
