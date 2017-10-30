
var DEFAULT_transient_before_time = 5000;
var DEFAULT_notif_timeout = 5000;

var NOTIF_IDENTIFIER = '-notif';

function loadPrefs(callback)
{
    var prefs = Object();
    function getAllPrefs(result)
    {
        if (result.ignore_tmp === undefined || result.ignore_tmp.toString()  == 'true')
        {
            prefs.ignore_tmp = true;
        }
        else
        {
            prefs.ignore_tmp = false;
        }
        if (result.enforce_transient === undefined || result.enforce_transient.toString()  == 'true')
        {
            prefs.enforce_transient = true;
        }
        else
        {
            prefs.enforce_transient = false;
        }
        if (result.transient_before_time !== undefined)
        {
            prefs.transient_before_time = result.transient_before_time;
        }
        else
        {
            prefs.transient_before_time = DEFAULT_transient_before_time;
        }
        if (result.notif_timeout !== undefined)
        {
            prefs.notif_timeout = result.notif_timeout;
        }
        else
        {
            prefs.notif_timeout = DEFAULT_notif_timeout;
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
        if (prefs.ignore_tmp && filepath.startsWith('/tmp'))
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
                }, parseInt(prefs.notif_timeout));
        }
    }
}


function onNotifClicked(notificationId)
{
    if (notificationId.search(NOTIF_IDENTIFIER) == -1)
    {
        return;
    }

    // This doesn't work
    // var downloadId = parseInt(notificationId);
    //
    // var opening = browser.downloads.open(downloadId);
    // opening.then(function (){}, function (error){console.log(`error = ${error}`)});
}


function dlComplete(download_list)
{
    download = download_list[0];

    var filepath = download.filename.split('/');
    var filename = filepath.pop(filepath.length-1);

    var timeMs = (new Date()).getTime() - (new Date(download.startTime)).getTime();
    var summary;
    var body;

    if (download.state == browser.downloads.State.COMPLETE)
    {
        summary = 'Download Complete: "' + filename + '"';
        body = 'File: "' + filename + '"\n';
        body += 'Saved in ' + filepath.join('/');
    }
    else if (download.error != null)
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
    console.log('Error on searching!');
    console.log(error);
}


function onDlChange(download)
{
    var query = browser.downloads.search({'id': download.id});
    query.then(dlComplete, onSearchError);
}


browser.downloads.onChanged.addListener(onDlChange);
browser.notifications.onClicked.addListener(onNotifClicked);
