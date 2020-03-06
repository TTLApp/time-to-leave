/*eslint-disable no-prototype-builtins*/
const Store = require('electron-store');
const fs = require('fs');
const { dialog } = require('electron');
const { validateTime } = require('./time-math.js');

const store = new Store();
const waivedWorkdays = new Store({name: 'waived-workdays'});

/**
 * Returns the database (only regular entries) as a array of:
 *   . type: regular
 *   . date
 *   . data: (day-begin, day-end, day-total, lunch-begin, lunch-end, lunch-total)
 *   . hours
 */
function getRegularEntries() {

    var output = [];
    for (const entry of store) {
        const key = entry[0];
        const value = entry[1];

        var [year, month, day, stage, step] = key.split('-');
        //The main database uses a JS-based month index (0-11)
        //So we need to adjust it to human month index (1-12)
        var date = year + '-' + (month + 1) + '-' + day;
        var data = stage + '-' + step;

        output.push({'type': 'regular', 'date': date, 'data': data, 'hours': value});
    }
    return output;
}

/**
 * Returns the database (only waived workday entries) as a array of:
 *   . type: waived
 *   . date
 *   . data: (reason)
 *   . hours
 */
function getWaivedEntries() {

    var output = [];
    for (const entry of waivedWorkdays) {
        const date = entry[0];
        const reason = entry[1]['reason'];
        const hours = entry[1]['hours'];

        //The waived workday database uses human month index (1-12)
        output.push({'type': 'waived', 'date': date, 'data': reason, 'hours': hours});
    }
    return output;
}

function exportDatabaseToFile(filename) {
    var information = getRegularEntries();
    information = information.concat(getWaivedEntries());
    fs.writeFileSync(filename, JSON.stringify(information, null,'\t'), 'utf-8');
}

function validateDate(dateStr) {
    var date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
}

function validEntry(entry) {
    if (!entry.hasOwnProperty('type') ||
        !entry.hasOwnProperty('date') ||
        !entry.hasOwnProperty('data') ||
        !entry.hasOwnProperty('hours') ||
        !(entry.type === 'regular' || entry.type === 'waived') ||
        !validateTime(entry.hours) ||
        !validateDate(entry.date)) {
        return false;
    }
    return true;
}

function importDatabaseFromFile(filename) {
    const information = JSON.parse(fs.readFileSync(filename[0], 'utf-8'));
    var failedEntries = 0;
    for (var i = 0; i < information.length; ++i) {
        var entry = information[i];
        if (!validEntry(entry)) {
            failedEntries += 1;
            continue;
        }
        if (entry.type === 'waived') {
            waivedWorkdays.set(entry.date, { 'reason' : entry.data, 'hours' : entry.hours });
        } else if (entry.type === 'regular') {
            var [year, month, day] = entry.date.split('-');
            //The main database uses a JS-based month index (0-11)
            //So we need to adjust it from human month index (1-12)
            var date = year + '-' + (month - 1) + '-' + day;
            var key = date + '-' + entry.data;
            store.set(key, entry.hours);
        }
    }

    if (failedEntries !== 0) {
        const message = failedEntries + ' out of ' + information.length + ' could not be loaded.';
        dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Failed entries',
            message: message
        });
        return false;
    }
    return true;
}

module.exports = {
    importDatabaseFromFile,
    exportDatabaseToFile
};
