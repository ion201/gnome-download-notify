
function reqListener(e)
{
    window.addonConfig = JSON.parse(this.responseText);
}
var dataReq = new XMLHttpRequest();
dataReq.onload = reqListener;
dataReq.open('GET', 'pref/config.json');
dataReq.send();

var NOTIF_IDENTIFIER = '-notif';

var notified_dls = []
// Note: This only stores a hash, not any details
var RECENT_DOWNLOADS_MAX_SIZE = 32

function loadPrefs(callback)
{
    var prefs = Object();
    function getAllPrefs(result)
    {
        for (var key in window.addonConfig)
        {
            prefs[key] = window.addonConfig[key].defaultValue;
        }
        for (var key in result)
        {
            prefs[key] = result[key];
        }
        callback(prefs);
    }
    function onError(error)
    {
        console.log(`error = ${error}`);
    }

    var getter;
    getter = browser.storage.local.get();
    getter.then(getAllPrefs, onError);
}


function notify(summary, body, timeMs, filepath, downloadId)
{
    loadPrefs(doNotifyWithPrefs);

    function doNotifyWithPrefs(prefs)
    {
        if (prefs.ignore_tmp)
        {
            if (filepath.startsWith('/tmp') ||  // Linux / (probably) OSX
                    (filepath.indexOf('Local\\Temp') != -1)) // Windoze
            {
                return;
            }
        }
        if (timeMs < prefs.no_notify_shorter_than*1000)
        {
            return;
        }

        var notifId = downloadId.toString() + NOTIF_IDENTIFIER;
        var notif = browser.notifications.create(notifId, {
                        'type': 'basic',
                        'iconUrl': browser.extension.getURL('assets/default48.png'),
                        'title': summary,
                        'message': body
                    });

        if (prefs.enforce_transient || (timeMs < prefs.transient_before_time))
        {
            setTimeout(function(){
                    browser.notifications.clear(notifId);
                }, prefs.notif_timeout);
        }
    }
}


function onNotifClicked(notificationId)
{
    if (notificationId.search(NOTIF_IDENTIFIER) == -1)
    {
        return;
    }

    // This doesn't work - https://bugzilla.mozilla.org/show_bug.cgi?id=1402612
    // var downloadId = parseInt(notificationId);
    //
    // var opening = browser.downloads.open(downloadId);
    // opening.then(function (){}, function (error){console.log(`error = ${error}`)});
}


function hashDlObject(download)
{
    var s = download.startTime + '--' + download.id.toString();
    var hash = 0;
    for (i = 0; i < s.length; i++) {
        char = s.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}


function isDlAlreadyNotified(download)
{
    // No need to store exact download details so a hash will suffice
    var hash = hashDlObject(download);
    if (notified_dls.length > RECENT_DOWNLOADS_MAX_SIZE)
    {
        notified_dls.splice(0, RECENT_DOWNLOADS_MAX_SIZE-notified_dls.length);
    }
    if (notified_dls.indexOf(hash) == -1)
    {
        notified_dls.push(hash);
        return false;
    }
    return true;
}


function dlComplete(download_list)
{
    download = download_list[0];

    var pathSep = '/';    // Linux / (probably) OSX
    if (download.filename.indexOf('/') == -1)
    {
        pathSep = '\\'; // Windoze
    }
    var filepath = download.filename.split(pathSep);
    var filename = filepath.pop(filepath.length-1);

    var timeMs = (new Date()).getTime() - (new Date(download.startTime)).getTime();
    var summary;
    var body;

    var isAlreadyNotified = isDlAlreadyNotified(download);

    if (download.state == browser.downloads.State.COMPLETE && !isAlreadyNotified)
    {
        summary = 'Download Complete: "' + filename + '"';
        body = 'File: "' + filename + '"\n';
        body += 'Saved in ' + filepath.join(pathSep);
    }
    else if (download.error != null && !isAlreadyNotified)
    {
        if ((download.error == browser.downloads.InterruptReason.USER_SHUTDOWN) ||
                (download.error == browser.downloads.InterruptReason.USER_CANCELED))
        {
            // If this was a user action, ignore it.
            return;
        }
        summary = 'Download failed: ' + filename;
        body = 'Download error: ' + download.error;
        return;
    }
    else
    {
        return;
    }
    notify(summary, body, timeMs, download.filename, download.id);
}


function onSearchError(error)
{
    console.log(`search error = ${error}`);
}


function onDlChange(download)
{
    var query = browser.downloads.search({'id': download.id});
    query.then(dlComplete, onSearchError);
}


browser.downloads.onChanged.addListener(onDlChange);
browser.notifications.onClicked.addListener(onNotifClicked);
