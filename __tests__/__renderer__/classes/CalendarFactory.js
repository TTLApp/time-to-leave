'use strict';

const assert = require('assert');
import { CalendarFactory } from '../../../renderer/classes/CalendarFactory.js';
import { DayCalendar } from '../../../renderer/classes/DayCalendar.js';
import { MonthCalendar } from '../../../renderer/classes/MonthCalendar.js';

import { calendarApi } from '../../../renderer/preload-scripts/calendar-api.js';

// Mocked APIs from the preload script of the calendar window
window.mainApi = calendarApi;

jest.mock('../../../renderer/classes/BaseCalendar.js', () =>
{
    class BaseCalendar
    {
        constructor() { }

        async reload() { }
    }

    return { BaseCalendar };
});

jest.mock('electron', () =>
{
    const originalModule = jest.requireActual('electron');
    return {
        __esModule: true,
        ...originalModule,
        ipcRenderer: {
            ...originalModule.ipcRenderer,
            send: jest.fn()
        }
    };
});

const { ipcRenderer } = require('electron');

describe('CalendarFactory', () =>
{
    test('Should fail wrong view', async() =>
    {
        const promise = CalendarFactory.getInstance({
            view: 'not_supported'
        }, {});
        assert.strictEqual(promise instanceof Promise, true);
        promise.then(() => {}).catch((reason) =>
        {
            assert.strictEqual(reason, 'Could not instantiate not_supported');
        });
    });

    describe('DayCalendar', () =>
    {
        test('Should fail wrong view', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'DayCalendar',
                },
                updateLanguageData: () => { calls++; },
                updatePreferences: () => { calls++; },
                redraw: () => { calls++; },
            };
            const calendar = await CalendarFactory.getInstance({
                view: 'day',
            }, {}, testCalendar);
            expect(calendar).toEqual(testCalendar);
            assert.strictEqual(calls, 3);
        });

        test('Should return new calendar without resizing', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'NOT DayCalendar',
                },
                updateLanguageData: () => { calls++; },
                updatePreferences: () => { calls++; },
                redraw: () => { calls++; },
            };
            const calendar = await CalendarFactory.getInstance({
                view: 'day',
            }, {}, testCalendar);
            assert.strictEqual(calendar instanceof DayCalendar, true);
            assert.strictEqual(calls, 0);
        });

        test('Should return new calendar without resizing', async() =>
        {
            let calls = 0;
            jest.spyOn(ipcRenderer, 'send').mockImplementation(() =>
            {
                calls++;
            });
            const calendar = await CalendarFactory.getInstance({
                view: 'day',
            }, {}, undefined);
            assert.strictEqual(calendar instanceof DayCalendar, true);
            assert.strictEqual(calls, 0);
        });

        test('Should return new calendar with resizing', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'NOT DayCalendar',
                },
                updateLanguageData: () => { calls++; },
                updatePreferences: () => { calls++; },
                redraw: () => { calls++; },
            };
            jest.spyOn(ipcRenderer, 'send').mockImplementation(() =>
            {
                calls++;
            });
            const calendar = await CalendarFactory.getInstance({
                view: 'day',
            }, {}, testCalendar);
            assert.strictEqual(calendar instanceof DayCalendar, true);
            assert.strictEqual(calls, 1);
        });
    });

    describe('MonthCalendar', () =>
    {
        test('Should fail wrong view', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'MonthCalendar',
                },
                updateLanguageData: () => { calls++; },
                updatePreferences: () => { calls++; },
                redraw: () => { calls++; },
            };
            const calendar = await CalendarFactory.getInstance({
                view: 'month',
            }, {}, testCalendar);
            expect(calendar).toEqual(testCalendar);
            assert.strictEqual(calls, 3);
        });

        test('Should return new calendar without resizing', async() =>
        {
            let calls = 0;
            jest.spyOn(ipcRenderer, 'send').mockImplementation(() =>
            {
                calls++;
            });
            const calendar = await CalendarFactory.getInstance({
                view: 'month',
            }, {}, undefined);
            assert.strictEqual(calendar instanceof MonthCalendar, true);
            assert.strictEqual(calls, 0);
        });

        test('Should return new calendar with resizing', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'NOT MonthCalendar',
                },
                updateLanguageData: () => { calls++; },
                updatePreferences: () => { calls++; },
                redraw: () => { calls++; },
            };
            jest.spyOn(ipcRenderer, 'send').mockImplementation(() =>
            {
                calls++;
            });
            const calendar = await CalendarFactory.getInstance({
                view: 'month',
            }, {}, testCalendar);
            assert.strictEqual(calendar instanceof MonthCalendar, true);
            assert.strictEqual(calls, 1);
        });
    });
});