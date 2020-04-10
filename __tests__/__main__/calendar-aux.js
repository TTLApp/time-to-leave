/* eslint-disable no-undef */

const { hasInputError,
    getDaysEntries
} = require('../../js/calendar-aux');
const Store = require('electron-store');


describe('Calendar helper functions', () => {
    process.env.NODE_ENV = 'test';

    describe('hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd)', () => {
        test('Test scenarios where there is no error on the inputs', () => {
            expect(hasInputError('00:00', '12:00', '13:00', '20:00')).not.toBeTruthy();
            expect(hasInputError('00:00', '12:00', '13:00', '')).not.toBeTruthy();
            expect(hasInputError('00:00', '12:00', '', '')).not.toBeTruthy();
            expect(hasInputError('00:00', '', '', '')).not.toBeTruthy();
            expect(hasInputError('', '', '', '')).not.toBeTruthy();
            expect(hasInputError('00:00', '12:00', '', '20:00')).not.toBeTruthy();
            expect(hasInputError('00:00', '', '13:00', '20:00')).not.toBeTruthy();
            expect(hasInputError('00:00', '', '', '20:00')).not.toBeTruthy();
        });

        test('Test scenarios where there is error on the inputs', () => {
            expect(hasInputError('not-valid-hour', '', '', 'not-valid-hour')).toBeTruthy();
            expect(hasInputError('23:00', '', '', '00:00')).toBeTruthy();
            expect(hasInputError('', '23:00', '', '00:00')).toBeTruthy();
            expect(hasInputError('', '', '23:00', '00:00')).toBeTruthy();
        });
    });

    const store = new Store();
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

    describe('getDaysEntries(year, month, day)', () => {
        test('getDaysEntries(2020, 3, 1)', () => {
            expect(getDaysEntries(2020, 3, 1)).toStrictEqual(['08:00', '12:00', '13:00', '17:00']);
        });
        test('getDaysEntries(2020, 3, 2)', () => {
            expect(getDaysEntries(2020, 3, 2)).toStrictEqual(['10:00', undefined, undefined, '18:00']);
        });
        test('getDaysEntries(<not registered input>)', () => {
            expect(getDaysEntries(2020, 3, 3)).toStrictEqual([undefined, undefined, undefined, undefined]);
        });
    });
});


