'use strict';

import { ipcMain } from 'electron';

import { computeAllTimeBalanceUntilAsync } from '../js/time-balance.js';

import Store from 'electron-store';

const entryStore = new Store({name: 'flexible-store'});

function getEntryStore()
{
    return entryStore.store;
}

function setupCalendarStore()
{
    ipcMain.handle('GET_STORE_CONTENTS', () =>
    {
        return getEntryStore();
    });

    ipcMain.handle('SET_STORE_DATA', (event, key, contents) =>
    {
        entryStore.set(key, contents);
        return true;
    });

    ipcMain.handle('DELETE_STORE_DATA', (event, key) =>
    {
        entryStore.delete(key);
        return true;
    });

    ipcMain.handle('COMPUTE_ALL_TIME_BALANCE_UNTIL', (event, targetDate) =>
    {
        return computeAllTimeBalanceUntilAsync(targetDate);
    });
}

export {
    setupCalendarStore
};
