'use strict';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ipcRenderer } = require('electron');

function getWaiverDay()
{
    return ipcRenderer.invoke('GET_WAIVER_DAY');
}

function showAlert(alertMessage)
{
    ipcRenderer.send('SHOW_ALERT', alertMessage);
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
    getHolidays: (country, state, city, year) => getHolidays(country, state, city, year),
    getCountries: () => getCountries(),
    getStates: (country) => getStates(country),
    getRegions: (country, state) => getRegions(country, state),
    setWaiver: (key, contents) => setWaiver(key, contents),
    hasWaiver: (key) => hasWaiver(key),
    deleteWaiver: (key) => deleteWaiver(key)
};

export {
    workdayWaiverApi
};
