'use strict';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ipcRenderer } = require('electron');

import { showDay } from '../../js/user-preferences.mjs';

function getWaiverDay()
{
    return ipcRenderer.invoke('GET_WAIVER_DAY');
}

function showAlert(alertMessage)
{
    ipcRenderer.send('SHOW_ALERT', alertMessage);
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
    getWaiverDay: () => getWaiverDay(),
    showAlert: (alertMessage) => showAlert(alertMessage),
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

export {
    workdayWaiverApi
};
