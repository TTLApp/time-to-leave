/* eslint-disable no-undef */
'use strict';

import assert from 'assert';

import {
    diffDays,
    hourToMinutes,
    isNegative,
    minutesToHourFormatted,
    multiplyTime,
    subtractTime,
    sumTime,
    validateDate,
    validateTime,
} from '../../js/time-math.js';

const date1 = new Date(-349891200000);
const date2 = new Date(1581121289763);
const date3 = new Date();

describe('Time Math Functions', () =>
{
    describe('Difference between two days', () =>
    {
        it('expect diffDays 22350', () =>
        {
            assert.strictEqual(diffDays(date1, date2), 22350);
        });

        it('expect diffDays greater than 0', () =>
        {
            assert.strictEqual(diffDays(date1, date3) > 0, true);
        });
    });

    describe('Determine negative dates', () =>
    {
        it('date1 Should not be negative', () =>
        {
            assert.strictEqual(isNegative(date2), false);
        });

        it('-date2 Should be negative', () =>
        {
            assert.strictEqual(isNegative('-' + date2), true);
        });

    });

    describe('Minutes formatted to HH:MM', () =>
    {
        it('0 should return 00:00', () =>
        {
            assert.strictEqual(minutesToHourFormatted(0), '00:00');
            assert.strictEqual(minutesToHourFormatted(-0), '00:00');
        });

        it('1 should return 00:01', () =>
        {
            assert.strictEqual(minutesToHourFormatted(1), '00:01');
            assert.strictEqual(minutesToHourFormatted(-1), '-00:01');
        });

        it('59 should return 00:59', () =>
        {
            assert.strictEqual(minutesToHourFormatted(59), '00:59');
            assert.strictEqual(minutesToHourFormatted(-59), '-00:59');
        });

        it('60 should return 01:00', () =>
        {
            assert.strictEqual(minutesToHourFormatted(60), '01:00');
            assert.strictEqual(minutesToHourFormatted(-60), '-01:00');
        });

        it('61 should return 01:01', () =>
        {
            assert.strictEqual(minutesToHourFormatted(61), '01:01');
            assert.strictEqual(minutesToHourFormatted(-61), '-01:01');
        });
    });

    // Format minutes test
    describe('HH:MM formatted to minutes', () =>
    {

        it('00:00 should return 0', () =>
        {
            assert.strictEqual(hourToMinutes('00:00'), 0);
            assert.strictEqual(hourToMinutes('-00:00') < 1, true);
        });

        it('01:01 should return 61', () =>
        {
            assert.strictEqual(hourToMinutes('01:01'), 61);
            assert.strictEqual(hourToMinutes('-01:01'), -61);
        });
        it('00:01 should return 1', () =>
        {
            assert.strictEqual(hourToMinutes('00:01'), 1);
            assert.strictEqual(hourToMinutes('-00:01'), -1);
        });
        it('00:59 should return 59', () =>
        {
            assert.strictEqual(hourToMinutes('00:59'), 59);
            assert.strictEqual(hourToMinutes('-00:59'), -59);
        });
        it('01:00 should return 60', () =>
        {
            assert.strictEqual(hourToMinutes('01:00'), 60);
            assert.strictEqual(hourToMinutes('-01:00'), -60);
        });
    });

    // Multiply time
    describe('Multiply Time', () =>
    {
        it('01:00 * 10 should be 10:00', () =>
        {
            assert.strictEqual(multiplyTime('01:00', 10), '10:00');
            assert.strictEqual(multiplyTime('-01:00', 10), '-10:00');
            assert.strictEqual(multiplyTime('01:00', -10), '-10:00');
        });

        it('00:60 * 1 should be 01:00', () =>
        {
            assert.strictEqual(multiplyTime('00:60', 1), '01:00');
            assert.strictEqual(multiplyTime('-00:60', 1), '-01:00');
            assert.strictEqual(multiplyTime('00:60', -1), '-01:00');
        });
    });

    // Subtract time
    it('subtractTime(HH:MM, HH:MM)', () =>
    {
        assert.strictEqual(subtractTime('1:00', '1:00'), '00:00');
        assert.strictEqual(subtractTime('00:00', '00:00'), '00:00');
        assert.strictEqual(subtractTime('00:01', '01:00'), '00:59');
        assert.strictEqual(subtractTime('13:00', '12:00'), '-01:00');
        assert.strictEqual(subtractTime('48:00', '24:00'), '-24:00');
        assert.strictEqual(subtractTime('00:01', '12:00'), '11:59');
        assert.strictEqual(subtractTime('12:00', '13:00'), '01:00');
        assert.strictEqual(subtractTime('13:00', '00:00'), '-13:00');
    });

    // Sum time
    it('sumTime(HH:MM, HH:MM)', () =>
    {
        assert.strictEqual(sumTime('01:00', '01:00'), '02:00');
        assert.strictEqual(sumTime('00:00', '00:00'), '00:00');
        assert.strictEqual(sumTime('00:00', '00:01'), '00:01');
        assert.strictEqual(sumTime('00:59', '00:01'), '01:00');
        assert.strictEqual(sumTime('12:00', '12:00'), '24:00');
        assert.strictEqual(sumTime('12:00', '-12:00'), '00:00');
    });

    // Time Validation
    it('validateTime(HH:MM)', () =>
    {
        assert.strictEqual(validateTime('00:00'), true);
        assert.strictEqual(validateTime('00:01'), true);
        assert.strictEqual(validateTime('00:11'), true);
        assert.strictEqual(validateTime('01:11'), true);
        assert.strictEqual(validateTime('11:11'), true);
        assert.strictEqual(validateTime('23:59'), true);
        assert.strictEqual(validateTime('-04:00'), true);
        assert.strictEqual(validateTime('24:00'), false);
        assert.strictEqual(validateTime('34:00'), false);
        assert.strictEqual(validateTime('4:00'), false);
        assert.strictEqual(validateTime('00:1'), false);
        assert.strictEqual(validateTime('--:--'), false);
        assert.strictEqual(validateTime(''), false);
    });

    it('validateDate(date)', () =>
    {
        const tests = [
            {date: '0001-00-00', valid: false},
            {date: '1-00-00', valid: false},
            {date: '1996-13-00', valid: false},
            {date: '1996-1-00', valid: false},
            {date: '1996-01-1', valid: false},
            {date: '1996-01-40', valid: false},
            {date: '1996-01-31', valid: false},
            {date: 'I\'m a date!', valid: false},
            {date: '1996-01-29', valid: true},
            {date: '1996-01-30', valid: false},
            {date: '1996-00-01', valid: true},
            {date: '1996-01-01', valid: true},
            {date: '1996-02-01', valid: true},
            {date: '1996-03-01', valid: true},
            {date: '1996-04-01', valid: true},
            {date: '1996-05-01', valid: true},
            {date: '1996-06-01', valid: true},
            {date: '1996-07-01', valid: true},
            {date: '1996-08-01', valid: true},
            {date: '1996-09-01', valid: true},
            {date: '1996-10-01', valid: true},
            {date: '1996-11-01', valid: true},
            {date: '1996-00-40', valid: false},
            {date: '1996-01-40', valid: false},
            {date: '1996-02-40', valid: false},
            {date: '1996-03-40', valid: false},
            {date: '1996-04-40', valid: false},
            {date: '1996-05-40', valid: false},
            {date: '1996-06-40', valid: false},
            {date: '1996-07-40', valid: false},
            {date: '1996-08-40', valid: false},
            {date: '1996-09-40', valid: false},
            {date: '1996-10-40', valid: false},
            {date: '1996-11-40', valid: false},
        ];
        for (const test of tests)
        {
            assert.strictEqual(validateDate(test.date), test.valid);
        }
    });
});
