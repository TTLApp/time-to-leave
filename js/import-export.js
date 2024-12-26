/*eslint-disable no-prototype-builtins*/
'use strict';

import { assert } from 'console';
import Store from 'electron-store';
import fs from 'fs';

import { validateTime } from './time-math.js';
import { generateKey } from './date-db-formatter.js';

/**
 * Returns the database as an array of:
 *   . type: flexible
 *   . date
 *   . values: times
 */
function _getEntries()
{
    const entryStore = new Store({name: 'flexible-store'});
    const output = [];
    for (const entry of entryStore)
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
    const output = [];
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
    let information = _getEntries();
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
    if (entry.hasOwnProperty('type') && ['waived', 'flexible'].indexOf(entry.type) !== -1)
    {
        const validatedDate = entry.hasOwnProperty('date') && _validateDate(entry.date);
        let hasExpectedProperties;
        let validatedTime = true;
        if (entry.type === 'flexible')
        {
            hasExpectedProperties = entry.hasOwnProperty('values') && Array.isArray(entry.values) && entry.values.length > 0;
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

function importDatabaseFromFile(filename)
{
    const entryStore = new Store({name: 'flexible-store'});
    const waivedWorkdays = new Store({name: 'waived-workdays'});
    try
    {
        const information = JSON.parse(fs.readFileSync(filename[0], 'utf-8'));
        let failedEntries = 0;
        const entries = {};
        const waiverEntries = {};
        for (let i = 0; i < information.length; ++i)
        {
            const entry = information[i];
            if (!validEntry(entry))
            {
                failedEntries += 1;
                continue;
            }
            if (entry.type === 'waived')
            {
                waiverEntries[entry.date] = { 'reason' : entry.data, 'hours' : entry.hours };
            }
            else
            {
                assert(entry.type === 'flexible');
                const [year, month, day] = entry.date.split('-');
                //The main database uses a JS-based month index (0-11)
                //So we need to adjust it from human month index (1-12)
                const date = generateKey(year, (parseInt(month) - 1), day);
                entries[date] = {values: entry.values};
            }
        }

        entryStore.set(entries);
        waivedWorkdays.set(waiverEntries);

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

module.exports = {
    exportDatabaseToFile,
    importDatabaseFromFile,
    validEntry,
};
