'use strict';

import Holidays from 'date-holidays';
import { ipcMain } from 'electron';
import Store from 'electron-store';

import IpcConstants from '../js/ipc-constants.mjs';

const hd = new Holidays();
const waiverStore = new Store({name: 'waived-workdays'});

// Waiver Store handlers
function getWaiverStore()
{
    return waiverStore.store;
}

function setupWorkdayWaiverStoreHandlers()
{
    ipcMain.handle(IpcConstants.GetWaiverStoreContents, () =>
    {
        return getWaiverStore();
    });

    ipcMain.handle(IpcConstants.SetWaiver, (_event, key, contents) =>
    {
        waiverStore.set(key, contents);
        return true;
    });

    ipcMain.handle(IpcConstants.HasWaiver, (_event, key) =>
    {
        return waiverStore.has(key);
    });

    ipcMain.handle(IpcConstants.DeleteWaiver, (_event, key) =>
    {
        waiverStore.delete(key);
        return true;
    });
}

// Holiday handlers

function InitHolidays(country, state, city)
{
    if (state !== undefined && city !== undefined)
    {
        hd.init(country, state, city);
    }
    else if (state !== undefined && state !== '--' )
    {
        hd.init(country, state);
    }
    else
    {
        hd.init(country);
    }
}

function getAllHolidays(country, state, city, year)
{
    InitHolidays(country, state, city);
    return hd.getHolidays(year);
}

function getCountries()
{
    return hd.getCountries();
}

function getStates(country)
{
    return hd.getStates(country);
}

function getRegions(country, state)
{
    return hd.getRegions(country, state);
}

function setupWorkdayHolidaysHandlers()
{
    ipcMain.handle(IpcConstants.GetHolidays, (_event, country, state, city, year) =>
    {
        return getAllHolidays(country, state, city, year);
    });

    ipcMain.handle(IpcConstants.GetCountries, () =>
    {
        return getCountries();
    });

    ipcMain.handle(IpcConstants.GetStates, (_event, country) =>
    {
        return getStates(country);
    });

    ipcMain.handle(IpcConstants.GetRegions, (_event, country, state) =>
    {
        return getRegions(country, state);
    });
}

// While it's possible to just run these on require and not need the extra function only to set up, we
// have it so they don't run on the tests, which won't include ipcMain and would fail
function setupWorkdayWaiverHandlers()
{
    setupWorkdayWaiverStoreHandlers();
    setupWorkdayHolidaysHandlers();
}

export {
    getAllHolidays,
    getCountries,
    getRegions,
    getStates,
    setupWorkdayWaiverHandlers,
};
