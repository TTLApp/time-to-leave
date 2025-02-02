'use strict';

import '../../../__mocks__/jquery.mjs';

import assert from 'assert';
import Store from 'electron-store';

import TimeBalance from '../../../js/time-balance.mjs';
import { getDefaultPreferences } from '../../../js/user-preferences.mjs';
import { BaseCalendar } from '../../../renderer/classes/BaseCalendar.js';
import { CalendarFactory } from '../../../renderer/classes/CalendarFactory.js';
import { calendarApi } from '../../../renderer/preload-scripts/calendar-api.mjs';

window.$.fn.extend({
    mousewheel: function()
    {
        /*mocked empty function*/
    },

    unmousewheel: function()
    {
        /*mocked empty function*/
    }
});

describe('DayCalendar class Tests', () =>
{
    const entryStore = new Store({name: 'flexible-store'});
    const waivedWorkdays = new Store({name: 'waived-workdays'});
    const regularEntries = {
        '2020-3-1': {'values': ['08:00', '12:00', '13:00', '17:00']},
        '2020-3-2': {'values': ['10:00', '18:00']}
    };
    const waivedEntries = {
        '2019-12-31': { reason: 'New Year\'s eve', hours: '08:00' },
        '2020-01-01': { reason: 'New Year\'s Day', hours: '08:00' },
        '2020-04-10': { reason: 'Good Friday', hours: '08:00' }
    };

    before(() =>
    {
        entryStore.clear();
        entryStore.set(regularEntries);

        waivedWorkdays.clear();
        waivedWorkdays.set(waivedEntries);

        // APIs from the preload script of the calendar window
        window.calendarApi = calendarApi;
        window.rendererApi = {};

        // Stubbing methods that don't need the actual implementation for the tests
        window.calendarApi.toggleTrayPunchTime = () => {};
        BaseCalendar.prototype._getTranslation = () => {};
        BaseCalendar.prototype.redraw = () => {};

        window.calendarApi.getStoreContents = () => { return new Promise((resolve) => { resolve(entryStore.store); }); };
        window.rendererApi.getWaiverStoreContents = () => { return new Promise((resolve) => resolve(waivedWorkdays.store)); };
        window.calendarApi.setStoreData = (key, contents) =>
        {
            return new Promise((resolve) =>
            {
                entryStore.set(key, contents);
                resolve(true);
            });
        };
        window.calendarApi.deleteStoreData = (key) =>
        {
            return new Promise((resolve) =>
            {
                entryStore.delete(key);
                resolve(true);
            });
        };
        window.calendarApi.computeAllTimeBalanceUntilPromise = (targetDate) =>
        {
            return new Promise((resolve) =>
            {
                resolve(TimeBalance.computeAllTimeBalanceUntilAsync(targetDate));
            });
        };
    });

    const testPreferences = structuredClone(getDefaultPreferences());
    testPreferences['view'] = 'day';
    const languageData = {'language': 'en', 'data': {'dummy_string': 'dummy_string_translated'}};

    const today = new Date();
    let calendar;
    beforeEach(async() =>
    {
        calendar = await CalendarFactory.getInstance(testPreferences, languageData);
    });

    it('DayCalendar starts with today\'s date', () =>
    {
        assert.strictEqual(calendar.constructor.name, 'DayCalendar');
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
    });

    it('DayCalendar "today" methods return today\'s date', () =>
    {
        assert.strictEqual(calendar._getTodayDate(), today.getDate());
        assert.strictEqual(calendar._getTodayYear(), today.getFullYear());
        assert.strictEqual(calendar._getTodayMonth(), today.getMonth());
    });

    it('DayCalendar internal storage correct loading', () =>
    {
        assert.deepStrictEqual(calendar._internalStore['2020-3-1'], regularEntries['2020-3-1']);
        assert.deepStrictEqual(calendar._getStore('2020-3-1'), regularEntries['2020-3-1']['values']);
        assert.strictEqual(calendar._internalStore['2010-3-1'], undefined);
        assert.deepStrictEqual(calendar._getStore('2010-3-1'), []);

        assert.strictEqual(Object.keys(calendar._internalStore).length, 2);
        assert.strictEqual(entryStore.size, 2);

        calendar._setStore('2010-3-1', ['05:00']);
        assert.deepStrictEqual(calendar._internalStore['2010-3-1'], {'values': ['05:00']});
        assert.deepStrictEqual(calendar._getStore('2010-3-1'), ['05:00']);

        assert.strictEqual(Object.keys(calendar._internalStore).length, 3);
        assert.strictEqual(entryStore.size, 3);

        calendar._removeStore('2010-3-1');
        assert.strictEqual(calendar._internalStore['2010-3-1'], undefined);
        assert.deepStrictEqual(calendar._getStore('2010-3-1'), []);

        // remove just sets the value as undefined in internal store, if it existed
        assert.strictEqual(Object.keys(calendar._internalStore).length, 3);
        assert.strictEqual(entryStore.size, 2);
    });

    it('DayCalendar internal waiver storage correct loading', async() =>
    {
        // Waiver Store internally saves the human month index, but the calendar methods use JS month index
        assert.deepStrictEqual(calendar._internalWaiverStore['2019-12-31'], { reason: 'New Year\'s eve', hours: '08:00' });
        assert.deepStrictEqual(calendar._getWaiverStore(2019, 11, 31), { reason: 'New Year\'s eve', hours: '08:00' });
        assert.strictEqual(calendar._internalWaiverStore['2010-12-31'], undefined);
        assert.strictEqual(calendar._getWaiverStore(2010, 11, 31), undefined);

        assert.strictEqual(waivedWorkdays.size, 3);
        assert.strictEqual(Object.keys(calendar._internalWaiverStore).length, 3);

        const newWaivedEntry = {
            '2010-12-31': { reason: 'New Year\'s eve', hours: '08:00' }
        };
        waivedWorkdays.set(newWaivedEntry);

        assert.strictEqual(calendar._internalWaiverStore['2010-12-31'], undefined);
        assert.strictEqual(calendar._getWaiverStore(2010, 11, 31), undefined);

        await calendar.loadInternalWaiveStore();

        assert.strictEqual(Object.keys(calendar._internalWaiverStore).length, 4);

        assert.deepStrictEqual(calendar._internalWaiverStore['2010-12-31'], { reason: 'New Year\'s eve', hours: '08:00' });
        assert.deepStrictEqual(calendar._getWaiverStore(2010, 11, 31), { reason: 'New Year\'s eve', hours: '08:00' });
    });

    describe('Testing getDayTotal', () =>
    {
        it('getDayTotal on workdays', () =>
        {
            // Original dates
            assert.strictEqual(calendar._getDayTotal(2020, 3, 1), '08:00');
            assert.strictEqual(calendar._getDayTotal(2020, 3, 2), '08:00');

            // Day that doesn't have contents
            assert.strictEqual(calendar._getDayTotal(2010, 3, 1), undefined);

            // Adding a different set
            calendar._setStore('2010-3-1', ['05:00', '07:00', '09:00', '10:00']);
            assert.deepStrictEqual(calendar._getStore('2010-3-1'), ['05:00', '07:00', '09:00', '10:00']);
            assert.strictEqual(calendar._getDayTotal(2010, 3, 1), '03:00');

            // Clearing entry - back to undefined value
            calendar._removeStore('2010-3-1');
            assert.strictEqual(calendar._getDayTotal(2010, 3, 1), undefined);
        });

        it('getDayTotal on waived days', async() =>
        {
            // Original dates
            assert.strictEqual(calendar._getDayTotal(2019, 11, 31), '08:00');
            assert.strictEqual(calendar._getDayTotal(2020, 0, 1), '08:00');
            assert.strictEqual(calendar._getDayTotal(2020, 3, 10), '08:00');

            // Day that doesn't have contents
            assert.strictEqual(calendar._getDayTotal(2010, 2, 1), undefined);

            // Adding a different set
            const newWaivedEntry = {
                '2010-03-01': { reason: 'Test', hours: '06:00' }
            };
            waivedWorkdays.set(newWaivedEntry);

            await calendar.loadInternalWaiveStore();
            assert.deepStrictEqual(calendar._getWaiverStore(2010, 2, 1), { reason: 'Test', hours: '06:00' });
            assert.strictEqual(calendar._getDayTotal(2010, 2, 1), '06:00');

            // Clearing entry - back to undefined value
            waivedWorkdays.clear();
            waivedWorkdays.set(waivedEntries);
            await calendar.loadInternalWaiveStore();
            assert.strictEqual(calendar._getDayTotal(2010, 2, 1), undefined);
        });
    });

    it('DayCalendar Day Changes', () =>
    {
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());

        const expectedNextDay = new Date(today);
        expectedNextDay.setDate(expectedNextDay.getDate() + 1);
        const expectedPrevDay = new Date(today);
        expectedPrevDay.setDate(expectedPrevDay.getDate() - 1);

        calendar._nextDay();
        assert.strictEqual(calendar._getCalendarDate(), expectedNextDay.getDate());
        assert.strictEqual(calendar._isCalendarOnDate(expectedNextDay), true);
        assert.strictEqual(calendar._isCalendarOnDate(expectedPrevDay), false);

        calendar._prevDay();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());

        calendar._prevDay();
        assert.strictEqual(calendar._getCalendarDate(), expectedPrevDay.getDate());
        assert.strictEqual(calendar._isCalendarOnDate(expectedNextDay), false);
        assert.strictEqual(calendar._isCalendarOnDate(expectedPrevDay), true);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());

        calendar._changeDay(1);
        assert.strictEqual(calendar._getCalendarDate(), expectedNextDay.getDate());

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
    });

    it('DayCalendar Month Changes', () =>
    {
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        const expectedNextMonth = today.getMonth() + 1 === 12 ? 0 : (today.getMonth() + 1);
        const expectedPrevMonth = today.getMonth() === 0 ? 11 : (today.getMonth() - 1);

        // The Distance to next month is the amount of days in the month minus the current day, plus 2
        // The plus 2 accounts for "finishing" today and moving to the next day (of the next month)
        // In JS, day 0 of a month is the last day of previous month. Because of this we need to
        // add one to retrieve the number of days in a month.
        const distToNextMonth = (new Date(today.getFullYear(), today.getMonth() + 1, 0)).getDate() - today.getDate() + 2;
        const distToPrevMonth = today.getDate() + 1;

        for (let i = 0; i < distToNextMonth; i++)
        {
            calendar._nextDay();
        }

        assert.strictEqual(calendar._getCalendarMonth(), expectedNextMonth);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());

        for (let i = 0; i < distToPrevMonth; i++)
        {
            calendar._prevDay();
        }

        assert.strictEqual(calendar._getCalendarMonth(), expectedPrevMonth);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
    });

    it('DayCalendar Year Changes', () =>
    {
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
        const isLeapYear = ((today.getFullYear() % 4 === 0) && (today.getFullYear() % 100 !== 0)) || (today.getFullYear() % 400 === 0);
        const expectedNextYear = today.getFullYear() + 1;
        const expectedPrevYear = today.getFullYear() - 1;

        // If it's a leap year and Jan 1st, need to advance 366 days to reach the next year
        const numberOfNextDays = (isLeapYear && today.getDate() === 1 && today.getMonth() === 0) ? 366 : 365;
        for (let i = 0; i < numberOfNextDays; i++)
        {
            calendar._nextDay();
        }

        assert.strictEqual(calendar._getCalendarYear(), expectedNextYear);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());

        // If it's a leap year and Dec 31st, need to go back 366 days to reach the prev year
        const numberOfPrevDays = (isLeapYear && today.getDate() === 31 && today.getMonth() === 11) ? 366 : 365;
        for (let i = 0; i < numberOfPrevDays; i++)
        {
            calendar._prevDay();
        }

        assert.strictEqual(calendar._getCalendarYear(), expectedPrevYear);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
    });

    describe('DayCalendar RefreshOnDayChange', () =>
    {
        it('DayCalendar refresh set correctly', () =>
        {
            // Calendar is set as if someone was looking at previous day
            calendar._prevDay();
            const prevDayDate = calendar._calendarDate;

            // Refreshing with the date being looked at should push it to today
            calendar.refreshOnDayChange(prevDayDate.getDate(), prevDayDate.getMonth(), prevDayDate.getFullYear());

            assert.strictEqual(calendar._getCalendarDate(), today.getDate());
            assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
            assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        });

        it('DayCalendar refresh set to another day', () =>
        {
            // Calendar is set as if someone was looking at previous day
            calendar._prevDay();

            // Refreshing with a date not being looked at should not push it to today
            calendar.refreshOnDayChange(today.getDate(), today.getMonth(), today.getFullYear());

            assert.notStrictEqual(calendar._getCalendarDate(), today.getDate());
        });
    });

    it('MonthCalendar to DayCalendar', async() =>
    {
        const testPreferences = structuredClone(getDefaultPreferences());
        testPreferences['view'] = 'month';
        let calendar = await CalendarFactory.getInstance(testPreferences, languageData);
        assert.strictEqual(calendar.constructor.name, 'MonthCalendar');

        testPreferences['view'] = 'day';
        calendar = await CalendarFactory.getInstance(testPreferences, languageData, calendar);
        assert.strictEqual(calendar.constructor.name, 'DayCalendar');
    });
});
