/* eslint-disable no-undef */
'use strict';

import {
    isNegative,
    multiplyTime,
    minutesToHourFormatted,
    subtractTime,
    sumTime,
    validateTime,
    hourToMinutes,
    diffDays,
    validateDate
} from '../../js/time-math.js';

const date1 = new Date(-349891200000);
const date2 = new Date(1581121289763);
const date3 = new Date();

describe('Time Math Functions', () =>
{

    describe('Difference between two days', () =>
    {
        test('expect diffDays 22350', () =>
        {
            expect(diffDays(date1, date2)).toBe(22350);
        });

        test('expect diffDays greater than 0', () =>
        {
            expect(diffDays(date1, date3)).toBeGreaterThan(0);
        });

    });

    describe('Determine negative dates', () =>
    {
        test('date1 Should not be negative', () =>
        {
            expect(isNegative(date2)).not.toBeTruthy();
        });

        test('-date2 Should be negative', () =>
        {
            expect(isNegative('-' + date2)).toBeTruthy();
        });

    });

    describe('Minutes formatted to HH:MM', () =>
    {
        test('0 should return 00:00', () =>
        {
            expect(minutesToHourFormatted(0)).toBe('00:00');
            expect(minutesToHourFormatted(-0)).toBe('00:00');
        });

        test('1 should return 00:01', () =>
        {
            expect(minutesToHourFormatted(1)).toBe('00:01');
            expect(minutesToHourFormatted(-1)).toBe('-00:01');
        });

        test('59 should return 00:59', () =>
        {
            expect(minutesToHourFormatted(59)).toBe('00:59');
            expect(minutesToHourFormatted(-59)).toBe('-00:59');
        });

        test('60 should return 01:00', () =>
        {
            expect(minutesToHourFormatted(60)).toBe('01:00');
            expect(minutesToHourFormatted(-60)).toBe('-01:00');
        });

        test('61 should return 01:01', () =>
        {
            expect(minutesToHourFormatted(61)).toBe('01:01');
            expect(minutesToHourFormatted(-61)).toBe('-01:01');
        });
    });

    // Format minutes test
    describe('HH:MM formatted to minutes', () =>
    {

        test('00:00 should return 0', () =>
        {
            expect(hourToMinutes('00:00')).toBe(0);
            expect(hourToMinutes('-00:00')).toBeLessThan(1);
        });

        test('01:01 should return 61', () =>
        {
            expect(hourToMinutes('01:01')).toBe(61);
            expect(hourToMinutes('-01:01')).toBe(-61);
        });
        test('00:01 should return 1', () =>
        {
            expect(hourToMinutes('00:01')).toBe(1);
            expect(hourToMinutes('-00:01')).toBe(-1);
        });
        test('00:59 should return 59', () =>
        {
            expect(hourToMinutes('00:59')).toBe(59);
            expect(hourToMinutes('-00:59')).toBe(-59);
        });
        test('01:00 should return 60', () =>
        {
            expect(hourToMinutes('01:00')).toBe(60);
            expect(hourToMinutes('-01:00')).toBe(-60);
        });
    });

    // Multiply time
    describe('Multiply Time', () =>
    {
        test('01:00 * 10 should be 10:00', () =>
        {
            expect(multiplyTime('01:00', 10)).toBe('10:00');
            expect(multiplyTime('-01:00', 10)).toBe('-10:00');
            expect(multiplyTime('01:00', -10)).toBe('-10:00');
        });

        test('00:60 * 1 should be 01:00', () =>
        {
            expect(multiplyTime('00:60', 1)).toBe('01:00');
            expect(multiplyTime('-00:60', 1)).toBe('-01:00');
            expect(multiplyTime('00:60', -1)).toBe('-01:00');
        });
    });

    // Subtract time
    test('subtractTime(HH:MM, HH:MM)', () =>
    {
        expect(subtractTime('1:00', '1:00')).toBe('00:00');
        expect(subtractTime('00:00', '00:00')).toBe('00:00');
        expect(subtractTime('00:01', '01:00')).toBe('00:59');
        expect(subtractTime('13:00', '12:00')).toBe('-01:00');
        expect(subtractTime('48:00', '24:00')).toBe('-24:00');
        expect(subtractTime('00:01', '12:00')).toBe('11:59');
        expect(subtractTime('12:00', '13:00')).toBe('01:00');
        expect(subtractTime('13:00', '00:00')).toBe('-13:00');
    });

    // Sum time
    test('sumTime(HH:MM, HH:MM)', () =>
    {
        expect(sumTime('01:00', '01:00')).toBe('02:00');
        expect(sumTime('00:00', '00:00')).toBe('00:00');
        expect(sumTime('00:00', '00:01')).toBe('00:01');
        expect(sumTime('00:59', '00:01')).toBe('01:00');
        expect(sumTime('12:00', '12:00')).toBe('24:00');
        expect(sumTime('12:00', '-12:00')).toBe('00:00');
    });

    // Time Validation
    test('validateTime(HH:MM)', () =>
    {
        expect(validateTime('00:00')).toBeTruthy();
        expect(validateTime('00:01')).toBeTruthy();
        expect(validateTime('00:11')).toBeTruthy();
        expect(validateTime('01:11')).toBeTruthy();
        expect(validateTime('11:11')).toBeTruthy();
        expect(validateTime('23:59')).toBeTruthy();
        expect(validateTime('-04:00')).toBeTruthy();
        expect(validateTime('24:00')).not.toBeTruthy();
        expect(validateTime('34:00')).not.toBeTruthy();
        expect(validateTime('4:00')).not.toBeTruthy();
        expect(validateTime('00:1')).not.toBeTruthy();
        expect(validateTime('--:--')).not.toBeTruthy();
        expect(validateTime('')).not.toBeTruthy();
    });

    test('validateDate(date)', () =>
    {
        expect(validateDate('0001-00-00')).toBeFalsy();
        expect(validateDate('1-00-00')).toBeFalsy();
        expect(validateDate('1996-13-00')).toBeFalsy();
        expect(validateDate('1996-1-00')).toBeFalsy();
        expect(validateDate('1996-01-1')).toBeFalsy();
        expect(validateDate('1996-01-40')).toBeFalsy();
        expect(validateDate('1996-01-31')).toBeFalsy();
        expect(validateDate('I\'m a date!')).toBeFalsy();
        expect(validateDate('1996-01-29')).toBeTruthy();
        expect(validateDate('1996-01-30')).toBeFalsy();
    });
});
