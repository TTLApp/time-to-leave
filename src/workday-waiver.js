'use strict';

import { applyTheme } from '../renderer/themes.js';

const { ipcRenderer, remote } = require('electron');
const Store = require('electron-store');
const Holidays = require('date-holidays');

import { getUserPreferences, showDay } from '../js/user-preferences.js';
import { validateTime, diffDays } from '../js/time-math.js';
import { getDateStr } from '../js/date-aux.js';
import { bindDevToolsShortcut, showAlert, showDialog } from '../js/window-aux.js';
import { getTranslationInLanguageData, translatePage } from '../renderer/i18n-translator.js';

const $ = require('jquery');

const waiverStore = new Store({name: 'waived-workdays'});
const hd = new Holidays();

let languageData;

function getTranslation(code)
{
    return getTranslationInLanguageData(languageData.data, code);
}

function refreshDataForTest(data)
{
    languageData = data;
}

function setDates(day)
{
    $('#start-date').val(day);
    $('#end-date').val(day);
}

function setHours()
{
    const usersStyles = getUserPreferences();
    $('#hours').val(usersStyles['hours-per-day']);
}

function toggleAddButton(buttonName, state)
{
    if (state)
    {
        $(`#${buttonName}`).removeAttr('disabled');
    }
    else
    {
        $(`#${buttonName}`).attr('disabled', 'disabled');
    }
}

// Sort function which sorts all dates according to Day in O(nlogn)
function sortTable()
{
    const rows = $('#waiver-list-table tbody  tr').get();

    rows.sort(function(rowA, rowB)
    {
        const rowAStr = $(rowA).children('td').eq(1).text();
        const rowBStr = $(rowB).children('td').eq(1).text();
        const dateA = new Date(rowAStr);
        const dateB = new Date(rowBStr);
        return (dateA <= dateB) ? dateA !== dateB : -1;
    });
    $.each(rows, function(index, row)
    {
        $('#waiver-list-table').children('tbody').append(row);
    });
}

function addRowToListTable(day, reason, hours)
{
    const table = $('#waiver-list-table tbody')[0],
        row = table.insertRow(0),
        delButtonCell = row.insertCell(0),
        dayCell = row.insertCell(1),
        reasonCell = row.insertCell(2),
        hoursCell = row.insertCell(3);

    dayCell.innerHTML = day;
    reasonCell.innerHTML = reason;
    hoursCell.innerHTML = hours;
    const id = 'delete-' + day;
    delButtonCell.innerHTML = '<input class="delete-btn" data-day="' + day + '" id="' + id + '" type="button"></input>';

    $('#'+ id).on('click', deleteEntryOnClick);
}

function populateList()
{
    clearWaiverList();
    for (const elem of waiverStore)
    {
        const date = elem[0],
            reason = elem[1]['reason'],
            hours = elem[1]['hours'];
        addRowToListTable(date, reason, hours);
    }
    sortTable();
}

function getDateFromISOStr(isoStr)
{
    return isoStr.split('-');
}

function addWaiver()
{
    const [startYear, startMonth, startDay] = getDateFromISOStr($('#start-date').val());
    const [endYear, endMonth, endDay] = getDateFromISOStr($('#end-date').val());

    const startDate = new Date(startYear, startMonth-1, startDay),
        endDate = new Date(endYear, endMonth-1, endDay),
        reason = $('#reason').val(),
        hours = $('#hours').val();

    if (!(validateTime(hours)))
    {
        // The error is shown in the page, no need to handle it here
        return false;
    }

    const diff = diffDays(startDate, endDate);

    if (diff < 0)
    {
        showAlert(getTranslation('$WorkdayWaiver.end-date-cannot-be-less'));
        return false;
    }

    let tempDate = new Date(startDate);
    let noWorkingDaysOnRange = true;
    for (let i = 0; i <= diff; i++)
    {
        const tempDateStr = getDateStr(tempDate);
        const alreadyHaveWaiverStr = getTranslation('$WorkdayWaiver.already-have-waiver');
        const removeWaiverStr = getTranslation('$WorkdayWaiver.remove-waiver');
        const [tempYear, tempMonth, tempDay] = getDateFromISOStr(tempDateStr);
        noWorkingDaysOnRange &= !showDay(tempYear, tempMonth-1, tempDay) && !waiverStore.has(tempDateStr);

        if (waiverStore.has(tempDateStr))
        {
            showAlert(`${alreadyHaveWaiverStr} ${tempDateStr}. ${removeWaiverStr}`);
            return false;
        }

        tempDate.setDate(tempDate.getDate() + 1);
    }

    if (noWorkingDaysOnRange)
    {
        showAlert(getTranslation('$WorkdayWaiver.no-working-days-on-range'));
        return false;
    }

    tempDate = new Date(startDate);

    for (let i = 0; i <= diff; i++)
    {
        const tempDateStr = getDateStr(tempDate);
        const [tempYear, tempMonth, tempDay] = getDateFromISOStr(tempDateStr);
        if (showDay(tempYear, tempMonth-1, tempDay) && !waiverStore.has(tempDateStr))
        {
            waiverStore.set(tempDateStr, { 'reason' : reason, 'hours' : hours });
            addRowToListTable(tempDateStr, reason, hours);
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }
    sortTable();

    //Cleanup
    $('#reason').val('');
    toggleAddButton('waive-button', $('#reason').val());
}

function deleteEntryOnClick(event)
{
    const deleteButton = $(event.target);
    const day = deleteButton.data('day');
    const deleteWaiverMessageStr = getTranslation('$WorkdayWaiver.delete-waiver-message');

    const options = {
        title: 'Time to Leave',
        message: `${deleteWaiverMessageStr} ${day} ?`,
        type: 'info',
        buttons: [getTranslation('$WorkdayWaiver.yes'), getTranslation('$WorkdayWaiver.no')]
    };
    showDialog(options, (result) =>
    {
        const buttonId = result.response;
        if (buttonId === 1)
        {
            return;
        }
        waiverStore.delete(day);

        const row = deleteButton.closest('tr');
        row.remove();
    });
}

function populateCountry()
{
    $('#country').empty();
    $('#country').append($('<option></option>').val('--').html('--'));
    $.each(hd.getCountries(), function(i, p)
    {
        $('#country').append($('<option></option>').val(i).html(p));
    });
}

function populateState(country)
{
    const states = hd.getStates(country);
    if (states)
    {
        $('#state').empty();
        $('#state').append($('<option></option>').val('--').html('--'));
        $.each(states, function(i, p)
        {
            $('#state').append($('<option></option>').val(i).html(p));
        });
        $('#state').show();
        $('#holiday-state').show();
    }
    else
    {
        $('#state').hide();
        $('#holiday-state').hide();
    }
}
function populateCity(country, state)
{
    const regions = hd.getRegions(country, state);
    if (regions)
    {
        $('#city').empty();
        $('#city').append($('<option></option>').val('--').html('--'));
        $.each(regions, function(i, p)
        {
            $('#city').append($('<option></option>').val(i).html(p));
        });
        $('#city').show();
        $('#holiday-city').show();
    }
    else
    {
        $('#city').hide();
        $('#holiday-city').hide();
    }
}

function populateYear()
{
    const year = new Date().getFullYear();
    const obj = {};
    for (let i = year; i < year + 10; i++)
    {
        obj[i] = i;
    }
    $('#year').empty();
    $.each(obj, function(i, p)
    {
        $('#year').append($('<option></option>').val(p).html(p));
    });
}

function getHolidays()
{
    const year = $('#year').find(':selected').val(),
        country = $('#country').find(':selected') ? $('#country').find(':selected').val() : undefined,
        state = $('#state').find(':selected') ? $('#state').find(':selected').val() : undefined,
        city = $('#city').find(':selected') ? $('#city').find(':selected').val() : undefined;
    if (country === undefined)
    {
        return [];
    }
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

    return hd.getHolidays(year);
}

function iterateOnHolidays(funct)
{
    const holidays = getHolidays();

    for (const holiday of holidays)
    {
        const startDate = new Date(holiday['start']),
            endDate = new Date(holiday['end']),
            reason = holiday['name'];
        const diff = diffDays(startDate, endDate) - 1;
        const tempDate = new Date(startDate);
        for (let i = 0; i <= diff; i++)
        {
            const tempDateStr = getDateStr(tempDate);
            funct(tempDateStr, reason);
            tempDate.setDate(tempDate.getDate() + 1);
        }
    }
}

function addHolidayToList(day, reason, workingDay, conflicts)
{
    const table = $('#holiday-list-table tbody')[0],
        row = table.insertRow(table.rows.length),
        dayCell = row.insertCell(0),
        reasonCell = row.insertCell(1),
        workingDayCell = row.insertCell(2),
        conflictsCell = row.insertCell(3),
        importCell = row.insertCell(4);

    dayCell.innerHTML = day;
    reasonCell.innerHTML = reason;
    workingDayCell.innerHTML = workingDay;
    if (workingDay === 'No')
        $(row.cells[2]).addClass('text-danger');
    if (conflicts)
        $(row.cells[3]).addClass('text-danger');
    conflictsCell.innerHTML = conflicts;
    importCell.innerHTML = `<label class="switch"><input type="checkbox" checked="${conflicts || workingDay === 'No' ? '' : 'checked'}" name="import-${day}" id="import-${day}"><span class="slider round"></span></label>`;
}

function clearHolidayTable()
{
    clearTable('holiday-list-table');
}

function clearWaiverList()
{
    clearTable('waiver-list-table');
}

function clearTable(id)
{
    const table = $(`#${id} tbody`)[0];
    // Clear all rows before adding new ones
    while (table.rows.length >= 1)
    {
        table.rows[0].remove();
    }
}

function loadHolidaysTable()
{
    const holidays = getHolidays();
    if (holidays.length === 0)
    {
        return;
    }

    // Clear all rows before adding new ones
    clearHolidayTable();

    function addHoliday(holidayDate, holidayReason)
    {
        const [tempYear, tempMonth, tempDay] = getDateFromISOStr(holidayDate);
        // Holiday returns month with 1-12 index, but showDay expects 0-11
        const workingDay = showDay(tempYear, tempMonth - 1, tempDay) ? getTranslation('$WorkdayWaiver.yes') : getTranslation('$WorkdayWaiver.no');
        const conflicts = waiverStore.get(holidayDate);
        addHolidayToList(holidayDate, holidayReason, workingDay, conflicts ? conflicts['reason'] : '');
    }

    iterateOnHolidays(addHoliday);
    // Show table and enable button
    $('#holiday-list-table').show();
    toggleAddButton('holiday-button', true);
}

function addHolidaysAsWaiver()
{
    function addHoliday(holidayDate, holidayReason)
    {
        const importHoliday = $(`#import-${holidayDate}`)[0].checked;
        if (importHoliday)
        {
            waiverStore.set(holidayDate, { 'reason' : holidayReason, 'hours' : '08:00' });
            addRowToListTable(holidayDate, holidayReason, '08:00');
            sortTable();
        }
    }
    iterateOnHolidays(addHoliday);

    //clear data from table and return the configurations to default
    initializeHolidayInfo();
    showAlert(getTranslation('$WorkdayWaiver.loaded-waivers-holidays'));
}

function initializeHolidayInfo()
{
    toggleAddButton('holiday-button', false);
    populateYear();
    populateCountry();
    $('#holiday-list-table').hide();
    $('#state').hide();
    $('#holiday-state').hide();
    $('#city').hide();
    $('#holiday-city').hide();

    $('#holiday-list-table').hide();
    // Clear all rows before adding new ones
    clearHolidayTable();
}

$(() =>
{
    const preferences = getUserPreferences();
    applyTheme(preferences.theme);

    ipcRenderer.invoke('GET_LANGUAGE_DATA').then(data =>
    {
        languageData = data;

        setDates(remote.getGlobal('waiverDay'));
        setHours();
        toggleAddButton('waive-button', $('#reason').val());

        populateList();

        $('#reason, #hours').on('input blur', () =>
        {
            toggleAddButton('waive-button', $('#reason').val() && $('#hours')[0].checkValidity());
        });

        $('#waive-button').on('click', () =>
        {
            addWaiver();
        });

        $('#holiday-button').on('click', () =>
        {
            addHolidaysAsWaiver();
        });

        initializeHolidayInfo();
        $('#country').on('change', function()
        {
            populateState($(this).find(':selected').val());
            loadHolidaysTable();
        });
        $('#state').on('change', function()
        {
            populateCity($('#country').find(':selected').val(), $(this).find(':selected').val());
            loadHolidaysTable();
        });
        $('#city').on('change', function()
        {
            loadHolidaysTable();
        });

        bindDevToolsShortcut(window);
        translatePage(languageData.language, languageData.data, 'WorkdayWaiver');
    });
});

module.exports = {
    addHolidayToList,
    addWaiver,
    clearTable,
    clearHolidayTable,
    clearWaiverList,
    deleteEntryOnClick,
    getHolidays,
    initializeHolidayInfo,
    iterateOnHolidays,
    loadHolidaysTable,
    populateCity,
    populateCountry,
    populateList,
    populateState,
    populateYear,
    setDates,
    setHours,
    toggleAddButton,
    refreshDataForTest
};
