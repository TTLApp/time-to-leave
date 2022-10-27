/* eslint-disable no-undef */

const Store = require('electron-store');
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

const flexibleStore = new Store({name: 'flexible-store'});
const waivedWorkdays = new Store({name: 'waived-workdays'});

window.mainApi.getFlexibleStoreContents = () => { return new Promise((resolve) => { resolve(flexibleStore.store); }); };
window.mainApi.getWaiverStoreContents = () => { return new Promise((resolve) => resolve(waivedWorkdays.store)); };
window.mainApi.setFlexibleStoreData = (key, contents) =>
{
    return new Promise((resolve) =>
    {
        flexibleStore.set(key, contents);
        resolve(true);
    });
};
window.mainApi.deleteFlexibleStoreData = (key) =>
{
    return new Promise((resolve) =>
    {
        flexibleStore.delete(key);
        resolve(true);
    });
};

describe('FlexibleDayCalendar class Tests', () =>
{
    process.env.NODE_ENV = 'test';

    flexibleStore.clear();
    const regularEntries = {
        '2020-3-1': {'values': ['08:00', '12:00', '13:00', '17:00']},
        '2020-3-2': {'values': ['10:00', '18:00']}
    };
    flexibleStore.set(regularEntries);

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

    test('FlexibleDayCalendar starts with today\'s date', () =>
    {
        expect(calendar.constructor.name).toBe('FlexibleDayCalendar');
        expect(calendar._getCalendarDate()).toBe(today.getDate());
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
    });

    test('FlexibleDayCalendar "today" methods return today\'s date', () =>
    {
        expect(calendar._getTodayDate()).toBe(today.getDate());
        expect(calendar._getTodayYear()).toBe(today.getFullYear());
        expect(calendar._getTodayMonth()).toBe(today.getMonth());
    });

    test('FlexibleDayCalendar internal storage correct loading', () =>
    {
        expect(calendar._internalStore['2020-3-1']).toStrictEqual(regularEntries['2020-3-1']);
        expect(calendar._getStore('2020-3-1')).toStrictEqual(regularEntries['2020-3-1']['values']);
        expect(calendar._internalStore['2010-3-1']).toBe(undefined);
        expect(calendar._getStore('2010-3-1')).toStrictEqual([]);

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(2);
        expect(flexibleStore.size).toStrictEqual(2);

        calendar._setStore('2010-3-1', ['05:00']);
        expect(calendar._internalStore['2010-3-1']).toStrictEqual({'values': ['05:00']});
        expect(calendar._getStore('2010-3-1')).toStrictEqual(['05:00']);

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(3);
        expect(flexibleStore.size).toStrictEqual(3);

        calendar._removeStore('2010-3-1');
        expect(calendar._internalStore['2010-3-1']).toBe(undefined);
        expect(calendar._getStore('2010-3-1')).toStrictEqual([]);

        // remove just sets the value as undefined in internal store, if it existed
        expect(Object.keys(calendar._internalStore).length).toStrictEqual(3);
        expect(flexibleStore.size).toStrictEqual(2);
    });

    test('FlexibleDayCalendar internal waiver storage correct loading', async() =>
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

    test('FlexibleDayCalendar Day Changes', () =>
    {
        expect(calendar._getCalendarDate()).toBe(today.getDate());

        const expectedNextDay = new Date(today);
        expectedNextDay.setDate(expectedNextDay.getDate() + 1);
        const expectedPrevDay = new Date(today);
        expectedPrevDay.setDate(expectedPrevDay.getDate() - 1);

        calendar._nextDay();
        expect(calendar._getCalendarDate()).toBe(expectedNextDay.getDate());
        expect(calendar._isCalendarOnDate(expectedNextDay)).toBeTruthy();
        expect(calendar._isCalendarOnDate(expectedPrevDay)).not.toBeTruthy();

        calendar._prevDay();
        expect(calendar._getCalendarDate()).toBe(today.getDate());

        calendar._prevDay();
        expect(calendar._getCalendarDate()).toBe(expectedPrevDay.getDate());
        expect(calendar._isCalendarOnDate(expectedNextDay)).not.toBeTruthy();
        expect(calendar._isCalendarOnDate(expectedPrevDay)).toBeTruthy();

        calendar._goToCurrentDate();
        expect(calendar._getCalendarDate()).toBe(today.getDate());

        calendar._changeDay(1);
        expect(calendar._getCalendarDate()).toBe(expectedNextDay.getDate());

        calendar._goToCurrentDate();
        expect(calendar._getCalendarDate()).toBe(today.getDate());
    });

    test('FlexibleDayCalendar Month Changes', () =>
    {
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
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

        expect(calendar._getCalendarMonth()).toBe(expectedNextMonth);

        calendar._goToCurrentDate();
        expect(calendar._getCalendarDate()).toBe(today.getDate());
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());

        for (let i = 0; i < distToPrevMonth; i++)
        {
            calendar._prevDay();
        }

        expect(calendar._getCalendarMonth()).toBe(expectedPrevMonth);

        calendar._goToCurrentDate();
        expect(calendar._getCalendarDate()).toBe(today.getDate());
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
    });

    test('FlexibleDayCalendar Year Changes', () =>
    {
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());
        const expectedNextYear = today.getFullYear() + 1;
        const expectedPrevYear = today.getFullYear() - 1;

        for (let i = 0; i < 365; i++)
        {
            calendar._nextDay();
        }

        expect(calendar._getCalendarYear()).toBe(expectedNextYear);

        calendar._goToCurrentDate();
        expect(calendar._getCalendarDate()).toBe(today.getDate());
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());

        for (let i = 0; i < 365; i++)
        {
            calendar._prevDay();
        }

        expect(calendar._getCalendarYear()).toBe(expectedPrevYear);

        calendar._goToCurrentDate();
        expect(calendar._getCalendarDate()).toBe(today.getDate());
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());
    });

    describe('FlexibleDayCalendar RefreshOnDayChange', () =>
    {
        test('FlexibleDayCalendar refresh set correctly', () =>
        {
            // Calendar is set as if someone was looking at previous day
            calendar._prevDay();
            const prevDayDate = calendar._calendarDate;

            // Refreshing with the date being looked at should push it to today
            calendar.refreshOnDayChange(prevDayDate.getDate(), prevDayDate.getMonth(), prevDayDate.getFullYear());

            expect(calendar._getCalendarDate()).toBe(today.getDate());
            expect(calendar._getCalendarYear()).toBe(today.getFullYear());
            expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        });

        test('FlexibleDayCalendar refresh set to another day', () =>
        {
            // Calendar is set as if someone was looking at previous day
            calendar._prevDay();

            // Refreshing with a date not being looked at should not push it to today
            calendar.refreshOnDayChange(today.getDate(), today.getMonth(), today.getFullYear());

            expect(calendar._getCalendarDate()).not.toBe(today.getDate());
        });
    });

    test('FlexibleMonthCalendar to FlexibleDayCalendar', async() =>
    {
        const testPreferences = defaultPreferences;
        testPreferences['view'] = 'month';
        let calendar = await CalendarFactory.getInstance(testPreferences, languageData);
        expect(calendar.constructor.name).toBe('FlexibleMonthCalendar');

        testPreferences['view'] = 'day';
        calendar = await CalendarFactory.getInstance(testPreferences, languageData, calendar);
        expect(calendar.constructor.name).toBe('FlexibleDayCalendar');
    });

});
