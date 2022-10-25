'use strict';

const { ipcMain } = require('electron');

const Store = require('electron-store');
const waiverStore = new Store({name: 'waived-workdays'});

function getWaiverStore()
{
    return waiverStore.store;
}

function setupWorkdayWaiverStore()
{
    ipcMain.handle('GET_WAIVER_STORE_CONTENTS', () =>
    {
        return getWaiverStore();
    });

    ipcMain.handle('SET_WAIVER', (event, key, contents) =>
    {
        waiverStore.set(key, contents);
        return true;
    });

    ipcMain.handle('HAS_WAIVER', (event, key) =>
    {
        return waiverStore.has(key);
    });

    ipcMain.handle('DELETE_WAIVER', (event, key) =>
    {
        waiverStore.delete(key);
        return true;
    });
}

export {
    setupWorkdayWaiverStore
};
