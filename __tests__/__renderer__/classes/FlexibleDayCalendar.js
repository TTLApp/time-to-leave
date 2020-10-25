/* eslint-disable no-undef */

const Store = require('electron-store');
const { defaultPreferences } = require('../../../js/user-preferences');
const { CalendarFactory } = require('../../../js/classes/CalendarFactory');

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

describe('FlexibleDayCalendar class Tests', () =>
{
    process.env.NODE_ENV = 'test';

    const flexibleStore = new Store({name: 'flexible-store'});
    const waivedWorkdays = new Store({name: 'waived-workdays'});

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
    let testPreferences = defaultPreferences;
    testPreferences['number-of-entries'] = 'flexible';
    testPreferences['view'] = 'day';
    let calendar = CalendarFactory.getInstance(testPreferences);

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

    test('FlexibleDayCalendar internal waiver storage correct loading', () =>
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

    test('FlexibleDayCalendar Day Changes', () =>
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

    test('FlexibleDayCalendar Month Changes', () =>
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
            let prevDayDate = calendar._calendarDate;

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

    test('Calendar to FlexibleDayCalendar', () =>
    {
        let testPreferences = defaultPreferences;
        testPreferences['view'] = 'month';
        testPreferences['number-of-entries'] = 'fixed';
        let calendar = CalendarFactory.getInstance(testPreferences);
        expect(calendar.constructor.name).toBe('Calendar');

        testPreferences['view'] = 'day';
        testPreferences['number-of-entries'] = 'flexible';
        calendar = CalendarFactory.getInstance(testPreferences, calendar);
        expect(calendar.constructor.name).toBe('FlexibleDayCalendar');
    });

    test('FixedDayCalendar to FlexibleDayCalendar', () =>
    {
        let testPreferences = defaultPreferences;
        testPreferences['view'] = 'day';
        testPreferences['number-of-entries'] = 'fixed';
        let calendar = CalendarFactory.getInstance(testPreferences);
        expect(calendar.constructor.name).toBe('FixedDayCalendar');

        testPreferences['view'] = 'day';
        testPreferences['number-of-entries'] = 'flexible';
        calendar = CalendarFactory.getInstance(testPreferences, calendar);
        expect(calendar.constructor.name).toBe('FlexibleDayCalendar');
    });

    test('FlexibleMonthCalendar to FlexibleDayCalendar', () =>
    {
        let testPreferences = defaultPreferences;
        testPreferences['view'] = 'month';
        testPreferences['number-of-entries'] = 'flexible';
        let calendar = CalendarFactory.getInstance(testPreferences);
        expect(calendar.constructor.name).toBe('FlexibleMonthCalendar');

        testPreferences['view'] = 'day';
        testPreferences['number-of-entries'] = 'flexible';
        calendar = CalendarFactory.getInstance(testPreferences, calendar);
        expect(calendar.constructor.name).toBe('FlexibleDayCalendar');
    });
});
