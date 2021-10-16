'use strict';

const { ipcRenderer } = require('electron');
const config = require('../../src/configs/app.config');
const { getUserPreferencesPromise } = require('../../js/user-preferences.js');
const i18n = require('../../src/configs/i18next.config');

function notifyNewPreferences(preferences)
{
    ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
}

let isI18nLoaded = false;
i18n.on('loaded', () =>
{
    isI18nLoaded = true;
    i18n.off('loaded');
    i18n.off('languageChanged');
});

const i18nLoadedPromise = new Promise(
    (resolve) =>
    {
        setTimeout(
            function()
            {
                if (isI18nLoaded)
                {
                    resolve();
                }
            }, 300);
    }
);

const preferencesApi = {
    notifyNewPreferences: (preferences) => notifyNewPreferences(preferences),
    getLanguageMap: () => config.getLanguageMap(),
    getUserPreferencesPromise: () => getUserPreferencesPromise(),
    changeLanguage: (code) => { return i18n.changeLanguage(code); },
    i18nLoadedPromise: i18nLoadedPromise,
    getDataByLanguage: (code) => i18n.getDataByLanguage(code)
};

module.exports = {
    preferencesApi
};
