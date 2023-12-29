/* eslint-disable no-undef */
'use strict';

const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
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
    expect(waivedWorkdays.size).toBe(expected);
    expect($('#waiver-list-table tbody')[0].rows.length).toBe(expected);
}

jest.mock('../../js/window-aux.js');

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
            expect(isSorted).toBe(true);

        });
        test('Time is not valid', async() =>
        {
            $('#hours').val('not a time');
            const waiver = await addWaiver();
            expect(waiver).toBeFalsy();
        });

        test('End date less than start date', async() =>
        {
            setHours('08:00');
            $('#start-date').val('2020-07-20');
            $('#end-date').val('2020-07-19');
            const waiver = await addWaiver();
            expect(waiver).toBeFalsy();
        });

        test('Add waiver with the same date', async() =>
        {
            addTestWaiver('2020-07-16', 'some reason');
            const waiver = await addTestWaiver('2020-07-16', 'some reason');
            expect(waiver).toBeFalsy();
        });

        test('Range does not contain any working day', async() =>
        {
            const waiver = await addTestWaiver('2020-13-01', 'some reason');
            expect(waiver).toBeFalsy();
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

        test('Testing button is exist', () =>
        {
            const exists = document.querySelectorAll(`#${btnId}`).length;
            expect(exists).toBeTruthy();
        });

        test('Make disabled', () =>
        {
            toggleAddButton(btnId, false);
            const disabled = btn.getAttribute('disabled');
            expect(disabled).toBe('disabled');
        });

        test('Make not disabled', () =>
        {
            toggleAddButton(btnId, true);
            const notDisabled = btn.getAttribute('disabled');
            expect(notDisabled).toBeNull();
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
            expect(length).toBe(0);
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
            expect($('#country option').length).toBe(0);
            await populateCountry();
            expect($('#country option').length).toBe(countriesLength + 1);
        });

        test('States was populated', async() =>
        {
            const statesLength = Object.keys(hd.getStates('US')).length;
            expect($('#state option').length).toBe(0);
            await populateState('US');
            expect($('#state option').length).toBe(statesLength + 1);
            expect($('#state').css('display')).toBe('inline-block');
            expect($('#holiday-state').css('display')).toBe('table-row');
        });

        test('States was not populated', async() =>
        {
            expect($('#state option').length).toBe(0);
            await populateState('CN');
            expect($('#state option').length).toBe(0);
            expect($('#state').css('display')).toBe('none');
            expect($('#holiday-state').css('display')).toBe('none');
        });

        test('City was populated', async() =>
        {
            const regionsLength = Object.keys(hd.getRegions('US', 'CA')).length;
            expect($('#city option').length).toBe(0);
            await populateCity('US', 'CA');
            expect($('#city option').length).toBe(regionsLength + 1);
            expect($('#city').css('display')).toBe('inline-block');
            expect($('#holiday-city').css('display')).toBe('table-row');
        });

        test('City was not populated', async() =>
        {
            expect($('#city option').length).toBe(0);
            await populateCity('US', 'AL');
            expect($('#city option').length).toBe(0);
            expect($('#city').css('display')).toBe('none');
            expect($('#holiday-city').css('display')).toBe('none');
        });

        test('Year was populated', () =>
        {
            populateYear();
            const thisYear = new Date().getFullYear();
            const values = document.querySelectorAll('#year option');
            expect($('#year option').length).toBe(10);
            for (let i = 0; i < 10; i++)
            {
                expect(values[i].value).toBe(`${thisYear + i}`);
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
            expect($('#year option').length).toBe(1);
            const holidays = await getHolidays();
            expect(holidays).toEqual([]);
        });

        test('Get country holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            expect($('#country option').length).toBe(1);
            hd.init(country);
            const holidays = await getHolidays();
            expect(holidays).toEqual(hd.getHolidays(year));
        });

        test('Get country with state holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            expect($('#state option').length).toBe(1);
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
            expect($('#state option').length).toBe(1);
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
            expect($('#holiday-list-table').css('display')).toBe('table');
            expect(holidaysLength).toBe(rowLength);
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
            expect($('#holiday-list-table').css('display')).toBe('table');
            expect(holidaysLength).toBe(rowLength);
        });

        test('Holiday info initialize', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            await initializeHolidayInfo();
            expect($('#holiday-list-table').css('display')).toBe('none');
            expect($('#state').css('display')).toBe('none');
            expect($('#holiday-state').css('display')).toBe('none');
            expect($('#city').css('display')).toBe('none');
            expect($('#holiday-city').css('display')).toBe('none');
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
            expect(rowsLength).toBe(1);
            const firstCell = table.find('td')[0].innerHTML;
            const secondCell = table.find('td')[1].innerHTML;
            const thirdCell = table.find('td')[2].innerHTML;
            const fourthCell = table.find('td')[4].innerHTML;
            const fourthCellContent = `<label class="switch"><input type="checkbox" checked="" name="import-${day}" id="import-${day}"><span class="slider round"></span></label>`;
            expect(firstCell).toBe(day);
            expect(secondCell).toBe(reason);
            expect(thirdCell).toBe('undefined');
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
            expect(rowsLength).toBe(1);
            const firstCell = table.find('td')[0].innerHTML;
            const secondCell = table.find('td')[1].innerHTML;
            const thirdCell = table.find('td')[2].innerHTML;
            const fourthCell = table.find('td')[4].innerHTML;
            const fourthCellContent = `<label class="switch"><input type="checkbox" name="import-${day}" id="import-${day}"><span class="slider round"></span></label>`;
            expect(firstCell).toBe(day);
            expect(secondCell).toBe(reason);
            expect(thirdCell).toBe(workingDay);
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
            expect(rowsLength).toBe(1);
            const firstCell = table.find('td')[0].innerHTML;
            const secondCell = table.find('td')[1].innerHTML;
            const thirdCell = table.find('td')[2].innerHTML;
            const conflictsCell = table.find('td')[3].innerHTML;
            const fourthCell = table.find('td')[4].innerHTML;
            const fourthCellContent = `<label class="switch"><input type="checkbox" name="import-${day}" id="import-${day}"><span class="slider round"></span></label>`;
            expect(firstCell).toBe(day);
            expect(secondCell).toBe(reason);
            expect(thirdCell).toBe(workingDay);
            expect(conflictsCell).toBe(conflicts);
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
            expect(rowLength).toBe(2);
            clearTable($(`#${tableId}`));
            rowLength = $(`#${tableId} tbody tr`).length;
            expect(rowLength).toBe(0);
        });

        test('Clear holiday table', () =>
        {
            let rowLength = $('#holiday-list-table tbody tr').length;
            expect(rowLength).toBe(1);
            clearHolidayTable();
            rowLength = $('#holiday-list-table tbody tr').length;
            expect(rowLength).toBe(0);
        });

        test('Clear waiver table', () =>
        {
            let rowLength = $('#waiver-list-table tbody tr').length;
            expect(rowLength).toBe(2);
            clearWaiverList();
            rowLength = $('#waiver-list-table tbody tr').length;
            expect(rowLength).toBe(0);
        });
    });
});
