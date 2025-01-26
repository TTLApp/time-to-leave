'use strict';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ipcRenderer } = require('electron');

function resizeMainWindow()
{
    ipcRenderer.send('RESIZE_MAIN_WINDOW');
}

function switchView()
{
    ipcRenderer.send('SWITCH_VIEW');
}

function toggleTrayPunchTime(enable)
{
    ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', enable);
}

function displayWaiverWindow(waiverDay)
{
    ipcRenderer.send('SET_WAIVER_DAY', waiverDay);
}

function getStoreContents()
{
    return ipcRenderer.invoke('GET_STORE_CONTENTS');
}

function setStoreData(key, contents)
{
    return ipcRenderer.invoke('SET_STORE_DATA', key, contents);
}

function deleteStoreData(key)
{
    return ipcRenderer.invoke('DELETE_STORE_DATA', key);
}

function computeAllTimeBalanceUntilPromise(targetDate)
{
    return ipcRenderer.invoke('COMPUTE_ALL_TIME_BALANCE_UNTIL', targetDate);
}

const calendarApi = {
    handleRefreshOnDayChange: (callback) => ipcRenderer.on('REFRESH_ON_DAY_CHANGE', callback),
    handlePreferencesSaved: (callback) => ipcRenderer.on('PREFERENCES_SAVED', callback),
    handleWaiverSaved: (callback) => ipcRenderer.on('WAIVER_SAVED', callback),
    handleCalendarReload: (callback) => ipcRenderer.on('RELOAD_CALENDAR', callback),
    handlePunchDate: (callback) => ipcRenderer.on('PUNCH_DATE', callback),
    handleThemeChange: (callback) => ipcRenderer.on('RELOAD_THEME', callback),
    handleLeaveBy: (callback) => ipcRenderer.on('GET_LEAVE_BY', callback),
    resizeMainWindow: () => resizeMainWindow(),
    switchView: () => switchView(),
    toggleTrayPunchTime: (enable) => toggleTrayPunchTime(enable),
    displayWaiverWindow: (waiverDay) => displayWaiverWindow(waiverDay),
    getStoreContents: () => getStoreContents(),
    setStoreData: (key, contents) => setStoreData(key, contents),
    deleteStoreData: (key) => deleteStoreData(key),
    computeAllTimeBalanceUntilPromise: (targetDate) => computeAllTimeBalanceUntilPromise(targetDate),
};

export {
    calendarApi
};
