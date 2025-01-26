'use strict';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ipcRenderer } = require('electron');

import * as config from '../../src/configs/app.config.mjs';
import { getDefaultPreferences } from '../../js/user-preferences.mjs';

function notifyNewPreferences(preferences)
{
    ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
}

function changeLanguagePromise(language)
{
    return ipcRenderer.invoke('CHANGE_LANGUAGE', language);
}

function getLanguageDataPromise()
{
    return ipcRenderer.invoke('GET_LANGUAGE_DATA');
}

function showDialogSync(dialogOptions)
{
    return ipcRenderer.invoke('SHOW_DIALOG', dialogOptions);
}

function getOriginalUserPreferences()
{
    const preferences = process.argv.filter((arg) => arg.startsWith('--preferences='))[0]?.split('=')?.[1];
    console.log(preferences);
    return JSON.parse(preferences || '{}');
}

const preferencesApi = {
    notifyNewPreferences: (preferences) => notifyNewPreferences(preferences),
    getLanguageMap: () => config.getLanguageMap(),
    getOriginalUserPreferences: () => getOriginalUserPreferences(),
    getDefaultPreferences: () => getDefaultPreferences(),
    changeLanguagePromise: (language) => changeLanguagePromise(language),
    getLanguageDataPromise: () => getLanguageDataPromise(),
    showDialogSync: (dialogOptions) => showDialogSync(dialogOptions)
};

export {
    preferencesApi
};
