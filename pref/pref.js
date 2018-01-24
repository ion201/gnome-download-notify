
function reqListener(e)
{
    window.addonConfig = JSON.parse(this.responseText);
}
var dataReq = new XMLHttpRequest();
dataReq.onload = reqListener;
dataReq.overrideMimeType("application/json");
dataReq.open('GET', 'config.json');
dataReq.send();
function waitForConfigLoad()
{
    if (window.addonConfig)
    {
        buildWebpage();
        restorePrefs();
    }
    else
    {
        window.setTimeout(waitForConfigLoad, 10);
    }
}


function buildWebpage()
{
    var lastRow = document.querySelector('#prefsLastRow');

    for (var key in window.addonConfig)
    {
        var name = window.addonConfig[key].name;
        var inputId = key;
        var description = window.addonConfig[key].description;
        var typeSpecific = "";
        if (window.addonConfig[key].type == 'bool')
        {
            typeSpecific = 'type="checkbox"';
        }
        else if (window.addonConfig[key].type == 'int')
        {
            typeSpecific = 'type="number"';
            if (window.addonConfig[key].min !== undefined)
            {
                typeSpecific += ` min="${window.addonConfig[key].min}"`;
            }
            if (window.addonConfig[key].max !== undefined)
            {
                typeSpecific += ` max="${window.addonConfig[key].max}"`;
            }
            if (window.addonConfig[key].step !== undefined)
            {
                typeSpecific += ` step="${window.addonConfig[key].step}"`;
            }
        }
        var tableRow = `
        <tr>
            <td class="col1">
                <label>
                    <strong>${name}</strong>
                    <br>
                    ${description}
                </label>
            </td>
            <td class="col2">
                <input ${typeSpecific} id="${inputId}" >
            </td>
        </tr>`;
        var template = document.createElement('template');
        template.innerHTML = tableRow.trim();
        template.content.firstChild.addEventListener('change', fieldUpdated);
        lastRow.parentNode.insertBefore(template.content.firstChild, lastRow);
    }
}


function savePrefs()
{
    var preferences = Object();
    for (var key in window.addonConfig)
    {
        var inputElem = document.querySelector('#' + key);
        if (inputElem === undefined)
        {
            console.log("DL NOTIFICATIONS ERROR - config element not found in page: " + key);
            continue;
        }
        if (window.addonConfig[key].type == 'bool')
        {
            preferences[key] = inputElem.checked || false;
        }
        else if (window.addonConfig[key].type == 'int')
        {
            preferences[key] = inputElem.value;
            if ((window.addonConfig[key].min !== undefined)
                    && (preferences[key] < window.addonConfig[key].min))
            {
                preferences[key] = window.addonConfig[key].min;
            }
            if ((window.addonConfig[key].max !== undefined)
                    && (preferences[key] > window.addonConfig[key].max))
            {
                preferences[key] = window.addonConfig[key].max;
            }
        }
        else
        {
            console.log("DL NOTIFICATIONS ERROR - config type not recognized: " + window.addonConfig[key].type);
            continue;
        }
    }

    browser.storage.local.set(preferences);
}

function restorePrefs()
{
    function setAllValues(result)
    {
        for (var key in window.addonConfig)
        {
            var inputElem = document.querySelector('#' + key);
            if (inputElem === undefined)
            {
                console.log("DL NOTIFICATIONS ERROR - config element not found in page: " + key);
                continue;
            }
            if (window.addonConfig[key].type == 'bool')
            {
                var isEnabled;
                if (result[key] !== undefined)
                {
                    isEnabled = result[key]
                }
                else
                {
                    isEnabled = window.addonConfig[key].defaultValue;
                }
                if (isEnabled)
                {
                    inputElem.checked = true;
                }
            }
            else if (window.addonConfig[key].type == 'int')
            {
                if (result[key] !== undefined)
                {
                    inputElem.value = result[key];
                }
                else
                {
                    inputElem.value = window.addonConfig[key].defaultValue;
                }
            }
            else
            {
                console.log("DL NOTIFICATIONS ERROR - config type not recognized: " + window.addonConfig[key].type);
                continue;
            }
        }
    }

    function onError(error)
    {
        console.log(`Error: ${error}`);
    }

    var get_preferences = browser.storage.local.get();
    get_preferences.then(setAllValues, onError);
}

function fieldUpdated(e)
{
    document.querySelector('#savePrefs').click();
}

function restoreDefaults()
{
    browser.storage.local.clear();
    restorePrefs();
}

function submitPrefsForm(e)
{
    e.preventDefault();
    if (e.explicitOriginalTarget.id == 'restoreDefaults')
    {
        restoreDefaults();
    }
    else
    {
        savePrefs();
    }
}

document.addEventListener('DOMContentLoaded', waitForConfigLoad);
document.querySelector('#restoreDefaults').addEventListener('submit', restoreDefaults);
document.querySelector('#prefsForm').addEventListener('submit', submitPrefsForm);
