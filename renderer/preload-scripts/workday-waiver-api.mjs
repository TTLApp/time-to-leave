'use strict';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ipcRenderer } = require('electron');

import IpcConstants from '../../js/ipc-constants.mjs';

function getWaiverDay()
{
    return ipcRenderer.invoke(IpcConstants.GetWaiverDay);
}

function showAlert(alertMessage)
{
    ipcRenderer.send(IpcConstants.ShowAlert, alertMessage);
}

function setWaiver(key, contents)
{
    return ipcRenderer.invoke(IpcConstants.SetWaiver, key, contents);
}

function hasWaiver(key)
{
    return ipcRenderer.invoke(IpcConstants.HasWaiver, key);
}

function deleteWaiver(key)
{
    return ipcRenderer.invoke(IpcConstants.DeleteWaiver, key);
}

function getHolidays(country, state, city, year)
{
    return ipcRenderer.invoke(IpcConstants.GetHolidays, country, state, city, year);
}

function getCountries()
{
    return ipcRenderer.invoke(IpcConstants.GetCountries);
}

function getStates(country)
{
    return ipcRenderer.invoke(IpcConstants.GetStates, country);
}

function getRegions(country, state)
{
    return ipcRenderer.invoke(IpcConstants.GetRegions, country, state);
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
