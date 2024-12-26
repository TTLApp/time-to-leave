'use strict';

import { ipcRenderer } from 'electron';
import * as config from '../../src/configs/app.config.js';
import { getUserPreferencesPromise, showDay } from '../../js/user-preferences.js';

function getLanguageDataPromise()
{
    return ipcRenderer.invoke('GET_LANGUAGE_DATA');
}

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

function showDayByPreferences(year, month, day, preferences)
{
    return showDay(year, month, day, preferences);
}

function displayWaiverWindow(waiverDay)
{
    ipcRenderer.send('SET_WAIVER_DAY', waiverDay);
}

function showDialogSync(dialogOptions)
{
    return ipcRenderer.invoke('SHOW_DIALOG', dialogOptions);
}

function getWaiverStoreContents()
{
    return ipcRenderer.invoke('GET_WAIVER_STORE_CONTENTS');
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
    getLanguageMap: () => config.getLanguageMap(),
    getUserPreferencesPromise: () => getUserPreferencesPromise(),
    getLanguageDataPromise: () => getLanguageDataPromise(),
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
    showDay: (year, month, day, userPreferences) => showDayByPreferences(year, month, day, userPreferences),
    displayWaiverWindow: (waiverDay) => displayWaiverWindow(waiverDay),
    showDialogSync: (dialogOptions) => showDialogSync(dialogOptions),
    getWaiverStoreContents: () => getWaiverStoreContents(),
    getStoreContents: () => getStoreContents(),
    setStoreData: (key, contents) => setStoreData(key, contents),
    deleteStoreData: (key) => deleteStoreData(key),
    computeAllTimeBalanceUntilPromise: (targetDate) => computeAllTimeBalanceUntilPromise(targetDate),
};

export {
    calendarApi
};
