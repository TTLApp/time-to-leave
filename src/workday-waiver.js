const { getUserPreferences, showDay } = require('../js/user-preferences.js');
const { validateTime, diffDays } = require('../js/time-math.js');
const { applyTheme } = require('../js/themes.js');
const { remote } = require('electron');
const Store = require('electron-store');

const store = new Store({name: 'waived-workdays'});

// Global values
let usersStyles =  getUserPreferences();

function setDates (day) {
    document.getElementById('start_date').value = day;
    document.getElementById('end_date').value = day;
}

function setHours() {
    document.getElementById('hours').value = usersStyles['hours-per-day'];
}

function toggleAddButton() {
    var value = document.getElementById('reason').value;
    if(value.length > 0){
        $('#waive-button').removeAttr('disabled');
    } 
    else {
        $('#waive-button').attr('disabled', 'disabled');
    }
}

function addRowToListTable(day, reason, hours) {
    var table = document.getElementById('waiver-list-table'),
        row = table.insertRow(1),
        dayCell = row.insertCell(0),
        reasonCell = row.insertCell(1),
        hoursCell = row.insertCell(2),
        delButtonCell = row.insertCell(3);
  
    dayCell.innerHTML = day;
    reasonCell.innerHTML = reason;
    hoursCell.innerHTML = hours;
    var id = 'delete-' + day;
    delButtonCell.innerHTML = '<input class="delete-btn" id="' + id + '" type="image" src="../assets/delete.svg" alt="Delete entry" height="12" width="12"></input>';
    
    $('#'+ id).on('click', function() {
        deleteEntry(this.id.replace('delete-', ''));
    });
}

function populateList() {
    for (const elem of store) {
        var date = elem[0],
            reason = elem[1]['reason'],
            hours = elem[1]['hours'];
        addRowToListTable(date, reason, hours);
    }
}

function addWaiver() {
    var start_date = new Date(document.getElementById('start_date').value),
        end_date = new Date(document.getElementById('end_date').value),
        reason = document.getElementById('reason').value,
        hours = document.getElementById('hours').value;

    if (!(validateTime(hours))) {
        // The error is shown in the page, no need to handle it here
        return;
    }

    var diff = diffDays(start_date, end_date);
    if (diff < 0) {
        alert('End date cannot be less than start date.');
        return;
    }

    var temp_date = new Date(start_date.getTime());
    for (var i = 0; i <= diff; i++) {
        var temp_date_str = temp_date.toISOString().substr(0, 10);

        if (store.has(temp_date_str)) {
            alert(`You already have a waiver on ${temp_date_str}. Remove it before adding a new one.`);
            return;
        }

        temp_date.setDate(temp_date.getDate() + 1);
    }

    temp_date.setDate(start_date.getDate());
    for (i = 0; i <= diff; i++) {
        var temp_year = temp_date.getFullYear(),
            temp_month = temp_date.getMonth(),
            temp_day = temp_date.getDay();

        temp_date_str = temp_date.toISOString().substr(0, 10);
        if (showDay(temp_year, temp_month, temp_day) && !store.has(temp_date_str)) {
            store.set(temp_date_str, { 'reason' : reason, 'hours' : hours });
            addRowToListTable(temp_date_str, reason, hours);
        }

        temp_date.setDate(temp_date.getDate() + 1);
    }

    //Cleanup
    document.getElementById('reason').value = '';
    toggleAddButton();
}

function deleteEntry(day) {
    if (!confirm('Are you sure you want to delete waiver on day ' + day + '?')) {
        return;
    }
    store.delete(day);
    var table = document.getElementById('waiver-list-table');
    while(table.rows.length > 1) {
        table.deleteRow(1);
    }
    populateList();
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