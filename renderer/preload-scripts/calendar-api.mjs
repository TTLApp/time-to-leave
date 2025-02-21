'use strict';

import { createRequire } from 'module';
import IpcConstants from '../../js/ipc-constants.mjs';
import { getDefaultWidthHeight } from '../../js/user-preferences.mjs';
const require = createRequire(import.meta.url);

const { ipcRenderer } = require('electron');

function switchView()
{
    ipcRenderer.send(IpcConstants.SwitchView);
}

function toggleTrayPunchTime(enable)
{
    ipcRenderer.send(IpcConstants.ToggleTrayPunchTime, enable);
}

function displayWaiverWindow(waiverDay)
{
    ipcRenderer.send(IpcConstants.SetWaiverDay, waiverDay);
}

function getStoreContents()
{
    return ipcRenderer.invoke(IpcConstants.GetStoreContents);
}

function setStoreData(key, contents)
{
    return ipcRenderer.invoke(IpcConstants.SetStoreData, key, contents);
}

function deleteStoreData(key)
{
    return ipcRenderer.invoke(IpcConstants.DeleteStoreData, key);
}

function computeAllTimeBalanceUntilPromise(targetDate)
{
    return ipcRenderer.invoke(IpcConstants.ComputeAllTimeBalanceUntil, targetDate);
}

const calendarApi = {
    handleRefreshOnDayChange: (callback) => ipcRenderer.on(IpcConstants.RefreshOnDayChange, callback),
    handlePreferencesSaved: (callback) => ipcRenderer.on(IpcConstants.PreferencesSaved, callback),
    handleWaiverSaved: (callback) => ipcRenderer.on(IpcConstants.WaiverSaved, callback),
    handleCalendarReload: (callback) => ipcRenderer.on(IpcConstants.ReloadCalendar, callback),
    handlePunchDate: (callback) => ipcRenderer.on(IpcConstants.PunchDate, callback),
    handleThemeChange: (callback) => ipcRenderer.on(IpcConstants.ReloadTheme, callback),
    handleLeaveBy: (callback) => ipcRenderer.on(IpcConstants.GetLeaveBy, callback),
    getDefaultWidthHeight: getDefaultWidthHeight,
    handleToggleMainWindowWait: (callback) => ipcRenderer.on(IpcConstants.ToggleMainWindowWait, callback),
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
