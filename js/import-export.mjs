'use strict';

import { assert } from 'console';
import Store from 'electron-store';
import fs from 'fs';
import ExcelJS from 'exceljs'; // Import ExcelJS library

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

        // Normalize date format to YYYY-MM-DD
        information.forEach(entry =>
        {
            const [year, month, day] = entry.date.split(/[-/]/).map(part => part.padStart(2, '0'));
            entry.date = `${year}-${month}-${day}`;
        });

        // Sort the entries by date in ascending order
        information.sort((a, b) => new Date(a.date) - new Date(b.date));

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

    static async exportDatabaseToExcel(filename)
    {
        let information = _getEntries();
        information = information.concat(_getWaivedEntries());

        // Normalize date format to YYYY-MM-DD
        information.forEach(entry =>
        {
            const [year, month, day] = entry.date.split(/[-/]/).map(part => part.padStart(2, '0'));
            entry.date = `${year}-${month}-${day}`;
        });

        // Sort the entries by date in ascending order
        information.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Database Export');

        // Add header row
        worksheet.columns = [
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Values/Data', key: 'values', width: 30 },
            { header: 'Hours', key: 'hours', width: 10 }
        ];

        // Add data rows
        information.forEach(entry =>
        {
            worksheet.addRow({
                type: entry.type,
                date: entry.date,
                values: entry.values ? entry.values.join(', ') : entry.data,
                hours: entry.hours || ''
            });
        });

        try
        {
            // Write to Excel file
            await workbook.xlsx.writeFile(filename);
            console.log(`Excel file successfully written to ${filename}`);
        }
        catch (error)
        {
            console.error(`Failed to write Excel file: ${error.message}`);
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
            if (!filename[0].endsWith('.ttldb'))
            {
                throw new Error('Unsupported file type. Only .ttldb files are allowed.');
            }
            const information = JSON.parse(fs.readFileSync(filename[0], 'utf-8'));
            let failedEntries = 0;
            const entries = {};
            const waiverEntries = {};
            for (let i = 0; i < information.length; ++i)
            {
                const entry = information[i];
                if (!validateJSON([entry]))
                {
                    console.warn(`Validation failed for entry: ${JSON.stringify(entry)}`);
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
                console.warn(`Import completed with ${failedEntries} failed entries.`);
                return {'result': false, 'total': information.length, 'failed': failedEntries};
            }
        }
        catch (error)
        {
            console.error(`Failed to import database: ${error.message}`);
            return {'result': false, 'total': 0, 'failed': 0};
        }
        return {'result': true};
    }
}

export default ImportExport;
