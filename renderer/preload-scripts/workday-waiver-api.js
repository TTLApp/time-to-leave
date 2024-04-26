'use strict';

import { ipcRenderer } from 'electron';
import * as config from '../../src/configs/app.config.js';
import { getUserPreferencesPromise, showDay } from '../../js/user-preferences.js';

function getLanguageData()
{
    return ipcRenderer.invoke('GET_LANGUAGE_DATA');
}

function getWaiverDay()
{
    return ipcRenderer.invoke('GET_WAIVER_DAY');
}

function getWorkdayDay()
{
    return ipcRenderer.invoke('GET_WORKDAY_DAY');
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

function getWorkdayStoreContents()
{
    return ipcRenderer.invoke('GET_WORKDAY_STORE_CONTENTS');
}

function setWorkday(key, contents)
{
    return ipcRenderer.invoke('SET_WORKDAY', key, contents);
}

function hasWorkday(key)
{
    return ipcRenderer.invoke('HAS_WORKDAY', key);
}

function deleteWorkday(key)
{
    return ipcRenderer.invoke('DELETE_WORKDAY', key);
}

function getHolidays(country, state, city, year)
{
    return ipcRenderer.invoke('GET_HOLIDAYS', country, state, city, year);
}

function getCountries()
{
    return ipcRenderer.invoke('GET_COUNTRIES');
}

function getStates(country)
{
    return ipcRenderer.invoke('GET_STATES', country);
}

function getRegions(country, state)
{
    return ipcRenderer.invoke('GET_REGIONS', country, state);
}

const workdayWaiverApi = {
    getLanguageMap: () => config.getLanguageMap(),
    getUserPreferences: () => getUserPreferencesPromise(),
    getLanguageData: () => getLanguageData(),
    getWaiverDay: () => getWaiverDay(),
    getWorkdayDay: () => getWorkdayDay(),
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
    deleteWaiver: (key) => deleteWaiver(key),
    getWorkdayStoreContents: () => getWorkdayStoreContents(),
    setWorkday: (key, contents) => setWorkday(key, contents),
    hasWorkday: (key) => hasWorkday(key),
    deleteWorkday: (key) => deleteWorkday(key)
};

export {
    workdayWaiverApi
};
