/* eslint-disable no-undef */
const { defaultPreferences, getDefaultWidthHeight, getUserPreferences, savePreferences, showDay, switchCalendarView } = require('../../js/user-preferences');

describe('Preferences Main', () => {
    process.env.NODE_ENV = 'test';

    let days = getUserPreferences();

    test('showDay(year, month, day)', () => {
        expect(showDay(2020, 1, 1)).toBe(days['working-days-saturday']);
        expect(showDay(2020, 1, 2)).toBe(days['working-days-sunday']);
        expect(showDay(2020, 1, 3)).toBe(days['working-days-monday']);
        expect(showDay(2020, 1, 4)).toBe(days['working-days-tuesday']);
        expect(showDay(2020, 1, 5)).toBe(days['working-days-wednesday']);
        expect(showDay(2020, 1, 6)).toBe(days['working-days-thursday']);
        expect(showDay(2020, 1, 7)).toBe(days['working-days-friday']);
    });

    describe('getDefaultWidthHeight()', () => {

        test('Month view', () => {
            expect(defaultPreferences['view']).toBe('month');
            savePreferences(defaultPreferences);

            expect(getDefaultWidthHeight()).toStrictEqual({ width: 1010, height: 800 });
        });

        test('Day view', () => {
            let preferences = { defaultPreferences };

            preferences['view'] = 'day';
            savePreferences(preferences);

            expect(getDefaultWidthHeight()).toStrictEqual({ width: 500, height: 500 });
        });
    });

    describe('switchCalendarView()', () => {

        test('Month to Day', () => {
            expect(defaultPreferences['view']).toBe('month');
            savePreferences(defaultPreferences);

            expect(getUserPreferences()['view']).toBe('month');
            switchCalendarView();

            let preferences = getUserPreferences();
            expect(preferences['view']).toBe('day');
        });

        test('Day to Month', () => {
            let preferences = { defaultPreferences };

            preferences['view'] = 'day';
            savePreferences(preferences);

            expect(getUserPreferences()['view']).toBe('day');
            switchCalendarView();

            preferences = getUserPreferences();
            expect(preferences['view']).toBe('month');
        });
    });
});

