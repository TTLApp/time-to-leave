'use strict';

import assert from 'assert';
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';

import ImportExport from '../../js/import-export.mjs';

describe('Import export', function()
{
    const folder = fs.mkdtempSync('import-export');
    const invalidEntriesFile = path.join(folder, 'invalid.ttldb');

    const calendarStore = new Store({name: 'flexible-store'});
    const waivedWorkdays = new Store({name: 'waived-workdays'});

    before(() =>
    {
        calendarStore.clear();
        const entries = {
            '2020-3-1': {'values': ['08:00', '12:00', '13:00', '17:00']},
            '2020-3-2': {'values': ['07:00', '11:00', '14:00', '18:00']}
        };
        calendarStore.set(entries);

        waivedWorkdays.clear();
        const waivedEntries = {
            '2019-12-31': {reason: 'New Year\'s eve', hours: '08:00'},
            '2020-01-01': {reason: 'New Year\'s Day', hours: '08:00'},
            '2020-04-10': {reason: 'Good Friday', hours: '08:00'}
        };
        waivedWorkdays.set(waivedEntries);

        const invalidEntriesContent =
        `[{"type": "flexible", "date": "not-a-date", "data": "day-begin", "hours": "08:00"},
          {"type": "waived", "date": "2020-01-01", "data": "example waiver 2", "hours": "not-an-hour"},
          {"type": "flexible", "date": "not-a-date", "data": "day-end", "hours": "17:00"},
          {"type": "flexible", "date": "not-a-date", "values": "not-an-array"},
          {"type": "not-a-type", "date": "not-a-date", "data": "day-end", "hours": "17:00"}
         ]`;
        fs.writeFileSync(invalidEntriesFile, invalidEntriesContent, 'utf8');
    });

    describe('exportDatabaseToFile', function()
    {
        it('Check that export works', () =>
        {
            assert.strictEqual(ImportExport.exportDatabaseToFile(path.join(folder, 'exported_file.ttldb')), true);
            assert.strictEqual(ImportExport.exportDatabaseToFile('/not/a/valid/path'), false);
        });
    });

    describe('importDatabaseFromFile', function()
    {
        it('Check that import works', () =>
        {
            assert.strictEqual(ImportExport.importDatabaseFromFile([path.join(folder, 'exported_file.ttldb')])['result'], true);
            assert.strictEqual(ImportExport.importDatabaseFromFile(['/not/a/valid/path'])['result'], false);
            assert.strictEqual(ImportExport.importDatabaseFromFile(['/not/a/valid/path'])['failed'], 0);
            assert.strictEqual(ImportExport.importDatabaseFromFile([invalidEntriesFile])['result'], false);
            assert.strictEqual(ImportExport.importDatabaseFromFile([invalidEntriesFile])['failed'], 5);
        });
    });

    after(() =>
    {
        fs.rmSync(folder, {recursive: true});
    });
});
