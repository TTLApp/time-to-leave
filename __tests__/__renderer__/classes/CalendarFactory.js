'use strict';

const assert = require('assert');
import { CalendarFactory } from '../../../renderer/classes/CalendarFactory.js';
import { FlexibleDayCalendar } from '../../../renderer/classes/FlexibleDayCalendar.js';
import { FlexibleMonthCalendar } from '../../../renderer/classes/FlexibleMonthCalendar.js';

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

    describe('FlexibleDayCalendar', () =>
    {
        test('Should fail wrong view', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'FlexibleDayCalendar',
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
                    name: 'NOT FlexibleDayCalendar',
                },
                updateLanguageData: () => { calls++; },
                updatePreferences: () => { calls++; },
                redraw: () => { calls++; },
            };
            const calendar = await CalendarFactory.getInstance({
                view: 'day',
            }, {}, testCalendar);
            assert.strictEqual(calendar instanceof FlexibleDayCalendar, true);
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
            assert.strictEqual(calendar instanceof FlexibleDayCalendar, true);
            assert.strictEqual(calls, 0);
        });

        test('Should return new calendar with resizing', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'NOT FlexibleDayCalendar',
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
            assert.strictEqual(calendar instanceof FlexibleDayCalendar, true);
            assert.strictEqual(calls, 1);
        });
    });

    describe('FlexibleMonthCalendar', () =>
    {
        test('Should fail wrong view', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'FlexibleMonthCalendar',
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
            assert.strictEqual(calendar instanceof FlexibleMonthCalendar, true);
            assert.strictEqual(calls, 0);
        });

        test('Should return new calendar with resizing', async() =>
        {
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'NOT FlexibleMonthCalendar',
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
            assert.strictEqual(calendar instanceof FlexibleMonthCalendar, true);
            assert.strictEqual(calls, 1);
        });
    });
});