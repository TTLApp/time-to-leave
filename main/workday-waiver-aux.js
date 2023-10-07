'use strict';

// This file intentionally uses 'require' and is used without esm
// because 'date-holidays' doesn't play nice with esm

const { ipcMain } = require('electron');

const Store = require('electron-store');
const waiverStore = new Store({name: 'waived-workdays'});

const Holidays = require('date-holidays');
const hd = new Holidays();

// Waiver Store handlers

function getWaiverStore()
{
    return waiverStore.store;
}

function setupWorkdayWaiverStoreHandlers()
{
    ipcMain.handle('GET_WAIVER_STORE_CONTENTS', () =>
    {
        return getWaiverStore();
    });

    ipcMain.handle('SET_WAIVER', (_event, key, contents) =>
    {
        waiverStore.set(key, contents);
        return true;
    });

    ipcMain.handle('HAS_WAIVER', (_event, key) =>
    {
        return waiverStore.has(key);
    });

    ipcMain.handle('DELETE_WAIVER', (_event, key) =>
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
    ipcMain.handle('GET_HOLIDAYS', (_event, country, state, city, year) =>
    {
        return getAllHolidays(country, state, city, year);
    });

    ipcMain.handle('GET_COUNTRIES', () =>
    {
        return getCountries();
    });

    ipcMain.handle('GET_STATES', (_event, country) =>
    {
        return getStates(country);
    });

    ipcMain.handle('GET_REGIONS', (_event, country, state) =>
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

module.exports = {
    getAllHolidays,
    getCountries,
    getRegions,
    getStates,
    setupWorkdayWaiverHandlers
};
