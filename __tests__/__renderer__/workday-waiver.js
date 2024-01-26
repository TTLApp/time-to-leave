/* eslint-disable no-undef */
'use strict';

const assert = require('assert');
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
const Holidays = require('date-holidays');
/* eslint-disable-next-line no-global-assign */
window.$ = require('jquery');
const {
    addWaiver,
    populateList,
    setDates,
    setHours,
    toggleAddButton,
    deleteEntryOnClick,
    populateCountry,
    populateState,
    populateCity,
    populateYear,
    getHolidays,
    iterateOnHolidays,
    addHolidayToList,
    clearTable,
    clearHolidayTable,
    clearWaiverList,
    loadHolidaysTable,
    initializeHolidayInfo,
    refreshDataForTest
} = require('../../src/workday-waiver');
const { workdayWaiverApi } = require('../../renderer/preload-scripts/workday-waiver-api.js');
const {
    getAllHolidays,
    getCountries,
    getRegions,
    getStates
} = require('../../main/workday-waiver-aux.js');
const {
    defaultPreferences,
    getUserPreferencesPromise,
    savePreferences,
} = require('../../js/user-preferences.js');

jest.mock('../../renderer/i18n-translator.js', () => ({
    translatePage: jest.fn().mockReturnThis(),
    getTranslationInLanguageData: jest.fn().mockReturnThis()
}));

const waiverStore = new Store({name: 'waived-workdays'});

// APIs from the preload script of the workday waiver window
window.mainApi = workdayWaiverApi;

// Mocking with the actual access to store that main would have
window.mainApi.getWaiverStoreContents = () => { return new Promise((resolve) => resolve(waiverStore.store)); };
window.mainApi.setWaiver = (key, contents) =>
{
    return new Promise((resolve) =>
    {
        waiverStore.set(key, contents);
        resolve(true);
    });
};
window.mainApi.hasWaiver = (key) => { return new Promise((resolve) => resolve(waiverStore.has(key))); };
window.mainApi.deleteWaiver = (key) =>
{
    return new Promise((resolve) =>
    {
        waiverStore.delete(key);
        resolve(true);
    });
};

window.mainApi.getHolidays = (country, state, city, year) =>
{
    return new Promise((resolve) =>
    {
        resolve(getAllHolidays(country, state, city, year));
    });
};

window.mainApi.getCountries = () =>
{
    return new Promise((resolve) =>
    {
        resolve(getCountries());
    });
};

window.mainApi.getStates = (country) =>
{
    return new Promise((resolve) =>
    {
        resolve(getStates(country));
    });
};

window.mainApi.getRegions = (country, state) =>
{
    return new Promise((resolve) =>
    {
        resolve(getRegions(country, state));
    });
};

window.mainApi.showDialogSync = () =>
{
    return new Promise((resolve) =>
    {
        resolve({ response: 0 });
    });
};

window.mainApi.getUserPreferences = () =>
{
    const preferencesFilePathPromise = new Promise((resolve) =>
    {
        const userDataPath = app.getPath('userData');
        resolve(path.join(userDataPath, 'preferences.json'));
    });
    return getUserPreferencesPromise(preferencesFilePathPromise);
};

const languageData = {'language': 'en', 'data': {'dummy_string': 'dummy_string_translated'}};

async function prepareMockup()
{
    waiverStore.clear();
    const workdayWaiverHtml = path.join(__dirname, '../../src/workday-waiver.html');
    const content = fs.readFileSync(workdayWaiverHtml);
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(content, 'text/html');
    document.body.innerHTML = htmlDoc.body.innerHTML;
    await populateList();
    refreshDataForTest(languageData);
}

async function addTestWaiver(day, reason)
{
    $('#reason').val(reason);
    setDates(day);
    setHours('08:00');
    return addWaiver();
}

async function testWaiverCount(expected)
{
    const waivedWorkdays = await window.mainApi.getWaiverStoreContents();
    assert.strictEqual(waivedWorkdays.size, expected);
    assert.strictEqual($('#waiver-list-table tbody')[0].rows.length, expected);
}

jest.mock('../../js/window-aux.cjs');

describe('Test Workday Waiver Window', function()
{
    process.env.NODE_ENV = 'test';

    beforeAll(() =>
    {
        // Making sure the preferences are the default so the tests work as expected
        savePreferences(defaultPreferences);
    });

    describe('Adding new waivers update the db and the page', function()
    {
        beforeEach(async() =>
        {
            await prepareMockup();
        });

        test('One Waiver', () =>
        {
            testWaiverCount(0);
            addTestWaiver('2020-07-16', 'some reason');
            testWaiverCount(1);
        });

        test('One + two Waivers', () =>
        {
            //Start with none
            testWaiverCount(0);
            // Add one waiver and update the table on the page
            addTestWaiver('2020-07-16', 'some reason');
            populateList();
            testWaiverCount(1);

            // Add two more waiver
            addTestWaiver('2020-07-20', 'some other reason');
            addTestWaiver('2020-07-21', 'yet another reason');
            testWaiverCount(3);
        });

        test('Table is sorted by Date', ()=>
        {
            //add some waivers

            addTestWaiver('2021-07-20', 'some other reason');
            addTestWaiver('2021-07-16', 'some reason');
            addTestWaiver('2021-07-21', 'yet another reason');

            let isSorted = true;
            const rows = $('#waiver-list-table tbody  tr').get();
            for (let i = 1; i < rows.length; i++)
            {
                const A = $(rows[i-1]).children('td').eq(1).text();
                const B = $(rows[i]).children('td').eq(1).text();
                const d1 = new Date(A);
                const d2 = new Date(B);

                if (d1 < d2)
                {
                    isSorted = false;
                    break;
                }
            }
            assert.strictEqual(isSorted, true);

        });
        test('Time is not valid', async() =>
        {
            $('#hours').val('not a time');
            const waiver = await addWaiver();
            assert.strictEqual(waiver, false);
        });

        test('End date less than start date', async() =>
        {
            setHours('08:00');
            $('#start-date').val('2020-07-20');
            $('#end-date').val('2020-07-19');
            const waiver = await addWaiver();
            assert.strictEqual(waiver, false);
        });

        test('Add waiver with the same date', async() =>
        {
            addTestWaiver('2020-07-16', 'some reason');
            const waiver = await addTestWaiver('2020-07-16', 'some reason');
            assert.strictEqual(waiver, undefined);
        });

        test('Range does not contain any working day', async() =>
        {
            const waiver = await addTestWaiver('2020-13-01', 'some reason');
            assert.strictEqual(waiver, false);
        });
    });

    describe('Toggle add button', () =>
    {
        let btn;
        const btnId = 'testingBtn';
        beforeAll(() =>
        {
            btn = document.createElement('button');
            btn.id = btnId;
            document.body.appendChild(btn);
        });

        test('Testing button exists', () =>
        {
            const btnLength = document.querySelectorAll(`#${btnId}`).length;
            assert.strictEqual(btnLength > 0, true);
        });

        test('Make disabled', () =>
        {
            toggleAddButton(btnId, false);
            const disabled = btn.getAttribute('disabled');
            assert.strictEqual(disabled, 'disabled');
        });

        test('Make not disabled', () =>
        {
            toggleAddButton(btnId, true);
            const notDisabled = btn.getAttribute('disabled');
            assert.strictEqual(notDisabled, null);
        });

        afterAll(() =>
        {
            document.removeChild(btn);
        });
    });

    describe('Delete waiver', () =>
    {
        test('Waiver was deleted', async() =>
        {
            await prepareMockup();
            addTestWaiver('2020-07-16', 'some reason');
            const deleteBtn = document.querySelectorAll('#waiver-list-table .delete-btn')[0];
            deleteEntryOnClick({target: deleteBtn});
            const length = document.querySelectorAll('#waiver-list-table .delete-btn').length;
            assert.strictEqual(length, 0);
        });
    });

    describe('Populating', () =>
    {
        const hd = new Holidays();

        beforeEach(async() =>
        {
            await prepareMockup();
        });

        test('Country was populated', async() =>
        {
            const countriesLength = Object.keys(hd.getCountries()).length;
            assert.strictEqual($('#country option').length, 0);
            await populateCountry();
            assert.strictEqual($('#country option').length, countriesLength + 1);
        });

        test('States was populated', async() =>
        {
            const statesLength = Object.keys(hd.getStates('US')).length;
            assert.strictEqual($('#state option').length, 0);
            await populateState('US');
            assert.strictEqual($('#state option').length, statesLength + 1);
            assert.strictEqual($('#state').css('display'), 'inline-block');
            assert.strictEqual($('#holiday-state').css('display'), 'table-row');
        });

        test('States was not populated', async() =>
        {
            assert.strictEqual($('#state option').length, 0);
            await populateState('CN');
            assert.strictEqual($('#state option').length, 0);
            assert.strictEqual($('#state').css('display'), 'none');
            assert.strictEqual($('#holiday-state').css('display'), 'none');
        });

        test('City was populated', async() =>
        {
            const regionsLength = Object.keys(hd.getRegions('US', 'CA')).length;
            assert.strictEqual($('#city option').length, 0);
            await populateCity('US', 'CA');
            assert.strictEqual($('#city option').length, regionsLength + 1);
            assert.strictEqual($('#city').css('display'), 'inline-block');
            assert.strictEqual($('#holiday-city').css('display'), 'table-row');
        });

        test('City was not populated', async() =>
        {
            assert.strictEqual($('#city option').length, 0);
            await populateCity('US', 'AL');
            assert.strictEqual($('#city option').length, 0);
            assert.strictEqual($('#city').css('display'), 'none');
            assert.strictEqual($('#holiday-city').css('display'), 'none');
        });

        test('Year was populated', () =>
        {
            populateYear();
            const thisYear = new Date().getFullYear();
            const values = document.querySelectorAll('#year option');
            assert.strictEqual($('#year option').length, 10);
            for (let i = 0; i < 10; i++)
            {
                assert.strictEqual(values[i].value, `${thisYear + i}`);
            }
        });
    });

    describe('Get holidays feature', () =>
    {
        const hd = new Holidays();
        const year = '2020';
        const country = 'US';
        const state = 'CA';
        const city = 'LA';

        beforeEach(async() =>
        {
            await prepareMockup();
        });

        test('Get holidays with no country', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            assert.strictEqual($('#year option').length, 1);
            const holidays = await getHolidays();
            expect(holidays).toEqual([]);
        });

        test('Get country holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            assert.strictEqual($('#country option').length, 1);
            hd.init(country);
            const holidays = await getHolidays();
            expect(holidays).toEqual(hd.getHolidays(year));
        });

        test('Get country with state holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            assert.strictEqual($('#state option').length, 1);
            hd.init(country, state);
            const holidays = await getHolidays();
            expect(holidays).toEqual(hd.getHolidays(year));
        });

        test('Get country with state and city holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            $('#city').append($('<option selected></option>').val(city).html(city));
            assert.strictEqual($('#state option').length, 1);
            hd.init(country, state, city);
            const holidays = await getHolidays();
            expect(holidays).toEqual(hd.getHolidays(year));
        });
    });

    describe('Holidays table', () =>
    {
        const year = '2020';
        const country = 'US';
        const state = 'CA';

        beforeEach(async() =>
        {
            await prepareMockup();
        });

        test('Iterate on holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            const holidays = await getHolidays();
            const holidaysLength = holidays.length;
            const mockCallback = jest.fn();
            await iterateOnHolidays(mockCallback);
            expect(mockCallback).toBeCalledTimes(holidaysLength);
        });

        test('Do not load holidays table on empty holidays', () =>
        {
            loadHolidaysTable();
            const holidaysLength = 0;
            const rowLength = $('#holiday-list-table tbody tr').length;
            assert.strictEqual($('#holiday-list-table').css('display'), 'table');
            assert.strictEqual(holidaysLength, rowLength);
        });

        test('Load holidays table', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            await loadHolidaysTable();
            const holidays = await getHolidays();
            const holidaysLength = holidays.length;
            const rowLength = $('#holiday-list-table tbody tr').length;
            assert.strictEqual($('#holiday-list-table').css('display'), 'table');
            assert.strictEqual(holidaysLength, rowLength);
        });

        test('Holiday info initialize', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            await initializeHolidayInfo();
            assert.strictEqual($('#holiday-list-table').css('display'), 'none');
            assert.strictEqual($('#state').css('display'), 'none');
            assert.strictEqual($('#holiday-state').css('display'), 'none');
            assert.strictEqual($('#city').css('display'), 'none');
            assert.strictEqual($('#holiday-city').css('display'), 'none');
        });
    });

    describe('Add holiday to list', () =>
    {
        beforeEach(async() =>
        {
            await prepareMockup();
        });

        test('Holiday added working day, no conflicts', () =>
        {
            const day = 'test day';
            const reason = 'test reason';
            addHolidayToList(day, reason);
            const table = $('#holiday-list-table tbody');
            const rowsLength = table.find('tr').length;
            assert.strictEqual(rowsLength, 1);
            const firstCell = table.find('td')[0].innerHTML;
            const secondCell = table.find('td')[1].innerHTML;
            const thirdCell = table.find('td')[2].innerHTML;
            const fourthCell = table.find('td')[4].innerHTML;
            const fourthCellContent = `<label class="switch"><input type="checkbox" checked="" name="import-${day}" id="import-${day}"><span class="slider round"></span></label>`;
            assert.strictEqual(firstCell, day);
            assert.strictEqual(secondCell, reason);
            assert.strictEqual(thirdCell, 'undefined');
            expect(fourthCell).toEqual(fourthCellContent);
        });

        test('Holiday added not working day, no conflicts', () =>
        {
            const day = 'test day';
            const reason = 'test reason';
            const workingDay = 'No';
            addHolidayToList(day, reason, workingDay);
            const table = $('#holiday-list-table tbody');
            const rowsLength = table.find('tr').length;
            assert.strictEqual(rowsLength, 1);
            const firstCell = table.find('td')[0].innerHTML;
            const secondCell = table.find('td')[1].innerHTML;
            const thirdCell = table.find('td')[2].innerHTML;
            const fourthCell = table.find('td')[4].innerHTML;
            const fourthCellContent = `<label class="switch"><input type="checkbox" name="import-${day}" id="import-${day}"><span class="slider round"></span></label>`;
            assert.strictEqual(firstCell, day);
            assert.strictEqual(secondCell, reason);
            assert.strictEqual(thirdCell, workingDay);
            expect(fourthCell).toEqual(fourthCellContent);
        });

        test('Holiday added not working day, with conflicts', () =>
        {
            const day = 'test day';
            const reason = 'test reason';
            const workingDay = 'No';
            const conflicts = '<span>this is a conflict</span>';
            addHolidayToList(day, reason, workingDay, conflicts);
            const table = $('#holiday-list-table tbody');
            const rowsLength = table.find('tr').length;
            assert.strictEqual(rowsLength, 1);
            const firstCell = table.find('td')[0].innerHTML;
            const secondCell = table.find('td')[1].innerHTML;
            const thirdCell = table.find('td')[2].innerHTML;
            const conflictsCell = table.find('td')[3].innerHTML;
            const fourthCell = table.find('td')[4].innerHTML;
            const fourthCellContent = `<label class="switch"><input type="checkbox" name="import-${day}" id="import-${day}"><span class="slider round"></span></label>`;
            assert.strictEqual(firstCell, day);
            assert.strictEqual(secondCell, reason);
            assert.strictEqual(thirdCell, workingDay);
            assert.strictEqual(conflictsCell, conflicts);
            expect(fourthCell).toEqual(fourthCellContent);
        });
    });

    describe('Clearing the table', () =>
    {
        beforeEach(async() =>
        {
            await prepareMockup();
            addTestWaiver('2020-07-20', 'some other reason');
            addTestWaiver('2020-07-21', 'yet another reason');
            addHolidayToList('test day', 'no reason');
        });

        test('Clear table by JQuery object', () =>
        {
            const tableId = 'waiver-list-table';
            let rowLength = $(`#${tableId} tbody tr`).length;
            assert.strictEqual(rowLength, 2);
            clearTable($(`#${tableId}`));
            rowLength = $(`#${tableId} tbody tr`).length;
            assert.strictEqual(rowLength, 0);
        });

        test('Clear holiday table', () =>
        {
            let rowLength = $('#holiday-list-table tbody tr').length;
            assert.strictEqual(rowLength, 1);
            clearHolidayTable();
            rowLength = $('#holiday-list-table tbody tr').length;
            assert.strictEqual(rowLength, 0);
        });

        test('Clear waiver table', () =>
        {
            let rowLength = $('#waiver-list-table tbody tr').length;
            assert.strictEqual(rowLength, 2);
            clearWaiverList();
            rowLength = $('#waiver-list-table tbody tr').length;
            assert.strictEqual(rowLength, 0);
        });
    });
});
