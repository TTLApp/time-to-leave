const { getUserPreferences, showDay } = require('../js/user-preferences.js');
const { validateTime, diffDays } = require('../js/time-math.js');
const { applyTheme } = require('../js/themes.js');
const { getDateStr } = require('../js/date-aux.js');
const { remote } = require('electron');
const { BrowserWindow, dialog } = remote;
const Store = require('electron-store');

const store = new Store({name: 'waived-workdays'});

// Global values
let usersStyles =  getUserPreferences();

function setDates(day) {
    $('#start_date').val(day);
    $('#end_date').val(day);
}

function setHours() {
    $('#hours').val(usersStyles['hours-per-day']);
}

function toggleAddButton() {
    var value = $('#reason').val();
    if (value.length > 0) {
        $('#waive-button').removeAttr('disabled');
    } 
    else {
        $('#waive-button').attr('disabled', 'disabled');
    }
}

function addRowToListTable(day, reason, hours) {
    var table = $('#waiver-list-table')[0],
        row = table.insertRow(1),
        dayCell = row.insertCell(0),
        reasonCell = row.insertCell(1),
        hoursCell = row.insertCell(2),
        delButtonCell = row.insertCell(3);
  
    dayCell.innerHTML = day;
    reasonCell.innerHTML = reason;
    hoursCell.innerHTML = hours;
    var id = 'delete-' + day;
    delButtonCell.innerHTML = '<input class="delete-btn" data-day="' + day + '" id="' + id + '" type="image" src="../assets/delete.svg" alt="Delete entry" height="12" width="12"></input>';
    
    $('#'+ id).on('click', deleteEntryOnClick);
}

function populateList() {
    for (const elem of store) {
        var date = elem[0],
            reason = elem[1]['reason'],
            hours = elem[1]['hours'];
        addRowToListTable(date, reason, hours);
    }
}

function getDateFromISOStr(isoStr) {
    return isoStr.split('-');
}

function addWaiver() {
    var [start_year, start_month, start_day] = getDateFromISOStr($('#start_date').val());
    var [end_year, end_month, end_day] = getDateFromISOStr($('#end_date').val());
    
    var start_date = new Date(start_year, start_month-1, start_day),
        end_date = new Date(end_year, end_month-1, end_day),
        reason = $('#reason').val(),
        hours = $('#hours').val();

    if (!(validateTime(hours))) {
        // The error is shown in the page, no need to handle it here
        return;
    }

    var diff = diffDays(start_date, end_date);
    if (diff < 0) {
        dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
            {
                message: 'End date cannot be less than start date.'
            }
        ).then(() => {
            return;
        });
    }

    var temp_date = new Date(start_date);
    var noWorkingDaysOnRange = true;
    for (var i = 0; i <= diff; i++) {
        var temp_date_str = getDateStr(temp_date);
        var [temp_year, temp_month, temp_day] = getDateFromISOStr(temp_date_str);
        noWorkingDaysOnRange &= !showDay(temp_year, temp_month-1, temp_day) && !store.has(temp_date_str);
        if (store.has(temp_date_str)) {
            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                {
                    message: `You already have a waiver on ${temp_date_str}. Remove it before adding a new one.`
                }
            ).then(() => {
                return;
            });
        }

        temp_date.setDate(temp_date.getDate() + 1);
    }

    if (noWorkingDaysOnRange) {
        dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
            {
                message: `You already have a waiver on ${temp_date_str}. Remove it before adding a new one.`
            }
        ).then(() => {
            return;
        });
    }

    temp_date = new Date(start_date);

    for (i = 0; i <= diff; i++) {
        temp_date_str = getDateStr(temp_date);
        [temp_year, temp_month, temp_day] = getDateFromISOStr(temp_date_str);
        if (showDay(temp_year, temp_month-1, temp_day) && !store.has(temp_date_str)) {
            store.set(temp_date_str, { 'reason' : reason, 'hours' : hours });
            addRowToListTable(temp_date_str, reason, hours);
        }

        temp_date.setDate(temp_date.getDate() + 1);
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
        store.delete(day);

        let row = deleteButton.closest('tr');
        row.remove();
    });
}

$(() => {
    let prefs = getUserPreferences();
    applyTheme(prefs.theme);

    setDates(remote.getGlobal('waiverDay'));
    setHours();
    toggleAddButton();

    populateList();

    $('#reason').on('keyup', function() {
        toggleAddButton();
    });

    $('#waive-button').on('click', function() {
        addWaiver();
    });
});