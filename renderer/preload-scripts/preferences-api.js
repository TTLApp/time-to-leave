'use strict';

const { ipcRenderer } = require('electron');
const config = require('../../src/configs/app.config');
const { getUserPreferencesPromise } = require('../../js/user-preferences.js');

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

const preferencesApi = {
    notifyNewPreferences: (preferences) => notifyNewPreferences(preferences),
    getLanguageMap: () => config.getLanguageMap(),
    getUserPreferencesPromise: () => getUserPreferencesPromise(),
    changeLanguagePromise: (language) => changeLanguagePromise(language),
    getLanguageDataPromise: () => getLanguageDataPromise()
};

module.exports = {
    preferencesApi
};
