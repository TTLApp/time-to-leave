/* eslint-disable no-undef */
'use strict';

const Store = require('electron-store');
const { defaultPreferences } = require('../../../js/user-preferences');
const { CalendarFactory } = require('../../../js/classes/CalendarFactory');

window.$ = window.jQuery = require('jquery');

describe('FixedDayCalendar class Tests', () =>
{
    process.env.NODE_ENV = 'test';

    const store = new Store();
    const waivedWorkdays = new Store({ name: 'waived-workdays' });

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
        '2019-12-31': { reason: 'New Year\'s eve', hours: '08:00' },
        '2020-01-01': { reason: 'New Year\'s Day', hours: '08:00' },
        '2020-04-10': { reason: 'Good Friday', hours: '08:00' }
    };
    waivedWorkdays.set(waivedEntries);

    const today = new Date();
    let testPreferences = defaultPreferences;
    testPreferences['view'] = 'day';
    let calendar = CalendarFactory.getInstance(testPreferences);

    test('FixedDayCalendar starts with today\'s date', () =>
    {
        expect(calendar.constructor.name).toBe('FixedDayCalendar');
        expect(calendar._getCalendarDate()).toBe(today.getDate());
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
    });

    test('FixedDayCalendar internal storage correct loading', () =>
    {
        expect(calendar._internalStore['2020-3-1-day-begin']).toBe('08:00');
        expect(calendar._getStore(2020, 3, 1, 'day-begin')).toBe('08:00');
        expect(calendar._internalStore['2010-3-1-day-begin']).toBe(undefined);
        expect(calendar._getStore(2010, 3, 1, 'day-begin')).toBe(undefined);

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(9);
        expect(store.size).toStrictEqual(9);

        calendar._setStore(2010, 3, 1, 'day-begin', '05:00');
        expect(calendar._internalStore['2010-3-1-day-begin']).toBe('05:00');
        expect(calendar._getStore(2010, 3, 1, 'day-begin')).toBe('05:00');

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(10);
        expect(store.size).toStrictEqual(10);

        calendar._removeStore(2010, 3, 1, 'day-begin');
        expect(calendar._internalStore['2010-3-1-day-begin']).toBe(undefined);
        expect(calendar._getStore(2010, 3, 1, 'day-begin')).toBe(undefined);

        // remove just sets the value as undefined in internal store, if it existed
        expect(Object.keys(calendar._internalStore).length).toStrictEqual(10);
        expect(store.size).toStrictEqual(9);
    });

    test('FixedDayCalendar internal waiver storage correct loading', () =>
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

        calendar.loadInternalWaiveStore();

        expect(Object.keys(calendar._internalWaiverStore).length).toStrictEqual(4);

        expect(calendar._internalWaiverStore['2010-12-31']).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
        expect(calendar._getWaiverStore(2010, 11, 31)).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
    });

    test('FixedDayCalendar Day Changes', () =>
    {
        expect(calendar._getCalendarDate()).toBe(today.getDate());

        let expectedNextDay = new Date(today);
        expectedNextDay.setDate(expectedNextDay.getDate() + 1);
        let expectedPrevDay = new Date(today);
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

    test('FixedDayCalendar Month Changes', () =>
    {
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        const expectedNextMonth = today.getMonth() + 1 === 12 ? 0 : (today.getMonth() + 1);
        const expectedPrevMonth = today.getMonth() === 0 ? 11 : (today.getMonth() - 1);

        // The Distance to next month is the amount of days in the month minus the current day, plust 2
        // The plus 2 accounts for "finishing" today and moving to the next day (of the next month)
        const distToNextMonth = (new Date(today.getFullYear(), today.getMonth(), 0)).getDate() - today.getDate() + 2;
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

    test('FixedDayCalendar Year Changes', () =>
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

    describe('FixedDayCalendar RefreshOnDayChange', () =>
    {
        test('FixedDayCalendar refresh set correctly', () =>
        {
            // Calendar is set as if someone was looking at previous day
            calendar._prevDay();
            let prevDayDate = calendar._calendarDate;

            // Refreshing with the date being looked at should push it to today
            calendar.refreshOnDayChange(prevDayDate.getDate(), prevDayDate.getMonth(), prevDayDate.getFullYear());

            expect(calendar._getCalendarDate()).toBe(today.getDate());
            expect(calendar._getCalendarYear()).toBe(today.getFullYear());
            expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        });

        test('FixedDayCalendar refresh set to another day', () =>
        {
            // Calendar is set as if someone was looking at previous day
            calendar._prevDay();

            // Refreshing with a date not being looked at should not push it to today
            calendar.refreshOnDayChange(today.getDate(), today.getMonth(), today.getFullYear());

            expect(calendar._getCalendarDate()).not.toBe(today.getDate());
        });
    });
});
