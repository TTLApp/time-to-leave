'use strict';

const { ipcRenderer } = require('electron');
import * as config from '../../src/configs/app.config.js';
import { getUserPreferencesPromise, showDay } from '../../js/user-preferences.js';

const Holidays = require('date-holidays');
const hd = new Holidays();

function getLanguageDataPromise()
{
    return ipcRenderer.invoke('GET_LANGUAGE_DATA');
}

function getWaiverDayPromise()
{
    return ipcRenderer.invoke('GET_WAIVER_DAY');
}

function showAlert(alertMessage)
{
    ipcRenderer.send('SHOW_ALERT', alertMessage);
}

function showDialogSync(dialogOptions)
{
    return ipcRenderer.invoke('SHOW_DIALOG', dialogOptions);
}

function showDayByPreferences(year, month, day, preferences)
{
    return showDay(year, month, day, preferences);
}

function getHolidays(country, state, city, year)
{
    if (state !== undefined && city !== undefined)
    {
        hd.init(country, state, city);
    }
    else if (state !== undefined && state !== '--' )
    {
        hd.init(country, state);
    }
    else
    {
        hd.init(country);
    }

    return hd.getHolidays(year);
}

function getCountries()
{
    return hd.getCountries();
}

function getStates(country)
{
    return hd.getStates(country);
}

function getRegions(country, state)
{
    return hd.getRegions(country, state);
}

function getWaiverStoreContents()
{
    return ipcRenderer.invoke('GET_WAIVER_STORE_CONTENTS');
}

function setWaiver(key, contents)
{
    return ipcRenderer.invoke('SET_WAIVER', key, contents);
}

function hasWaiver(key)
{
    return ipcRenderer.invoke('HAS_WAIVER', key);
}

function deleteWaiver(key)
{
    return ipcRenderer.invoke('DELETE_WAIVER', key);
}

const workdayWaiverApi = {
    getLanguageMap: () => config.getLanguageMap(),
    getUserPreferencesPromise: () => getUserPreferencesPromise(),
    getLanguageDataPromise: () => getLanguageDataPromise(),
    getWaiverDayPromise: () => getWaiverDayPromise(),
    showAlert: (alertMessage) => showAlert(alertMessage),
    showDialogSync: (dialogOptions) => showDialogSync(dialogOptions),
    showDay: (year, month, day, userPreferences) => showDayByPreferences(year, month, day, userPreferences),
    getHolidays: (country, state, city, year) => getHolidays(country, state, city, year),
    getCountries: () => getCountries(),
    getStates: (country) => getStates(country),
    getRegions: (country, state) => getRegions(country, state),
    getWaiverStoreContents: () => getWaiverStoreContents(),
    setWaiver: (key, contents) => setWaiver(key, contents),
    hasWaiver: (key) => hasWaiver(key),
    deleteWaiver: (key) => deleteWaiver(key)
};

module.exports = {
    workdayWaiverApi
};
