'use strict';
const Store = require('electron-store');
const {importDatabaseFromGoogleDrive} = require('../../js/import-export-online');

// first five entries are invalid, second five are valid
const invalidEntriesContent =
`[{"type": "regular", "date": "not-a-date", "data": "day-begin", "hours": "08:00"},
  {"type": "waived", "date": "2020-01-01", "data": "example waiver 2", "hours": "not-an-hour"},
  {"type": "regular", "date": "not-a-date", "data": "day-end", "hours": "17:00"},
  {"type": "flexible", "date": "not-a-date", "values": "not-an-array"},
  {"type": "not-a-type", "date": "not-a-date", "data": "day-end", "hours": "17:00"},
  {"type": "flexible","date": "2020-4-1","values": ["08:00","12:00","13:00","17:00"]},
  {"type": "flexible","date": "2020-4-2","values": ["07:00","11:00","14:00","18:00"]},
  {"type": "waived","date": "2019-12-31","data": "New Year's eve","hours": "08:00"},
  {"type": "waived","date": "2020-01-01","data": "New Year's Day","hours": "08:00"},
  {"type": "waived","date": "2020-04-10","data": "Good Friday","hours": "08:00"}
 ]`;

jest.mock('../../js/google-drive', () => ({
    authorize: jest.fn(),
    searchFile: jest.fn(),
    downloadFile: jest.fn().mockResolvedValue(invalidEntriesContent),
}));

describe('Faulty import from google drive', function()
{
    process.env.NODE_ENV = 'test';
    const store = new Store();
    const flexibleStore = new Store({ name: 'flexible-store' });
    const waivedWorkdays = new Store({ name: 'waived-workdays' });
    store.clear();
    flexibleStore.clear();
    waivedWorkdays.clear();

    test('Check that invalid json is not imported', async() =>
    {
        expect(store.size).toBe(0);
        expect(flexibleStore.size).toBe(0);
        expect(waivedWorkdays.size).toBe(0);

        const data = await importDatabaseFromGoogleDrive();

        expect(data['result']).not.toBeTruthy();
        expect(data['failed']).toBe(5);
        expect(data['total']).toBe(10);

        expect(store.size).toBe(0);
        expect(flexibleStore.size).toBe(2);
        expect(waivedWorkdays.size).toBe(3);
    });
});