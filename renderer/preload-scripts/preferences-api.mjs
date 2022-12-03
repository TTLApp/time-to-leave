'use strict';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ipcRenderer } = require('electron');

import * as config from '../../src/configs/app.config.mjs';
import { getUserPreferencesPromise, getDefaultPreferences } from '../../js/user-preferences.mjs';

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

const preferencesApi = {
    notifyNewPreferences: (preferences) => notifyNewPreferences(preferences),
    getLanguageMap: () => config.getLanguageMap(),
    getUserPreferencesPromise: () => getUserPreferencesPromise(),
    getDefaultPreferences: () => getDefaultPreferences(),
    changeLanguagePromise: (language) => changeLanguagePromise(language),
    getLanguageDataPromise: () => getLanguageDataPromise(),
    showDialogSync: (dialogOptions) => showDialogSync(dialogOptions)
};

export {
    preferencesApi
};
