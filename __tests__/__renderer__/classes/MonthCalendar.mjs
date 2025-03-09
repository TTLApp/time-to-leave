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

describe('MonthCalendar class Tests', () =>
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
        // window.calendarApi.toggleTrayPunchTime = () => {};
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

    const today = new Date();
    const testPreferences = structuredClone(getDefaultPreferences());
    const languageData = {'language': 'en', 'data': {'dummy_string': 'dummy_string_translated'}};

    let calendar;
    beforeEach(async() =>
    {
        calendar = await CalendarFactory.getInstance(testPreferences, languageData);
    });

    it('MonthCalendar starts with today\'s date', () =>
    {
        assert.strictEqual(calendar.constructor.name, 'MonthCalendar');
        assert.strictEqual(calendar._getCalendarDate(), today.getDate());
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
    });

    it('MonthCalendar "today" methods return today\'s date', () =>
    {
        assert.strictEqual(calendar._getTodayDate(), today.getDate());
        assert.strictEqual(calendar._getTodayYear(), today.getFullYear());
        assert.strictEqual(calendar._getTodayMonth(), today.getMonth());
    });

    it('MonthCalendar internal storage correct loading', () =>
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

    it('MonthCalendar internal waiver storage correct loading', async() =>
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

    it('MonthCalendar Month Changes', () =>
    {
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        const expectedNextMonth = today.getMonth() + 1 === 12 ? 0 : (today.getMonth() + 1);
        const expectedPrevMonth = today.getMonth() === 0 ? 11 : (today.getMonth() - 1);

        calendar._nextMonth();
        assert.strictEqual(calendar._getCalendarMonth(), expectedNextMonth);

        calendar._prevMonth();
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());

        calendar._prevMonth();
        assert.strictEqual(calendar._getCalendarMonth(), expectedPrevMonth);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
    });

    it('MonthCalendar Year Changes', () =>
    {
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
        const expectedNextYear = today.getFullYear() + 1;
        const expectedPrevYear = today.getFullYear() - 1;

        for (let i = 0; i < 12; i++)
        {
            calendar._nextMonth();
        }

        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        assert.strictEqual(calendar._getCalendarYear(), expectedNextYear);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());

        for (let i = 0; i < 12; i++)
        {
            calendar._prevMonth();
        }

        assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        assert.strictEqual(calendar._getCalendarYear(), expectedPrevYear);

        calendar._goToCurrentDate();
        assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
    });

    describe('MonthCalendar RefreshOnDayChange', () =>
    {
        it('MonthCalendar refresh set correctly', () =>
        {
            // Calendar is set as if someone was looking at previous month
            calendar._prevMonth();
            const prevMonthDate = calendar._calendarDate;

            // Refreshing with the date being looked at should push it to today
            calendar.refreshOnDayChange(prevMonthDate.getDate(), prevMonthDate.getMonth(), prevMonthDate.getFullYear());

            assert.strictEqual(calendar._getCalendarDate(), today.getDate());
            assert.strictEqual(calendar._getCalendarYear(), today.getFullYear());
            assert.strictEqual(calendar._getCalendarMonth(), today.getMonth());
        });

        it('MonthCalendar refresh set to another month', () =>
        {
            // Calendar is set as if someone was looking at previous month
            calendar._prevMonth();

            // Refreshing with a date not being looked at should not push it to today
            calendar.refreshOnDayChange(today.getDate(), today.getMonth(), today.getFullYear());

            assert.notStrictEqual(calendar._getCalendarMonth(), today.getMonth());
        });
    });

    it('DayCalendar to MonthCalendar', async() =>
    {
        const testPreferences = structuredClone(getDefaultPreferences());
        testPreferences['view'] = 'day';
        let calendar = await CalendarFactory.getInstance(testPreferences, languageData);
        assert.strictEqual(calendar.constructor.name, 'DayCalendar');

        testPreferences['view'] = 'month';
        calendar = await CalendarFactory.getInstance(testPreferences, languageData, calendar);
        assert.strictEqual(calendar.constructor.name, 'MonthCalendar');
    });
});
