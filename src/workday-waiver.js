const { remote } = require('electron');
const { BrowserWindow, dialog } = remote;
const Store = require('electron-store');

const { getUserPreferences, showDay } = require('../js/user-preferences.js');
const { validateTime, diffDays } = require('../js/time-math.js');
const { applyTheme } = require('../js/themes.js');
const { getDateStr } = require('../js/date-aux.js');

const waiverStore = new Store({name: 'waived-workdays'});

function setDates(day) {
    $('#start-date').val(day);
    $('#end-date').val(day);
}

function setHours() {
    let usersStyles = getUserPreferences();
    $('#hours').val(usersStyles['hours-per-day']);
}

function toggleAddButton() {
    let value = $('#reason').val();
    if (value.length > 0) {
        $('#waive-button').removeAttr('disabled');
    } else {
        $('#waive-button').attr('disabled', 'disabled');
    }
}

function addRowToListTable(day, reason, hours) {
    let table = $('#waiver-list-table tbody')[0],
        row = table.insertRow(0),
        dayCell = row.insertCell(0),
        reasonCell = row.insertCell(1),
        hoursCell = row.insertCell(2),
        delButtonCell = row.insertCell(3);

    dayCell.innerHTML = day;
    reasonCell.innerHTML = reason;
    hoursCell.innerHTML = hours;
    let id = 'delete-' + day;
    delButtonCell.innerHTML = '<input class="delete-btn" data-day="' + day + '" id="' + id + '" type="image" src="../assets/delete.svg" alt="Delete entry" height="12" width="12"></input>';

    $('#'+ id).on('click', deleteEntryOnClick);
}

function populateList() {
    for (const elem of waiverStore) {
        let date = elem[0],
            reason = elem[1]['reason'],
            hours = elem[1]['hours'];
        addRowToListTable(date, reason, hours);
    }
}

function getDateFromISOStr(isoStr) {
    return isoStr.split('-');
}

function addWaiver() {
    let [startYear, startMonth, startDay] = getDateFromISOStr($('#start-date').val());
    let [endYear, endMonth, endDay] = getDateFromISOStr($('#end-date').val());

    let startDate = new Date(startYear, startMonth-1, startDay),
        endDate = new Date(endYear, endMonth-1, endDay),
        reason = $('#reason').val(),
        hours = $('#hours').val();

    if (!(validateTime(hours))) {
        // The error is shown in the page, no need to handle it here
        return;
    }

    let diff = diffDays(startDate, endDate);
    if (diff < 0) {
        dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
            {
                message: 'End date cannot be less than start date.'
            }
        ).then(() => {
            return;
        });
    }

    let tempDate = new Date(startDate);
    let noWorkingDaysOnRange = true;
    for (let i = 0; i <= diff; i++) {
        let tempDateStr = getDateStr(tempDate);
        let [tempYear, tempMonth, tempDay] = getDateFromISOStr(tempDateStr);
        noWorkingDaysOnRange &= !showDay(tempYear, tempMonth-1, tempDay) && !waiverStore.has(tempDateStr);
        if (waiverStore.has(tempDateStr)) {
            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                {
                    message: `You already have a waiver on ${tempDateStr}. Remove it before adding a new one.`
                }
            ).then(() => {
                return;
            });
        }

        tempDate.setDate(tempDate.getDate() + 1);
    }

    if (noWorkingDaysOnRange) {
        dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
            {
                message: 'Cannot add waiver. Range does not contain any working day.'
            }
        ).then(() => {
            return;
        });
    }

    tempDate = new Date(startDate);

    for (let i = 0; i <= diff; i++) {
        let tempDateStr = getDateStr(tempDate);
        let [tempYear, tempMonth, tempDay] = getDateFromISOStr(tempDateStr);
        if (showDay(tempYear, tempMonth-1, tempDay) && !waiverStore.has(tempDateStr)) {
            waiverStore.set(tempDateStr, { 'reason' : reason, 'hours' : hours });
            addRowToListTable(tempDateStr, reason, hours);
        }

        tempDate.setDate(tempDate.getDate() + 1);
    }

    //Cleanup
    $('#reason').val('');
    toggleAddButton();
}

function deleteEntryOnClick(event) {
    let deleteButton = $(event.target);
    let day = deleteButton.data('day');

    dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
        {
            title: 'Time to Leave',
            message: 'Are you sure you want to delete waiver on day ' + day + '?',
            type: 'info',
            buttons: ['Yes', 'No']
        }).then((result) => {
        const buttonId = result.response;
        if (buttonId === 1) {
            return;
        }
        waiverStore.delete(day);

        let row = deleteButton.closest('tr');
        row.remove();
    });
}

$(() => {
    let preferences = getUserPreferences();
    applyTheme(preferences.theme);

    setDates(remote.getGlobal('waiverDay'));
    setHours();
    toggleAddButton();

    populateList();

    $('#reason').on('keyup', () => {
        toggleAddButton();
    });

    $('#waive-button').on('click', () => {
        addWaiver();
    });
});