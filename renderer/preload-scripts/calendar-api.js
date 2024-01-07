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

function getFlexibleStoreContents()
{
    return ipcRenderer.invoke('GET_FLEXIBLE_STORE_CONTENTS');
}

function setFlexibleStoreData(key, contents)
{
    return ipcRenderer.invoke('SET_FLEXIBLE_STORE_DATA', key, contents);
}

function deleteFlexibleStoreData(key)
{
    return ipcRenderer.invoke('DELETE_FLEXIBLE_STORE_DATA', key);
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
    handleReloadCalendar: (callback) => ipcRenderer.on('RELOAD_CALENDAR', callback),
    handleLeaveBy: (callback) => ipcRenderer.on('GET_LEAVE_BY', callback),
    resizeMainWindow: () => resizeMainWindow(),
    switchView: () => switchView(),
    toggleTrayPunchTime: (enable) => toggleTrayPunchTime(enable),
    showDay: (year, month, day, userPreferences) => showDayByPreferences(year, month, day, userPreferences),
    displayWaiverWindow: (waiverDay) => displayWaiverWindow(waiverDay),
    showDialogSync: (dialogOptions) => showDialogSync(dialogOptions),
    getWaiverStoreContents: () => getWaiverStoreContents(),
    getFlexibleStoreContents: () => getFlexibleStoreContents(),
    setFlexibleStoreData: (key, contents) => setFlexibleStoreData(key, contents),
    deleteFlexibleStoreData: (key) => deleteFlexibleStoreData(key),
    computeAllTimeBalanceUntilPromise: (targetDate) => computeAllTimeBalanceUntilPromise(targetDate),
};

export {
    calendarApi
};
