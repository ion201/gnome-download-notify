
var DEFAULT_transient_before_time = '5000';
var DEFAULT_notif_timeout = '5000';

function savePrefs(e)
{
    e.preventDefault();
    var ignore_tmp = 'false';
    if (document.querySelector('#ignore_tmp').checked)
    {
        ignore_tmp = 'true';
    }
    var enforce_transient = 'false';
    if (document.querySelector('#enforce_transient').checked)
    {
        enforce_transient = 'true';
    }
    var transient_before_time = DEFAULT_transient_before_time;
    if (document.querySelector('#transient_before_time').value !== undefined)
    {
        transient_before_time = document.querySelector('#transient_before_time').value.toString()
        if (parseInt(transient_before_time) < 0)
        {
            transient_before_time = '0';
        }
    }
    if (document.querySelector('#notif_timeout').value !== undefined)
    {
        notif_timeout = document.querySelector('#notif_timeout').value.toString()
        if (parseInt(notif_timeout) < 100)
        {
            notif_timeout = '100';
        }
    }
    // console.log(enforce_transient);
    browser.storage.local.set({
            ignore_tmp: (ignore_tmp == 'true'),
            enforce_transient: (enforce_transient == 'true'),
            transient_before_time: parseInt(transient_before_time),
            notif_timeout: parseInt(notif_timeout)
        });
}

function restorePrefs()
{
    function set_ignore_tmp(result)
    {
        if (result.ignore_tmp === undefined || result.ignore_tmp.toString()  == 'true')
        {
            document.querySelector('#ignore_tmp').value = 'true';
            document.querySelector('#ignore_tmp').checked = true;
        }
        else
        {
            document.querySelector('#ignore_tmp').value = 'false';
        }
    }
    function set_enforce_transient(result)
    {
        if (result.enforce_transient === undefined || result.enforce_transient.toString() == 'true')
        {
            document.querySelector('#enforce_transient').value = 'true';
            document.querySelector('#enforce_transient').checked = true;
        }
        else
        {
            document.querySelector('#enforce_transient').value = 'false';
        }
    }
    function set_transient_before_time(result)
    {
        document.querySelector('#transient_before_time').value = result.transient_before_time || DEFAULT_transient_before_time;
    }
    function set_notif_timeout(result)
    {
        document.querySelector('#notif_timeout').value = result.notif_timeout || DEFAULT_notif_timeout;
    }

    function onError(error)
    {
        console.log(`Error: ${error}`);
    }

    var get_ignore_tmp = browser.storage.local.get('ignore_tmp');
    get_ignore_tmp.then(set_ignore_tmp, onError);
    var get_enforce_transient = browser.storage.local.get('enforce_transient');
    get_enforce_transient.then(set_enforce_transient, onError);
    var get_transient_before_time = browser.storage.local.get('transient_before_time');
    get_transient_before_time.then(set_transient_before_time, onError);
    var get_notif_timeout = browser.storage.local.get('notif_timeout');
    get_notif_timeout.then(set_notif_timeout, onError);
}

function submitForm(e)
{
    document.querySelector('#savePrefs').click();
}

document.addEventListener('DOMContentLoaded', restorePrefs);
document.querySelector('#prefsForm').addEventListener('submit', savePrefs);
document.querySelector('#ignore_tmp').addEventListener('change', submitForm);
document.querySelector('#enforce_transient').addEventListener('change', submitForm);
document.querySelector('#transient_before_time').addEventListener('change', submitForm);
document.querySelector('#notif_timeout').addEventListener('change', submitForm);
