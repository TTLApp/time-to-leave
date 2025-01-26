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

const preferencesApi = {
    notifyNewPreferences: (preferences) => notifyNewPreferences(preferences),
    getLanguageMap: () => config.getLanguageMap(),
    getDefaultPreferences: () => getDefaultPreferences(),
    changeLanguagePromise: (language) => changeLanguagePromise(language)
};

export {
    preferencesApi
};
