/* eslint-disable no-undef */
const {
    exportDatabaseToFile,
    importDatabaseFromFile,
    validEntry
} = require('../../js/import-export');

const fs = require('fs');
const Store = require('electron-store');
const path = require('path');

describe('Import export', function() {
    process.env.NODE_ENV = 'test';

    describe('validEntry(entry)', function() {
        const goodRegularEntry = {'type': 'regular', 'date': '2020-06-03', 'data': 'day-begin', 'hours': '08:00'};
        const goodWaivedEntry = {'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00'};
        const badRegularEntry = {'type': 'regular', 'date': 'not-a-date', 'data': 'day-begin', 'hours': '08:00'};
        const badWaivedEntry = {'type': 'regular', 'date': '2020-06-03', 'data': 'day-begin', 'hours': 'not-an-hour'};
        test('should be valid', () => {
            expect(validEntry(goodRegularEntry)).toBeTruthy();
            expect(validEntry(goodWaivedEntry)).toBeTruthy();
        });

        test('should not be valid', () => {
            expect(validEntry(badRegularEntry)).not.toBeTruthy();
            expect(validEntry(badWaivedEntry)).not.toBeTruthy();
        });
    });

    const store = new Store();
    const waivedWorkdays = new Store({name: 'waived-workdays'});

    store.clear();
    const regularEntries = {
        '2020-3-1-day-begin': '08:00',
        '2020-3-1-day-end': '17:00',
        '2020-3-1-day-total': '08:00',
        '2020-3-1-lunch-begin': '12:00',
        '2020-3-1-lunch-end': '13:00',
        '2020-3-1-lunch-total': '01:00',
        '2020-3-2-day-begin': '10:00',
        '2020-3-2-day-end': '18:00',
        '2020-3-2-day-total': '08:00',
    };
    store.set(regularEntries);

    waivedWorkdays.clear();
    const waivedEntries = {
        '2019-12-31': {reason: 'New Year\'s eve', hours: '08:00'},
        '2020-01-01': {reason: 'example waiver 2', hours: '08:00'},
        '2020-04-10': {reason: 'example waiver 1', hours: '08:00'}
    };
    waivedWorkdays.set(waivedEntries);

    const folder = fs.mkdtempSync('import-export');

    describe('exportDatabaseToFile', function() {
        test('Check that export works', () => {
            expect(exportDatabaseToFile(path.join(folder, 'exported_file.ttldb'))).toBeTruthy();
            expect(exportDatabaseToFile('/not/a/valid/path')).not.toBeTruthy();
        });
    });

    const invalidEntriesContent =
        `[{"type": "regular", "date": "not-a-date", "data": "day-begin", "hours": "08:00"},
          {"type": "waived", "date": "2020-01-01", "data": "example waiver 2", "hours": "not-an-hour"},
          {"type": "regular", "date": "not-a-date", "data": "day-end", "hours": "17:00"},
          {"type": "not-a-type", "date": "not-a-date", "data": "day-end", "hours": "17:00"}
         ]`;
    const invalidEntriesFile = path.join(folder, 'invalid.ttldb');
    fs.writeFileSync(invalidEntriesFile, invalidEntriesContent, 'utf-8');

    describe('importDatabaseFromFile', function() {
        test('Check that import works', () => {
            expect(importDatabaseFromFile([path.join(folder, 'exported_file.ttldb')])['result']).toBeTruthy();
            expect(importDatabaseFromFile(['/not/a/valid/path'])['result']).not.toBeTruthy();
            expect(importDatabaseFromFile(['/not/a/valid/path'])['failed']).toBe(0);
            expect(importDatabaseFromFile([invalidEntriesFile])['result']).not.toBeTruthy();
            expect(importDatabaseFromFile([invalidEntriesFile])['failed']).toBe(4);
        });
    });

});
