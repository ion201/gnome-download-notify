
window.downloadNotify = new Object;
window.downloadNotify.addonConfig = undefined;
window.downloadNotify.configVerUpdated = undefined;

var FILE_STORE_NAME = 'stored-files';

function reqListener(e)
{
    window.downloadNotify.addonConfig = JSON.parse(this.responseText);
}
var dataReq = new XMLHttpRequest();
dataReq.onload = reqListener;
dataReq.overrideMimeType("application/json");
dataReq.open('GET', 'config.json');
dataReq.send();
function waitForConfigLoad()
{
    if (window.downloadNotify.addonConfig)
    {
        buildWebpage();
        restorePrefs();
    }
    else
    {
        window.setTimeout(waitForConfigLoad, 10);
    }
}

function onError(error)
{
    console.log(`Error: ${error}`);
}


function buildWebpage()
{
    var lastRow = document.querySelector('#prefsLastRow');
    var globalConfig = window.downloadNotify.addonConfig;

    for (var key in globalConfig)
    {
        var name = globalConfig[key].name;
        var inputId = key;
        var description = globalConfig[key].description;
        var inputField = "";
        var extraEventListeners = [
          {id: inputId, event: 'change', function: fieldUpdated}
        ];
        if (globalConfig[key].type == 'bool')
        {
            inputField = `<input type="checkbox" id="${inputId}" >`;
        }
        else if (globalConfig[key].type == 'int')
        {
            inputField = `<input type="number" id="${inputId}"`;
            if (globalConfig[key].min  !== undefined) { inputField += ` min="${globalConfig[key].min}"`; }
            if (globalConfig[key].max  !== undefined) { inputField += ` max="${globalConfig[key].max}"`; }
            if (globalConfig[key].step !== undefined) { inputField += ` step="${globalConfig[key].step}"`; }
            if (globalConfig[key].placeholder !== undefined) { inputField += ` placeholder="${globalConfig[key].placeholder}"`; }
            inputField += ' >';
        }
        else if (globalConfig[key].type == 'select')
        {
            inputField = `<select id="${inputId}">`;
            for (var idx in globalConfig[key].options)
            {
                var opt = globalConfig[key].options[idx];
                inputField += `<option value="${opt}">${opt}</option>`;
            }
            inputField += `</select>`;
        }
        else if (globalConfig[key].type == 'string')
        {
            inputField = `<input type="text" id="${inputId}"`;
            if (globalConfig[key].placeholder !== undefined) { inputField += ` placeholder="${globalConfig[key].placeholder}"`; }
            inputField += '>';
        }
        else if (globalConfig[key].type == 'file')
        {
            inputField = `<input type="file" id="${inputId}"`;
            if (globalConfig[key].accept !== undefined) { inputField += ` accept="${globalConfig[key].accept}"`; }
            inputField += `><p id=${inputId}_value>${globalConfig[key].defaultValue}</p>`;
            inputField += `<input type="button" value="Reset" id=${inputId}_reset for=${inputId}>`;
            extraEventListeners.push({
              id: `${inputId}_reset`,
              event: 'click',
              function: function(event) {
                document.getElementById(event.target.getAttribute('for')).trigger_reset = true;
                fieldUpdated();
              }
            });
        }
        else
        {
            console.log('buildWebpage() Skipping key: ' + key);
            continue;
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
                ${inputField}
            </td>
        </tr>`;
        var template = document.createElement('template');
        template.innerHTML = tableRow.trim();
        lastRow.parentNode.insertBefore(template.content.firstChild, lastRow);
        for (var idx in extraEventListeners)
        {
          var id = extraEventListeners[idx].id;
          var evt = extraEventListeners[idx].event;
          var func = extraEventListeners[idx].function;
          document.getElementById(id).addEventListener(evt, func);
        }
    }
}


function savePrefs(preferences)
{
    if (preferences === undefined)
    {
        browser.storage.local.get().then(savePrefs, onError);
        return;
    }

    var globalConfig = window.downloadNotify.addonConfig;
    for (var key in globalConfig)
    {
        var inputElem = document.querySelector('#' + key);
        if (inputElem === undefined)
        {
            console.log("DL NOTIFICATIONS ERROR - config element not found in page: " + key);
            continue;
        }
        if (globalConfig[key].type == 'bool')
        {
            preferences[key] = inputElem.checked || false;
        }
        else if (globalConfig[key].type == 'int')
        {
            preferences[key] = inputElem.value || globalConfig[key].defaultValue;
            if ((globalConfig[key].min !== undefined)
                    && (preferences[key] < globalConfig[key].min))
            {
                preferences[key] = globalConfig[key].min;
            }
            if ((globalConfig[key].max !== undefined)
                    && (preferences[key] > globalConfig[key].max))
            {
                preferences[key] = globalConfig[key].max;
            }
        }
        else if (globalConfig[key].type == 'select')
        {
            preferences[key] = inputElem.selectedOptions[0].value;
        }
        else if (globalConfig[key].type == 'string')
        {
            preferences[key] = inputElem.value;
        }
        else if (globalConfig[key].type == 'file')
        {
            if (inputElem.trigger_reset)
            {
                inputElem.trigger_reset = undefined;
                preferences[key] = undefined;
                document.getElementById(`${inputElem.id}_value`).innerText = globalConfig[key].defaultValue;
            }
            else if (inputElem.files.length > 0)
            {
                var file = inputElem.files[0];
                preferences[key] = file;
                document.getElementById(`${inputElem.id}_value`).innerText = file.name;
            }
            inputElem.value = "";
        }
        else if (globalConfig[key].type == 'internal')
        {
            // Do nothing.
        }
        else
        {
            console.log("DL NOTIF SAVE ERROR - config type not recognized: " + key + "/" + globalConfig[key].type);
            continue;
        }
    }

    browser.storage.local.set(preferences);
}

function restorePrefs()
{
    function setAllValues(result)
    {
        var globalConfig = window.downloadNotify.addonConfig;
        for (var key in globalConfig)
        {
            if (globalConfig[key].type == 'internal')
            {
                continue;
            }
            var inputElem = document.querySelector('#' + key);
            if (!inputElem)
            {
                console.log("DL NOTIFICATIONS ERROR - config element not found in page: " + key);
                continue;
            }
            if (globalConfig[key].type == 'bool')
            {
                inputElem.checked = globalConfig[key].defaultValue;
                if (result[key] !== undefined)
                {
                    inputElem.checked = result[key];
                }
            }
            else if (globalConfig[key].type == 'int')
            {
                inputElem.value = globalConfig[key].defaultValue;
                if (result[key] !== undefined)
                {
                    inputElem.value = result[key];
                }
            }
            else if (globalConfig[key].type == 'select')
            {
                var defaultIdx = 0;
                var currentIdx = undefined;
                for (var idx = 0; idx < inputElem.childElementCount; idx++)
                {
                    if (inputElem[idx].value == globalConfig[key].defaultValue)
                    {
                        defaultIdx = idx;
                    }
                    else if (inputElem[idx].value == result[key])
                    {
                        currentIdx = idx;
                    }
                }
                currentIdx = (currentIdx !== undefined) ? currentIdx : defaultIdx;
                inputElem[currentIdx].selected = true;
            }
            else if (globalConfig[key].type == 'string')
            {
                inputElem.value = globalConfig[key].defaultValue;
                if (result[key] !== undefined)
                {
                    inputElem.value = result[key];
                }
            }
            else if (globalConfig[key].type == 'file')
            {
                var filename = globalConfig[key].defaultValue;
                if (result[key] !== undefined)
                {
                    filename = result[key].name;
                }
                document.getElementById(`${inputElem.id}_value`).innerText = filename;
            }
            else
            {
                console.log("DL NOTIF RESTORE ERROR - config type not recognized: " + key + "/" + globalConfig[key].type);
                continue;
            }
        }
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
document.querySelector('#restoreDefaults').addEventListener('click', restoreDefaults);
document.querySelector('#prefsForm').addEventListener('submit', submitPrefsForm);
