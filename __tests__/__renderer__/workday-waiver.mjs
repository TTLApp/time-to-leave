'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';
import Holidays from 'date-holidays';
import Store from 'electron-store';
import { JSDOM } from 'jsdom';
import { stub } from 'sinon';
import path from 'path';

import { rootDir } from '../../js/app-config.mjs';
import { workdayWaiverApi } from '../../renderer/preload-scripts/workday-waiver-api.mjs';
import {
    getAllHolidays,
    getCountries,
    getRegions,
    getStates
} from '../../main/workday-waiver-aux.mjs';
import {
    getDefaultPreferences,
    getUserPreferences,
    savePreferences,
    showDay,
} from '../../js/user-preferences.mjs';
import i18nTranslator from '../../renderer/i18n-translator.js';

const waiverStore = new Store({name: 'waived-workdays'});

const document = window.document;

let htmlDoc = undefined;

// Functions from workday-waiver.js that will be imported dynamically
let addWaiver;
let populateList;
let setDates;
let setHours;
let toggleAddButton;
let deleteEntryOnClick;
let populateCountry;
let populateState;
let populateCity;
let populateYear;
let getHolidays;
let iterateOnHolidays;
let addHolidayToList;
let clearTable;
let clearHolidayTable;
let clearWaiverList;
let loadHolidaysTable;
let initializeHolidayInfo;

async function prepareMockup()
{
    waiverStore.clear();
    if (htmlDoc === undefined)
    {
        const workdayWaiverHtml = path.join(rootDir, '/src/workday-waiver.html');
        htmlDoc = await JSDOM.fromFile(workdayWaiverHtml, 'text/html');
    }
    window.document.documentElement.innerHTML = htmlDoc.window.document.documentElement.innerHTML;
    await populateList();
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
    const waivedWorkdays = await window.rendererApi.getWaiverStoreContents();
    assert.strictEqual(waivedWorkdays.size, expected);
    assert.strictEqual($('#waiver-list-table tbody')[0].rows.length, expected);
}

describe('Test Workday Waiver Window', function()
{
    before(async() =>
    {
        stub(i18nTranslator, 'translatePage').returnsThis();
        stub(i18nTranslator, 'getTranslationInLanguageData').returnsThis();

        // Using dynamic imports because when the file is imported a $() callback is triggered and
        // methods must be mocked before-hand
        const file = await import('../../src/workday-waiver.js');
        addWaiver = file.addWaiver;
        populateList = file.populateList;
        setDates = file.setDates;
        setHours = file.setHours;
        toggleAddButton = file.toggleAddButton;
        deleteEntryOnClick = file.deleteEntryOnClick;
        populateCountry = file.populateCountry;
        populateState = file.populateState;
        populateCity = file.populateCity;
        populateYear = file.populateYear;
        getHolidays = file.getHolidays;
        iterateOnHolidays = file.iterateOnHolidays;
        addHolidayToList = file.addHolidayToList;
        clearTable = file.clearTable;
        clearHolidayTable = file.clearHolidayTable;
        clearWaiverList = file.clearWaiverList;
        loadHolidaysTable = file.loadHolidaysTable;
        initializeHolidayInfo = file.initializeHolidayInfo;

        // APIs from the preload script of the workday waiver window
        window.workdayWaiverApi = workdayWaiverApi;
        window.rendererApi = {};

        // Mocking with the actual access to store that main would have
        window.rendererApi.getWaiverStoreContents = () => { return new Promise((resolve) => resolve(waiverStore.store)); };
        window.workdayWaiverApi.setWaiver = (key, contents) =>
        {
            return new Promise((resolve) =>
            {
                waiverStore.set(key, contents);
                resolve(true);
            });
        };
        window.workdayWaiverApi.hasWaiver = (key) => { return new Promise((resolve) => resolve(waiverStore.has(key))); };
        window.workdayWaiverApi.deleteWaiver = (key) =>
        {
            return new Promise((resolve) =>
            {
                waiverStore.delete(key);
                resolve(true);
            });
        };
        window.workdayWaiverApi.getWaiverDay = () =>
        {
            return new Promise((resolve) =>
            {
                resolve(global.waiverDay);
            });
        };

        window.workdayWaiverApi.getHolidays = (country, state, city, year) =>
        {
            return new Promise((resolve) =>
            {
                resolve(getAllHolidays(country, state, city, year));
            });
        };

        window.workdayWaiverApi.getCountries = () =>
        {
            return new Promise((resolve) =>
            {
                resolve(getCountries());
            });
        };

        window.workdayWaiverApi.getStates = (country) =>
        {
            return new Promise((resolve) =>
            {
                resolve(getStates(country));
            });
        };

        window.workdayWaiverApi.getRegions = (country, state) =>
        {
            return new Promise((resolve) =>
            {
                resolve(getRegions(country, state));
            });
        };

        window.rendererApi.getLanguageDataPromise = () =>
        {
            return new Promise((resolve) => resolve({
                'language': 'en',
                'data': {}
            }));
        };
        window.rendererApi.showDialog = () =>
        {
            return new Promise((resolve) =>
            {
                resolve({ response: 0 });
            });
        };
        window.rendererApi.getOriginalUserPreferences = () =>
        {
            return getUserPreferences();
        };
        window.rendererApi.showDay = showDay;

        window.workdayWaiverApi.showDialogSync = () => {};

        // Making sure the preferences are the default so the tests work as expected
        savePreferences(getDefaultPreferences());
    });

    describe('Adding new waivers update the db and the page', function()
    {
        beforeEach(async() =>
        {
            await prepareMockup();
        });

        it('One Waiver', async() =>
        {
            testWaiverCount(0);
            await addTestWaiver('2020-07-16', 'some reason');
            testWaiverCount(1);
        });

        it('One + two Waivers', async() =>
        {
            //Start with none
            testWaiverCount(0);
            // Add one waiver and update the table on the page
            await addTestWaiver('2020-07-16', 'some reason');
            populateList();
            testWaiverCount(1);

            // Add two more waiver
            await addTestWaiver('2020-07-20', 'some other reason');
            await addTestWaiver('2020-07-21', 'yet another reason');
            testWaiverCount(3);
        });

        it('Table is sorted by Date', async() =>
        {
            //add some waivers

            await addTestWaiver('2021-07-20', 'some other reason');
            await addTestWaiver('2021-07-16', 'some reason');
            await addTestWaiver('2021-07-21', 'yet another reason');

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
        it('Time is not valid', async() =>
        {
            $('#hours').val('not a time');
            const waiver = await addWaiver();
            assert.strictEqual(waiver, false);
        });

        it('End date less than start date', async() =>
        {
            setHours('08:00');
            $('#start-date').val('2020-07-20');
            $('#end-date').val('2020-07-19');
            const waiver = await addWaiver();
            assert.strictEqual(waiver, false);
        });

        it('Add waiver with the same date', async() =>
        {
            await addTestWaiver('2020-07-16', 'some reason');
            const waiver = await addTestWaiver('2020-07-16', 'some reason');
            assert.strictEqual(waiver, false);
        });

        it('Range does not contain any working day', async() =>
        {
            const waiver = await addTestWaiver('2020-13-01', 'some reason');
            assert.strictEqual(waiver, false);
        });
    });

    describe('Toggle add button', () =>
    {
        let btn;
        const btnId = 'testingBtn';
        before(() =>
        {
            btn = document.createElement('button');
            btn.id = btnId;
            document.body.appendChild(btn);
        });

        it('Testing button exists', () =>
        {
            const btnLength = document.querySelectorAll(`#${btnId}`).length;
            assert.strictEqual(btnLength > 0, true);
        });

        it('Make disabled', () =>
        {
            toggleAddButton(btnId, false);
            const disabled = btn.getAttribute('disabled');
            assert.strictEqual(disabled, 'disabled');
        });

        it('Make not disabled', () =>
        {
            toggleAddButton(btnId, true);
            const notDisabled = btn.getAttribute('disabled');
            assert.strictEqual(notDisabled, null);
        });

        after(() =>
        {
            document.body.removeChild(btn);
        });
    });

    describe('Delete waiver', () =>
    {
        it('Waiver was deleted', async() =>
        {
            await prepareMockup();
            await addTestWaiver('2020-07-16', 'some reason');
            const deleteBtn = document.querySelectorAll('#waiver-list-table .delete-btn')[0];
            await deleteEntryOnClick({target: deleteBtn});
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

        it('Country was populated', async() =>
        {
            const countriesLength = Object.keys(hd.getCountries()).length;
            assert.strictEqual($('#country option').length, 0);
            await populateCountry();
            assert.strictEqual($('#country option').length, countriesLength + 1);
        });

        it('States was populated', async() =>
        {
            const statesLength = Object.keys(hd.getStates('US')).length;
            assert.strictEqual($('#state option').length, 0);
            await populateState('US');
            assert.strictEqual($('#state option').length, statesLength + 1);
            assert.strictEqual($('#state').css('display'), 'inline-block');
            assert.strictEqual($('#holiday-state').css('display'), 'table-row');
        });

        it('States was not populated', async() =>
        {
            assert.strictEqual($('#state option').length, 0);
            await populateState('CN');
            assert.strictEqual($('#state option').length, 0);
            assert.strictEqual($('#state').css('display'), 'none');
            assert.strictEqual($('#holiday-state').css('display'), 'none');
        });

        it('City was populated', async() =>
        {
            const regionsLength = Object.keys(hd.getRegions('US', 'CA')).length;
            assert.strictEqual($('#city option').length, 0);
            await populateCity('US', 'CA');
            assert.strictEqual($('#city option').length, regionsLength + 1);
            assert.strictEqual($('#city').css('display'), 'inline-block');
            assert.strictEqual($('#holiday-city').css('display'), 'table-row');
        });

        it('City was not populated', async() =>
        {
            assert.strictEqual($('#city option').length, 0);
            await populateCity('US', 'AL');
            assert.strictEqual($('#city option').length, 0);
            assert.strictEqual($('#city').css('display'), 'none');
            assert.strictEqual($('#holiday-city').css('display'), 'none');
        });

        it('Year was populated', () =>
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

        it('Get holidays with no country', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            assert.strictEqual($('#year option').length, 1);
            const holidays = await getHolidays();
            assert.deepStrictEqual(holidays, []);
        });

        it('Get country holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            assert.strictEqual($('#country option').length, 1);
            hd.init(country);
            const holidays = await getHolidays();
            assert.deepStrictEqual(holidays, hd.getHolidays(year));
        });

        it('Get country with state holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            assert.strictEqual($('#state option').length, 1);
            hd.init(country, state);
            const holidays = await getHolidays();
            assert.deepStrictEqual(holidays, hd.getHolidays(year));
        });

        it('Get country with state and city holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            $('#city').append($('<option selected></option>').val(city).html(city));
            assert.strictEqual($('#state option').length, 1);
            hd.init(country, state, city);
            const holidays = await getHolidays();
            assert.deepStrictEqual(holidays, hd.getHolidays(year));
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

        it('Iterate on holidays', async() =>
        {
            $('#year').append($('<option selected></option>').val(year).html(year));
            $('#country').append($('<option selected></option>').val(country).html(country));
            $('#state').append($('<option selected></option>').val(state).html(state));
            const holidays = await getHolidays();
            const holidaysLength = holidays.length;
            const mockCallback = stub();
            await iterateOnHolidays(mockCallback);
            assert.strictEqual(mockCallback.getCalls().length, holidaysLength);
        });

        it('Do not load holidays table on empty holidays', () =>
        {
            loadHolidaysTable();
            const holidaysLength = 0;
            const rowLength = $('#holiday-list-table tbody tr').length;
            assert.strictEqual($('#holiday-list-table').css('display'), 'table');
            assert.strictEqual(holidaysLength, rowLength);
        });

        it('Load holidays table', async() =>
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

        it('Holiday info initialize', async() =>
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

        it('Holiday added working day, no conflicts', () =>
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
            assert.strictEqual(fourthCell, fourthCellContent);
        });

        it('Holiday added not working day, no conflicts', () =>
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
            assert.strictEqual(fourthCell, fourthCellContent);
        });

        it('Holiday added not working day, with conflicts', () =>
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
            assert.strictEqual(fourthCell, fourthCellContent);
        });
    });

    describe('Clearing the table', () =>
    {
        beforeEach(async() =>
        {
            await prepareMockup();
            await addTestWaiver('2020-07-20', 'some other reason');
            await addTestWaiver('2020-07-21', 'yet another reason');
            addHolidayToList('test day', 'no reason');
        });

        it('Clear table by JQuery object', () =>
        {
            const tableId = 'waiver-list-table';
            let rowLength = $(`#${tableId} tbody tr`).length;
            assert.strictEqual(rowLength, 2);
            clearTable($(`#${tableId}`));
            rowLength = $(`#${tableId} tbody tr`).length;
            assert.strictEqual(rowLength, 0);
        });

        it('Clear holiday table', () =>
        {
            let rowLength = $('#holiday-list-table tbody tr').length;
            assert.strictEqual(rowLength, 1);
            clearHolidayTable();
            rowLength = $('#holiday-list-table tbody tr').length;
            assert.strictEqual(rowLength, 0);
        });

        it('Clear waiver table', () =>
        {
            let rowLength = $('#waiver-list-table tbody tr').length;
            assert.strictEqual(rowLength, 2);
            clearWaiverList();
            rowLength = $('#waiver-list-table tbody tr').length;
            assert.strictEqual(rowLength, 0);
        });
    });

    after(() =>
    {
        i18nTranslator.translatePage.restore();
        i18nTranslator.getTranslationInLanguageData.restore();
    });
});
