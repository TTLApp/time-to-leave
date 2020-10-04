/* eslint-disable no-undef */
'use strict';

const Store = require('electron-store');
const { defaultPreferences } = require('../../../js/user-preferences');
const { CalendarFactory } = require('../../../js/classes/CalendarFactory');

window.$ = window.jQuery = require('jquery');

describe('Calendar class Tests', () => 
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
    let calendar = CalendarFactory.getInstance(testPreferences);

    test('Calendar creates with today\'s date', () => 
    {
        expect(calendar._getCalendarDate()).toBe(today.getDate());
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
    });

    test('Calendar "today" methods return today\'s date', () => 
    {
        expect(calendar._getTodayDate()).toBe(today.getDate());
        expect(calendar._getTodayYear()).toBe(today.getFullYear());
        expect(calendar._getTodayMonth()).toBe(today.getMonth());
    });

    test('Calendar internal storage correct loading', () => 
    {
        expect(calendar._internalStore['2020-3-1-day-begin']).toBe('08:00');
        expect(calendar._getStore(1, 3, 2020, 'day-begin')).toBe('08:00');
        expect(calendar._internalStore['2010-3-1-day-begin']).toBe(undefined);
        expect(calendar._getStore(1, 3, 2010, 'day-begin')).toBe(undefined);

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(9);
        expect(store.size).toStrictEqual(9);

        calendar._setStore(1, 3, 2010, 'day-begin', '05:00');
        expect(calendar._internalStore['2010-3-1-day-begin']).toBe('05:00');
        expect(calendar._getStore(1, 3, 2010, 'day-begin')).toBe('05:00');

        expect(Object.keys(calendar._internalStore).length).toStrictEqual(10);
        expect(store.size).toStrictEqual(10);

        calendar._removeStore(1, 3, 2010, 'day-begin');
        expect(calendar._internalStore['2010-3-1-day-begin']).toBe(undefined);
        expect(calendar._getStore(1, 3, 2010, 'day-begin')).toBe(undefined);

        // remove just sets the value as undefined in internal store, if it existed
        expect(Object.keys(calendar._internalStore).length).toStrictEqual(10);
        expect(store.size).toStrictEqual(9);
    });

    test('Calendar internal waiver storage correct loading', () => 
    {
        // Waiver Store internally saves the human month index, but the calendar methods use JS month index
        expect(calendar._internalWaiverStore['2019-12-31']).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
        expect(calendar._getWaiverStore(31, 11, 2019)).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
        expect(calendar._internalWaiverStore['2010-12-31']).toStrictEqual(undefined);
        expect(calendar._getWaiverStore(31, 11, 2010)).toStrictEqual(undefined);

        expect(waivedWorkdays.size).toStrictEqual(3);
        expect(Object.keys(calendar._internalWaiverStore).length).toStrictEqual(3);

        const newWaivedEntry = {
            '2010-12-31': { reason: 'New Year\'s eve', hours: '08:00' }
        };
        waivedWorkdays.set(newWaivedEntry);

        expect(calendar._internalWaiverStore['2010-12-31']).toStrictEqual(undefined);
        expect(calendar._getWaiverStore(31, 11, 2010)).toStrictEqual(undefined);

        calendar.loadInternalWaiveStore();

        expect(Object.keys(calendar._internalWaiverStore).length).toStrictEqual(4);

        expect(calendar._internalWaiverStore['2010-12-31']).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
        expect(calendar._getWaiverStore(31, 11, 2010)).toStrictEqual({ reason: 'New Year\'s eve', hours: '08:00' });
    });

    test('Calendar Month Changes', () => 
    {
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        const expectedNextMonth = today.getMonth() + 1 === 12 ? 0 : (today.getMonth() + 1);
        const expectedPrevMonth = today.getMonth() === 0 ? 11 : (today.getMonth() - 1);

        calendar._nextMonth();
        expect(calendar._getCalendarMonth()).toBe(expectedNextMonth);

        calendar._prevMonth();
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());

        calendar._prevMonth();
        expect(calendar._getCalendarMonth()).toBe(expectedPrevMonth);

        calendar._goToCurrentDate();
        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
    });

    test('Calendar Year Changes', () => 
    {
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());
        const expectedNextYear = today.getFullYear() + 1;
        const expectedPrevYear = today.getFullYear() - 1;

        for (let i = 0; i < 12; i++) 
        {
            calendar._nextMonth();
        }

        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        expect(calendar._getCalendarYear()).toBe(expectedNextYear);

        calendar._goToCurrentDate();
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());

        for (let i = 0; i < 12; i++) 
        {
            calendar._prevMonth();
        }

        expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        expect(calendar._getCalendarYear()).toBe(expectedPrevYear);

        calendar._goToCurrentDate();
        expect(calendar._getCalendarYear()).toBe(today.getFullYear());
    });

    describe('Calendar RefreshOnDayChange', () => 
    {
        test('Calendar refresh set correctly', () => 
        {
            // Calendar is set as if someone was looking at previous month
            calendar._prevMonth();
            let prevMonthDate = calendar._calendarDate;

            // Refreshing with the date being looked at should push it to today
            calendar.refreshOnDayChange(prevMonthDate.getDate(), prevMonthDate.getMonth(), prevMonthDate.getFullYear());

            expect(calendar._getCalendarDate()).toBe(today.getDate());
            expect(calendar._getCalendarYear()).toBe(today.getFullYear());
            expect(calendar._getCalendarMonth()).toBe(today.getMonth());
        });

        test('Calendar refresh set to another month', () => 
        {
            // Calendar is set as if someone was looking at previous month
            calendar._prevMonth();

            // Refreshing with a date not being looked at should not push it to today
            calendar.refreshOnDayChange(today.getDate(), today.getMonth(), today.getFullYear());

            expect(calendar._getCalendarMonth()).not.toBe(today.getMonth());
        });
    });

    describe('hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd)', () => 
    {
        test('Test scenarios where there is no error on the inputs', () => 
        {
            expect(calendar._hasInputError('00:00', '12:00', '13:00', '20:00')).not.toBeTruthy();
            expect(calendar._hasInputError('00:00', '12:00', '13:00', '')).not.toBeTruthy();
            expect(calendar._hasInputError('00:00', '12:00', '', '')).not.toBeTruthy();
            expect(calendar._hasInputError('00:00', '', '', '')).not.toBeTruthy();
            expect(calendar._hasInputError('', '', '', '')).not.toBeTruthy();
            expect(calendar._hasInputError('00:00', '', '', '20:00')).not.toBeTruthy();
        });

        test('Test scenarios where there is error on the inputs', () => 
        {
            expect(calendar._hasInputError('23:00', '', '', '00:00')).toBeTruthy();
            expect(calendar._hasInputError('', '23:00', '', '00:00')).toBeTruthy();
            expect(calendar._hasInputError('', '', '23:00', '00:00')).toBeTruthy();
            // TODO: Fix commented
            // expect(calendar._hasInputError('not-valid-hour', '', '', 'not-valid-hour')).toBeTruthy();
            expect(calendar._hasInputError('00:00', '12:00', '', '20:00')).toBeTruthy();
            expect(calendar._hasInputError('00:00', '', '13:00', '20:00')).toBeTruthy();
        });
    });

    test('Calendar to FixedDayCalendar', () => 
    {
        store.clear();
        store.set(regularEntries);

        waivedWorkdays.clear();
        waivedWorkdays.set(waivedEntries);

        testPreferences['view'] = 'day';
        expect(calendar.constructor.name).toBe('Calendar');

        // last state of the internal store was 10 elements
        expect(Object.keys(calendar._internalStore).length).toStrictEqual(10);

        calendar = CalendarFactory.getInstance(testPreferences, calendar);
        expect(calendar.constructor.name).toBe('FixedDayCalendar');

        // internal store is again set with 9 elements after store reset
        expect(Object.keys(calendar._internalStore).length).toStrictEqual(9);
    });

});