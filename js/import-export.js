/*eslint-disable no-prototype-builtins*/
'use strict';

const Store = require('electron-store');
const fs = require('fs');
const { validateTime } = require('./time-math.js');
const { generateKey } = require('./date-db-formatter');

/**
 * Returns the database (only flexible calendar entries) as an array of:
 *   . type: flexible
 *   . date
 *   . values: times
 */
function _getFlexibleEntries()
{
    const flexibleStore = new Store({name: 'flexible-store'});
    let output = [];
    for (const entry of flexibleStore)
    {
        const key = entry[0];
        const value = entry[1];

        const [year, month, day] = key.split('-');
        //The main database uses a JS-based month index (0-11)
        //So we need to adjust it to human month index (1-12)
        const date = generateKey(year, (parseInt(month) + 1), day);
        output.push({'type': 'flexible', 'date': date, 'values': value.values});
    }
    return output;
}

/**
 * Returns the database (only waived workday entries) as an array of:
 *   . type: waived
 *   . date
 *   . data: (reason)
 *   . hours
 */
function _getWaivedEntries()
{
    const waivedWorkdays = new Store({name: 'waived-workdays'});
    let output = [];
    for (const entry of waivedWorkdays)
    {
        const date = entry[0];
        const reason = entry[1]['reason'];
        const hours = entry[1]['hours'];

        //The waived workday database uses human month index (1-12)
        output.push({'type': 'waived', 'date': date, 'data': reason, 'hours': hours});
    }
    return output;
}

function exportDatabaseToFile(filename)
{
    let information = _getFlexibleEntries();
    information = information.concat(_getWaivedEntries());
    try
    {
        fs.writeFileSync(filename, JSON.stringify(information, null,'\t'), 'utf-8');
    }
    catch (err)
    {
        return false;
    } return true;
}

function _validateDate(dateStr)
{
    const date = new Date(dateStr);
    return date instanceof Date && !Number.isNaN(date.getTime());
}

function validEntry(entry)
{
    // TODO: 'regular' is still here while we allow importing old DB data. Please remove on the next release.
    if (entry.hasOwnProperty('type') && ['regular', 'waived', 'flexible'].indexOf(entry.type) !== -1)
    {
        const validatedDate = entry.hasOwnProperty('date') && _validateDate(entry.date);
        let hasExpectedProperties;
        let validatedTime = true;
        if (entry.type === 'flexible')
        {
            hasExpectedProperties = entry.hasOwnProperty('values') && Array.isArray(entry.values);
            if (hasExpectedProperties)
            {
                for (const value of entry.values)
                {
                    validatedTime &= (validateTime(value) || value === '--:--');
                }
            }
        }
        else
        {
            hasExpectedProperties = entry.hasOwnProperty('data');
            validatedTime = entry.hasOwnProperty('hours') && validateTime(entry.hours);
        }
        if (hasExpectedProperties && validatedDate && validatedTime)
        {
            return true;
        }
    }
    return false;
}

function mergeOldStoreDataIntoFlexibleStore(flexibleEntry, oldStoreHours)
{
    let index = 0;
    for (const hour of flexibleEntry.values)
    {
        if (oldStoreHours > hour)
        {
            index++;
        }
    }
    flexibleEntry.values.splice(index, 0, oldStoreHours);
    return flexibleEntry;
}

function importDatabaseFromFile(filename)
{
    const flexibleStore = new Store({name: 'flexible-store'});
    const waivedWorkdays = new Store({name: 'waived-workdays'});
    try
    {
        const information = JSON.parse(fs.readFileSync(filename[0], 'utf-8'));
        let failedEntries = 0;
        for (let i = 0; i < information.length; ++i)
        {
            let entry = information[i];
            if (!validEntry(entry))
            {
                failedEntries += 1;
                continue;
            }
            if (entry.type === 'waived')
            {
                waivedWorkdays.set(entry.date, { 'reason' : entry.data, 'hours' : entry.hours });
            }
            else
            {
                let [year, month, day] = entry.date.split('-');
                //The main database uses a JS-based month index (0-11)
                //So we need to adjust it from human month index (1-12)
                let date = generateKey(year, (parseInt(month) - 1), day);
                if (entry.type === 'flexible')
                {
                    const flexibleEntry = { values: entry.values };
                    flexibleStore.set(date, flexibleEntry);
                }
                else if (entry.type === 'regular')
                {
                    // TODO: 'regular' is still here while we allow importing old DB data. Please remove on the next release.
                    const [/*event*/, key] = entry.data.split('-');
                    if (['begin', 'end'].indexOf(key) !== -1)
                    {
                        const currentFlexibleEntry = flexibleStore.get(date, { values: [] });
                        const flexibleEntry = mergeOldStoreDataIntoFlexibleStore(currentFlexibleEntry, entry.hours);
                        flexibleStore.set(date, flexibleEntry);
                    }
                }
            }
        }

        if (failedEntries !== 0)
        {
            return {'result': false, 'total': information.length, 'failed': failedEntries};
        }
    }
    catch (err)
    {
        return {'result': false, 'total': 0, 'failed': 0};
    }
    return {'result': true};
}

function migrateFixedDbToFlexible()
{
    const store = new Store();
    const flexibleStore = new Store({name: 'flexible-store'});
    flexibleStore.clear();
    let regularEntryArray = [];
    for (const entry of store)
    {
        const key = entry[0];
        const value = entry[1];

        const [year, month, day, /*stage*/, step] = key.split('-');
        if (['begin', 'end'].indexOf(step) !== -1)
        {
            const date = generateKey(year, month, day);
            if (regularEntryArray[date] === undefined)
            {
                regularEntryArray[date] = { values: []};
            }
            regularEntryArray[date].values.push(value);
        }
    }
    try
    {
        for (const key of Object.keys(regularEntryArray))
        {
            regularEntryArray[key].values.sort();
            flexibleStore.set(key, regularEntryArray[key]);
        }
    }
    catch (err)
    {
        console.log(err);
        return {'result': false, 'err': err};
    }
    return {'result': true, 'err': ''};
}

module.exports = {
    importDatabaseFromFile,
    exportDatabaseToFile,
    migrateFixedDbToFlexible,
    validEntry
};
