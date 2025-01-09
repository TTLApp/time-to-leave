'use strict';

import { ipcMain } from 'electron';
import i18nextBackend from 'i18next-fs-backend';
import path from 'path';

import { fallbackLng, getLanguagesCodes } from './app.config.mjs';
import { appConfig } from '../../js/app-config.mjs';
import { MockClass } from '../../__mocks__/Mock.mjs';

// Allow require()
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const i18n = require('i18next');

// TODO: make async below again
import { getUserLanguage } from '../../js/user-preferences.mjs';

const i18nextOptions = {
    backend:{
        // path where resources get loaded from
        loadPath: path.join(appConfig.appPath, 'locales/{{lng}}/{{ns}}.json'),
        // path to post missing resources
        addPath: path.join(appConfig.appPath, 'locales/{{lng}}/{{ns}}.missing.json'),
        // jsonIndent to use when storing json files
        jsonIndent: 2,
    },
    interpolation: {
        escapeValue: false
    },
    saveMissing: true,
    fallbackLng: fallbackLng,
    supportedLngs: getLanguagesCodes(),
    locales: getLanguagesCodes(),
    react: {
        wait: false
    }
};

function setupI18n()
{
    const userLanguage = getUserLanguage();

    return new Promise((resolve) =>
    {
        i18n.use(i18nextBackend);

        // initialize if not already initialized
        if (!i18n.isInitialized)
        {
            i18n.init(i18nextOptions, () =>
            {
                i18n.changeLanguage(userLanguage).then(() =>
                {
                    resolve();
                });
            });
        }
    });
}

function setLanguageChangedCallback(languageChangedCallback)
{
    i18n.on('languageChanged', () =>
    {
        languageChangedCallback();
    });
}

function changeLanguage(language)
{
    return i18n.changeLanguage(language);
}

ipcMain.handle('CHANGE_LANGUAGE', (event, language) =>
{
    return new Promise((resolve) =>
    {
        changeLanguage(language).then(() =>
        {
            resolve(getCurrentLanguageData());
        });
    });
});

function getCurrentLanguageData()
{
    return i18n.getDataByLanguage(i18n.language);
}

ipcMain.handle('GET_LANGUAGE_DATA', () =>
{
    return {
        'language': i18n.language,
        'data': getCurrentLanguageData()
    };
});

function _getCurrentTranslation(code)
{
    return i18n.t(code);
}

// Enable mocking for some methods, export the mocked versions
const mocks = {'getCurrentTranslation': _getCurrentTranslation};
export const getCurrentTranslation = (code) => mocks['getCurrentTranslation'](code);
export const i18nMock = new MockClass(mocks);

export {
    changeLanguage,
    setLanguageChangedCallback,
    setupI18n,
};
