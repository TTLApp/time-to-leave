/* eslint-disable no-undef */
'use strict';

import assert from 'assert';
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';

import {
    exportDatabaseToFile,
    importDatabaseFromFile,
    validEntry,
} from '../../js/import-export.js';

describe('Import export', function()
{
    process.env.NODE_ENV = 'test';

    describe('validEntry(entry)', function()
    {
        const goodEntry = {'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00']};
        const goodWaivedEntry = {'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00'};
        const badEntry = {'type': 'flexible', 'date': '2020-06-03', 'values': ['not-an-hour']};
        const badEntry2 = {'type': 'flexible', 'date': '2020-06-03', 'values': 'not-an-array'};
        const badWaivedEntry = {'type': 'regular', 'date': '2020-06-03', 'data': 'day-begin', 'hours': 'not-an-hour'};
        it('should be valid', () =>
        {
            assert.strictEqual(validEntry(goodWaivedEntry), true);
            assert.strictEqual(validEntry(goodEntry), true);
        });

        it('should not be valid', () =>
        {
            assert.strictEqual(validEntry(badWaivedEntry), false);
            assert.strictEqual(validEntry(badEntry), false);
            assert.strictEqual(validEntry(badEntry2), false);
        });
    });

    const calendarStore = new Store({name: 'flexible-store'});
    const waivedWorkdays = new Store({name: 'waived-workdays'});

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

    const folder = fs.mkdtempSync('import-export');

    describe('exportDatabaseToFile', function()
    {
        it('Check that export works', () =>
        {
            assert.strictEqual(exportDatabaseToFile(path.join(folder, 'exported_file.ttldb')), true);
            assert.strictEqual(exportDatabaseToFile('/not/a/valid/path'), false);
        });
    });

    const invalidEntriesContent =
        `[{"type": "flexible", "date": "not-a-date", "data": "day-begin", "hours": "08:00"},
          {"type": "waived", "date": "2020-01-01", "data": "example waiver 2", "hours": "not-an-hour"},
          {"type": "flexible", "date": "not-a-date", "data": "day-end", "hours": "17:00"},
          {"type": "flexible", "date": "not-a-date", "values": "not-an-array"},
          {"type": "not-a-type", "date": "not-a-date", "data": "day-end", "hours": "17:00"}
         ]`;
    const invalidEntriesFile = path.join(folder, 'invalid.ttldb');
    fs.writeFileSync(invalidEntriesFile, invalidEntriesContent, 'utf8');

    describe('importDatabaseFromFile', function()
    {
        it('Check that import works', () =>
        {
            assert.strictEqual(importDatabaseFromFile([path.join(folder, 'exported_file.ttldb')])['result'], true);
            assert.strictEqual(importDatabaseFromFile(['/not/a/valid/path'])['result'], false);
            assert.strictEqual(importDatabaseFromFile(['/not/a/valid/path'])['failed'], 0);
            assert.strictEqual(importDatabaseFromFile([invalidEntriesFile])['result'], false);
            assert.strictEqual(importDatabaseFromFile([invalidEntriesFile])['failed'], 5);
        });
    });

    after(() =>
    {
        fs.rmSync(folder, {recursive: true});
    });
});
