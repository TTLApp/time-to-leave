/* eslint-disable no-undef */
'use strict';

const assert = require('assert');
import Store from 'electron-store';
import { computeAllTimeBalanceUntilAsync } from '../../../js/time-balance.js';
import { defaultPreferences } from '../../../js/user-preferences.js';
import { CalendarFactory } from '../../../renderer/classes/CalendarFactory.js';
import { calendarApi } from '../../../renderer/preload-scripts/calendar-api.js';

window.$ = window.jQuery = require('jquery');

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

// APIs from the preload script of the calendar window
window.mainApi = calendarApi;

jest.mock('../../../renderer/i18n-translator.js', () => ({
    translatePage: jest.fn().mockReturnThis(),
    getTranslationInLanguageData: jest.fn().mockReturnThis()
}));

const languageData = {'language': 'en', 'data': {'dummy_string': 'dummy_string_translated'}};

const entryStore = new Store({name: 'flexible-store'});
const waivedWorkdays = new Store({name: 'waived-workdays'});

window.mainApi.getStoreContents = () => { return new Promise((resolve) => { resolve(entryStore.store); }); };
window.mainApi.getWaiverStoreContents = () => { return new Promise((resolve) => resolve(waivedWorkdays.store)); };
window.mainApi.setStoreData = (key, contents) =>
{
    return new Promise((resolve) =>
    {
        entryStore.set(key, contents);
        resolve(true);
    });
};
window.mainApi.deleteStoreData = (key) =>
{
    return new Promise((resolve) =>
    {
        entryStore.delete(key);
        resolve(true);
    });
};
window.mainApi.computeAllTimeBalanceUntilPromise = (targetDate) =>
{
    return new Promise((resolve) =>
    {
        resolve(computeAllTimeBalanceUntilAsync(targetDate));
    });
};

describe('DayCalendar class Tests', () =>
{
    process.env.NODE_ENV = 'test';

    entryStore.clear();
    const regularEntries = {
        '2020-3-1': {'values': ['08:00', '12:00', '13:00', '17:00']},
        '2020-3-2': {'values': ['10:00', '18:00']}
    };
    entryStore.set(regularEntries);

    waivedWorkdays.clear();
    const waivedEntries = {
        '2019-12-31': { reason: 'New Year\'s eve', hours: '08:00' },
        '2020-01-01': { reason: 'New Year\'s Day', hours: '08:00' },
        '2020-04-10': { reason: 'Good Friday', hours: '08:00' }
    };
    waivedWorkdays.set(waivedEntries);

    const today = new Date();
    const testPreferences = defaultPreferences;
    testPreferences['view'] = 'day';

    let calendar;
    beforeAll(() =>
    {
        CalendarFactory.getInstance(testPreferences, languageData).then((_c) => { calendar = _c; });
    });

    test('DayCalendar starts with today\'s date', () =>
    {
        assert.strictEqual(calendar.constructor.name, 'DayCalendar');
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
    });

    test('DayCalendar "today" methods return today\'s date', () =>
    {
        assert.strictEqual(calendar._getTodayDate(), today.getDate());
        assert.strictEqual(calendar._getTodayYear(), today.getFullYear());
        assert.strictEqual(calendar._getTodayMonth(), today.getMonth());
    });

    test('DayCalendar internal storage correct loading', () =>
    {
        expect(calendar._internalStore['2020-3-1']).toStrictEqual(regularEntries['2020-3-1']);
        expect(calendar._getStore('2020-3-1')).toStrictEqual(regularEntries['2020-3-1']['values']);
        assert.strictEqual(calendar._internalStore['2010-3-1'], undefined);
        expect(calendar._getStore('2010-3-1')).toStrictEqual([]);

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(2);
        expect(entryStore.size).toStrictEqual(2);

        calendar._setStore('2010-3-1', ['05:00']);
        expect(calendar._internalStore['2010-3-1']).toStrictEqual({'values': ['05:00']});
        expect(calendar._getStore('2010-3-1')).toStrictEqual(['05:00']);

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(3);
        expect(entryStore.size).toStrictEqual(3);

        calendar._removeStore('2010-3-1');
        assert.strictEqual(calendar._internalStore['2010-3-1'], undefined);
        expect(calendar._getStore('2010-3-1')).toStrictEqual([]);

        // remove just sets the value as undefined in internal store, if it existed
        expect(Object.keys(calendar._internalStore).length).toStrictEqual(3);
        expect(entryStore.size).toStrictEqual(2);
    });

    test('DayCalendar internal waiver storage correct loading', async() =>
    {
        // Waiver Store internally saves the human month index, but the calendar methods use JS month index
        expect(calendar._internalWaiverStore['2019-12-31']).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
        expect(calendar._getWaiverStore(2019, 11, 31)).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
        expect(calendar._internalWaiverStore['2010-12-31']).toStrictEqual(undefined);
        expect(calendar._getWaiverStore(2010, 11, 31)).toStrictEqual(undefined);

        expect(waivedWorkdays.size).toStrictEqual(3);
        expect(Object.keys(calendar._internalWaiverStore).length).toStrictEqual(3);

        const newWaivedEntry = {
            '2010-12-31': { reason: 'New Year\'s eve', hours: '08:00' }
        };
        waivedWorkdays.set(newWaivedEntry);

        expect(calendar._internalWaiverStore['2010-12-31']).toStrictEqual(undefined);
        expect(calendar._getWaiverStore(2010, 11, 31)).toStrictEqual(undefined);

        await calendar.loadInternalWaiveStore();

        expect(Object.keys(calendar._internalWaiverStore).length).toStrictEqual(4);

        expect(calendar._internalWaiverStore['2010-12-31']).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
        expect(calendar._getWaiverStore(2010, 11, 31)).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
    });

    describe('Testing getDayTotal', () =>
    {
        test('getDayTotal on workdays', () =>
        {
            // Original dates
            expect(calendar._getDayTotal(2020, 3, 1)).toStrictEqual('08:00');
            expect(calendar._getDayTotal(2020, 3, 2)).toStrictEqual('08:00');

            // Day that doesn't have contents
            expect(calendar._getDayTotal(2010, 3, 1)).toStrictEqual(undefined);

            // Adding a different set
            calendar._setStore('2010-3-1', ['05:00', '07:00', '09:00', '10:00']);
            expect(calendar._getStore('2010-3-1')).toStrictEqual(['05:00', '07:00', '09:00', '10:00']);
            expect(calendar._getDayTotal(2010, 3, 1)).toStrictEqual('03:00');

            // Clearing entry - back to undefined value
            calendar._removeStore('2010-3-1');
            expect(calendar._getDayTotal(2010, 3, 1)).toStrictEqual(undefined);
        });

        test('getDayTotal on waived days', async() =>
        {
            // Original dates
            expect(calendar._getDayTotal(2019, 11, 31)).toStrictEqual('08:00');
            expect(calendar._getDayTotal(2020, 0, 1)).toStrictEqual('08:00');
            expect(calendar._getDayTotal(2020, 3, 10)).toStrictEqual('08:00');

            // Day that doesn't have contents
            expect(calendar._getDayTotal(2010, 2, 1)).toStrictEqual(undefined);

            // Adding a different set
            const newWaivedEntry = {
                '2010-03-01': { reason: 'Test', hours: '06:00' }
            };
            waivedWorkdays.set(newWaivedEntry);

            await calendar.loadInternalWaiveStore();
            expect(calendar._getWaiverStore(2010, 2, 1)).toStrictEqual({ reason: 'Test', hours: '06:00' });
            expect(calendar._getDayTotal(2010, 2, 1)).toStrictEqual('06:00');

            // Clearing entry - back to undefined value
            waivedWorkdays.clear();
            waivedWorkdays.set(waivedEntries);
            await calendar.loadInternalWaiveStore();
            expect(calendar._getDayTotal(2010, 2, 1)).toStrictEqual(undefined);
        });
    });

    test('DayCalendar Day Changes', () =>
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

    test('DayCalendar Month Changes', () =>
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

    test('DayCalendar Year Changes', () =>
    {
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
        const expectedNextYear = today.getFullYear() + 1;
        const expectedPrevYear = today.getFullYear() - 1;

        for (let i = 0; i < 365; i++)
        {
            calendar._nextDay();
        }

        assert.strictEqual(calendar._getCalendarYear(), expectedNextYear);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());

        for (let i = 0; i < 365; i++)
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
        test('DayCalendar refresh set correctly', () =>
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

        test('DayCalendar refresh set to another day', () =>
        {
            // Calendar is set as if someone was looking at previous day
            calendar._prevDay();

            // Refreshing with a date not being looked at should not push it to today
            calendar.refreshOnDayChange(today.getDate(), today.getMonth(), today.getFullYear());

            assert.notStrictEqual(calendar._getCalendarDate(), today.getDate());
        });
    });

    test('MonthCalendar to DayCalendar', async() =>
    {
        const testPreferences = defaultPreferences;
        testPreferences['view'] = 'month';
        let calendar = await CalendarFactory.getInstance(testPreferences, languageData);
        assert.strictEqual(calendar.constructor.name, 'MonthCalendar');

        testPreferences['view'] = 'day';
        calendar = await CalendarFactory.getInstance(testPreferences, languageData, calendar);
        assert.strictEqual(calendar.constructor.name, 'DayCalendar');
    });

});
