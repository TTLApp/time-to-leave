'use strict';

import '../../../__mocks__/jquery.mjs';

import assert from 'assert';
import { stub } from 'sinon';
import { CalendarFactory } from '../../../renderer/classes/CalendarFactory.js';
import { BaseCalendar } from '../../../renderer/classes/BaseCalendar.js';
import { DayCalendar } from '../../../renderer/classes/DayCalendar.js';
import { MonthCalendar } from '../../../renderer/classes/MonthCalendar.js';

import { calendarApi } from '../../../renderer/preload-scripts/calendar-api.mjs';

describe('CalendarFactory', () =>
{
    const DayCalendarPrototype = Object.getPrototypeOf(DayCalendar);
    const MonthCalendarPrototype = Object.getPrototypeOf(MonthCalendar);
    before(() =>
    {
        // Mocked APIs from the preload script of the calendar window
        window.calendarApi = calendarApi;

        stub(CalendarFactory, 'ResizeCalendar');

        Object.setPrototypeOf(DayCalendar, stub());
        Object.setPrototypeOf(MonthCalendar, stub());
        stub(BaseCalendar.prototype, 'reload');
    });

    it('Should fail wrong view', () =>
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
        it('Should fail wrong view', async() =>
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
            assert.strictEqual(calendar, testCalendar);
            assert.strictEqual(calls, 3);
        });

        it('Should return new calendar with resizing if passing in an instance that is not a DayCalendar', async() =>
        {
            CalendarFactory.ResizeCalendar.resetHistory();
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
            assert.strictEqual(CalendarFactory.ResizeCalendar.calledOnce, true);
        });

        it('Should return new calendar without resizing if passing in an undefined instance', async() =>
        {
            CalendarFactory.ResizeCalendar.resetHistory();
            const calendar = await CalendarFactory.getInstance({
                view: 'day',
            }, {}, undefined);
            assert.strictEqual(calendar instanceof DayCalendar, true);
            assert.strictEqual(CalendarFactory.ResizeCalendar.notCalled, true);
        });
    });

    describe('MonthCalendar', () =>
    {
        it('Should fail wrong view', async() =>
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
            assert.strictEqual(calendar, testCalendar);
            assert.strictEqual(calls, 3);
        });

        it('Should return new calendar without resizing if passing in an undefined instance', async() =>
        {
            CalendarFactory.ResizeCalendar.resetHistory();
            const calendar = await CalendarFactory.getInstance({
                view: 'month',
            }, {}, undefined);
            assert.strictEqual(calendar instanceof MonthCalendar, true);
            assert.strictEqual(CalendarFactory.ResizeCalendar.notCalled, true);
        });

        it('Should return new calendar with resizing if passing in an instance that is not a MonthCalendar', async() =>
        {
            CalendarFactory.ResizeCalendar.resetHistory();
            let calls = 0;
            const testCalendar = {
                constructor: {
                    name: 'NOT MonthCalendar',
                },
                updateLanguageData: () => { calls++; },
                updatePreferences: () => { calls++; },
                redraw: () => { calls++; },
            };
            const calendar = await CalendarFactory.getInstance({
                view: 'month',
            }, {}, testCalendar);
            assert.strictEqual(calendar instanceof MonthCalendar, true);
            assert.strictEqual(calls, 0);
            assert.strictEqual(CalendarFactory.ResizeCalendar.calledOnce, true);
        });
    });

    after(() =>
    {
        Object.setPrototypeOf(DayCalendar, DayCalendarPrototype);
        Object.setPrototypeOf(MonthCalendar, MonthCalendarPrototype);
        BaseCalendar.prototype.reload.restore();
        CalendarFactory.ResizeCalendar.restore();
    });
});
