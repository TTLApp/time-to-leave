'use strict';

import { assert } from 'console';
import Store from 'electron-store';
import fs from 'fs';

import { generateKey } from './date-db-formatter.mjs';
import { validateJSON } from './validate-json.mjs';

/**
 * Returns the database as an array of:
 *   . type: flexible
 *   . date
 *   . values: times
 */
function _getEntries()
{
    const calendarStore = new Store({name: 'flexible-store'});
    const output = [];
    for (const entry of calendarStore)
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

class ImportExport
{
    static exportDatabaseToFile(filename)
    {
        let information = _getEntries();
        information = information.concat(_getWaivedEntries());
        try
        {
            fs.writeFileSync(filename, JSON.stringify(information, null,'\t'), 'utf-8');
        }
        catch
        {
            return false;
        }
        return true;
    }

    static importDatabaseFromFile(filename)
    {
        const calendarStore = new Store({name: 'flexible-store'});
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
                if (!validateJSON([entry]))
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

            calendarStore.set(entries);
            waivedWorkdays.set(waiverEntries);

            if (failedEntries !== 0)
            {
                return {'result': false, 'total': information.length, 'failed': failedEntries};
            }
        }
        catch
        {
            return {'result': false, 'total': 0, 'failed': 0};
        }
        return {'result': true};
    }
}

export default ImportExport;
