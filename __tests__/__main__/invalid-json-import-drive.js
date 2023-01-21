/* eslint-disable no-undef */
'use strict';
const Store = require('electron-store');
const { importDatabaseFromGoogleDrive } = require('../../js/import-export-online');

const notValidJSON =
'[{"type": "flexible","date": "2022-11-6","values": "08:44","08:45"]}]';

jest.mock('../../js/google-drive', () => ({
    authorize: jest.fn(),
    searchFile: jest.fn(),
    downloadFile: jest.fn().mockResolvedValue(notValidJSON),
}));

describe('Invalid import from google drive', function()
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
        expect(data['failed']).toBe(0);
        expect(data['total']).toBe(0);

        expect(store.size).toBe(0);
        expect(flexibleStore.size).toBe(0);
        expect(waivedWorkdays.size).toBe(0);
    });
});