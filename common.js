var SOUND_NAME_TO_FILE = {
    bell: 'bell.ogg',
    ding: 'ding.oga',
    pop: 'pop.oga'
}

var audio_stream = document.createElement('audio');
var AUDIO_TIMEOUT_MS = 10 * 1000;

function playSoundAsset(prefs)
{
    function play(soundFile)
    {
        audio_stream.src = soundFile;
        audio_stream.play();
        setTimeout(function() {
            // Automatically stop after X seconds, in case the user's sound byte is too long
            if (!audio_stream.ended)
            {
                audio_stream.pause();
            }
        }, AUDIO_TIMEOUT_MS);
    }

    var target = prefs.notif_sound.toLowerCase();
    var soundFile = undefined;
    if (target == 'user uploaded' && prefs.user_upload_sound)
    {
        var reader = new FileReader();
        reader.onload = function(event) {
            play(event.target.result);
        }
        reader.readAsDataURL(prefs.user_upload_sound);
    }
    else if (SOUND_NAME_TO_FILE.hasOwnProperty(target))
    {
        soundFile = browser.runtime.getURL('assets/' + SOUND_NAME_TO_FILE[target]);
        play(soundFile);
    }
}


function loadPrefs(callback)
{
    var prefs = Object();
    function getAllPrefs(result)
    {
        for (var key in window.downloadNotify.addonConfig)
        {
            prefs[key] = window.downloadNotify.addonConfig[key].defaultValue;
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
