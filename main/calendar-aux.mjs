'use strict';

import { ipcMain } from 'electron';
import Store from 'electron-store';

import TimeBalance from '../js/time-balance.mjs';
import IpcConstants from '../js/ipc-constants.mjs';

const calendarStore = new Store({name: 'flexible-store'});

function getCalendarStore()
{
    return calendarStore.store;
}

function setupCalendarStore()
{
    ipcMain.handle(IpcConstants.GetStoreContents, () =>
    {
        return getCalendarStore();
    });

    ipcMain.handle(IpcConstants.SetStoreData, (event, key, contents) =>
    {
        calendarStore.set(key, contents);
        return true;
    });

    ipcMain.handle(IpcConstants.DeleteStoreData, (event, key) =>
    {
        calendarStore.delete(key);
        return true;
    });

    ipcMain.handle(IpcConstants.ComputeAllTimeBalanceUntil, (event, targetDate) =>
    {
        return TimeBalance.computeAllTimeBalanceUntilAsync(targetDate);
    });
}

export {
    setupCalendarStore
};
