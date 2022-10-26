'use strict';

const { ipcMain } = require('electron');

import { computeAllTimeBalanceUntilAsync } from '../js/time-balance.js';

const Store = require('electron-store');

const flexibleStore = new Store({name: 'flexible-store'});

function getFlexibleStore()
{
    return flexibleStore.store;
}

function setupCalendarStore()
{
    ipcMain.handle('GET_FLEXIBLE_STORE_CONTENTS', () =>
    {
        return getFlexibleStore();
    });

    ipcMain.handle('SET_FLEXIBLE_STORE_DATA', (event, key, contents) =>
    {
        flexibleStore.set(key, contents);
        return true;
    });

    ipcMain.handle('DELETE_FLEXIBLE_STORE_DATA', (event, key) =>
    {
        flexibleStore.delete(key);
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
