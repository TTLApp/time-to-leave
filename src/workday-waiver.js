'use strict';

const { remote } = require('electron');
const Store = require('electron-store');
let Holidays = require('date-holidays');

const { getUserPreferences, showDay } = require('../js/user-preferences.js');
const { validateTime, diffDays } = require('../js/time-math.js');
const { applyTheme } = require('../js/themes.js');
const { getDateStr } = require('../js/date-aux.js');
const { bindDevToolsShortcut, showAlert, showDialog } = require('../js/window-aux.js');
const i18n = require('./configs/i18next.config.js');

const $ = require('jquery');
const jqueryI18next = require('jquery-i18next');

const waiverStore = new Store({name: 'waived-workdays'});
let hd = new Holidays();

function setDates(day)
{
    $('#start-date').val(day);
    $('#end-date').val(day);
}

function setHours()
{
    let usersStyles = getUserPreferences();
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
    let rows = $('#waiver-list-table tbody  tr').get();

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
    let table = $('#waiver-list-table tbody')[0],
        row = table.insertRow(0),
        delButtonCell = row.insertCell(0),
        dayCell = row.insertCell(1),
        reasonCell = row.insertCell(2),
        hoursCell = row.insertCell(3);

    dayCell.innerHTML = day;
    reasonCell.innerHTML = reason;
    hoursCell.innerHTML = hours;
    let id = 'delete-' + day;
    delButtonCell.innerHTML = '<input class="delete-btn" data-day="' + day + '" id="' + id + '" type="button"></input>';

    $('#'+ id).on('click', deleteEntryOnClick);
}

function populateList()
{
    clearWaiverList();
    for (const elem of waiverStore)
    {
        let date = elem[0],
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
    let [startYear, startMonth, startDay] = getDateFromISOStr($('#start-date').val());
    let [endYear, endMonth, endDay] = getDateFromISOStr($('#end-date').val());

    let startDate = new Date(startYear, startMonth-1, startDay),
        endDate = new Date(endYear, endMonth-1, endDay),
        reason = $('#reason').val(),
        hours = $('#hours').val();

    if (!(validateTime(hours)))
    {
        // The error is shown in the page, no need to handle it here
        return false;
    }

    let diff = diffDays(startDate, endDate);

    if (diff < 0)
    {
        showAlert(i18n.t('$WorkdayWaiver.end-date-cannot-be-less'));
        return false;
    }

    let tempDate = new Date(startDate);
    let noWorkingDaysOnRange = true;
    for (let i = 0; i <= diff; i++)
    {
        let tempDateStr = getDateStr(tempDate);
        let alreadyHaveWaiverStr = i18n.t('$WorkdayWaiver.already-have-waiver');
        let removeWaiverStr = i18n.t('$WorkdayWaiver.remove-waiver');
        let [tempYear, tempMonth, tempDay] = getDateFromISOStr(tempDateStr);
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
        showAlert(i18n.t('$WorkdayWaiver.no-working-days-on-range'));
        return false;
    }

    tempDate = new Date(startDate);

    for (let i = 0; i <= diff; i++)
    {
        let tempDateStr = getDateStr(tempDate);
        let [tempYear, tempMonth, tempDay] = getDateFromISOStr(tempDateStr);
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
    let deleteButton = $(event.target);
    let day = deleteButton.data('day');
    let timeToLeaveStr = i18n.t('$WorkdayWaiver.time-to-leave');
    let deleteWaiverMessageStr = i18n.t('$WorkdayWaiver.delete-waiver-message');

    let options = {
        title: timeToLeaveStr,
        message: `${deleteWaiverMessageStr} ${day} ?`,
        type: 'info',
        buttons: [i18n.t('$WorkdayWaiver.yes'), i18n.t('$WorkdayWaiver.no')]
    };
    showDialog(options, (result) =>
    {
        const buttonId = result.response;
        if (buttonId === 1)
        {
            return;
        }
        waiverStore.delete(day);

        let row = deleteButton.closest('tr');
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
    let states = hd.getStates(country);
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
    let regions = hd.getRegions(country, state);
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
    let year = new Date().getFullYear();
    let obj = {};
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
    let year = $('#year').find(':selected').val(),
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
    let holidays = getHolidays();

    for (let holiday of holidays)
    {
        let startDate = new Date(holiday['start']),
            endDate = new Date(holiday['end']),
            reason = holiday['name'];
        let diff = diffDays(startDate, endDate) - 1;
        let tempDate = new Date(startDate);
        for (let i = 0; i <= diff; i++)
        {
            let tempDateStr = getDateStr(tempDate);
            funct(tempDateStr, reason);
            tempDate.setDate(tempDate.getDate() + 1);
        }
    }
}

function addHolidayToList(day, reason, workingDay, conflicts)
{
    let table = $('#holiday-list-table tbody')[0],
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
    let table = $(`#${id} tbody`)[0];
    // Clear all rows before adding new ones
    while (table.rows.length >= 1)
    {
        table.rows[0].remove();
    }
}

function loadHolidaysTable()
{
    let holidays = getHolidays();
    if (holidays.length === 0)
    {
        return;
    }

    // Clear all rows before adding new ones
    clearHolidayTable();

    function addHoliday(holidayDate, holidayReason)
    {
        let [tempYear, tempMonth, tempDay] = getDateFromISOStr(holidayDate);
        // Holiday returns month with 1-12 index, but showDay expects 0-11
        let workingDay = showDay(tempYear, tempMonth - 1, tempDay) ? i18n.t('$WorkdayWaiver.yes') : i18n.t('$WorkdayWaiver.no');
        let conflicts = waiverStore.get(holidayDate);
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
        let importHoliday = $(`#import-${holidayDate}`)[0].checked;
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
    showAlert(i18n.t('$WorkdayWaiver.loaded-waivers-holidays'));
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

function translatePage(language)
{
    $('html').attr('lang', language);
    $('body').localize();
    $('title').localize();
    $('label').localize();
    $('div').localize();
}

i18n.on('loaded', () =>
{
    const usersStyles = getUserPreferences();
    i18n.changeLanguage(usersStyles['language']);
    i18n.off('loadded');
    i18n.off('languageChanged');

    jqueryI18next.init(i18n, $);
    translatePage(i18n.language);
});

$(() =>
{
    let preferences = getUserPreferences();
    applyTheme(preferences.theme);

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
};
