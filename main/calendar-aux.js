'use strict';

import { ipcMain } from 'electron';

import { computeAllTimeBalanceUntilAsync } from '../js/time-balance.js';

import Store from 'electron-store';

const calendarStore = new Store({name: 'flexible-store'});

function getcalendarStore()
{
    return calendarStore.store;
}

function setupCalendarStore()
{
    ipcMain.handle('GET_STORE_CONTENTS', () =>
    {
        return getcalendarStore();
    });

    ipcMain.handle('SET_STORE_DATA', (event, key, contents) =>
    {
        calendarStore.set(key, contents);
        return true;
    });

    ipcMain.handle('DELETE_STORE_DATA', (event, key) =>
    {
        calendarStore.delete(key);
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
