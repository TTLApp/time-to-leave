/* eslint-disable no-undef */
'use strict';

const assert = require('assert');
import { getDateStr, getCurrentDateTimeStr, getMonthLength } from '../../js/date-aux.js';

describe('Date Functions', () =>
{
    const badDate = ['this', 'is', 'not', 'a', 'date'];
    const testDate = new Date();
    const expectedDate = new Date(testDate.getTime() - (testDate.getTimezoneOffset() * 60000)).toISOString().substr(0, 10);

    describe('getDateStr(Date())', () =>
    {
        test('Given a JS Date() object, should return YYYY-MM-DD', () =>
        {
            assert.strictEqual(getDateStr(testDate), expectedDate);
        });

        test('Given an insane object, should return an error', () =>
        {
            assert.notStrictEqual(getDateStr(badDate), expectedDate);
        });
    });

    describe('getMonthLength(Year, Month)', () =>
    {
        const testYear = 2024;
        test('Given for the Year(2024) and Months, should return number of days in month', () =>
        {
            assert.strictEqual(getMonthLength(testYear, 0), 31);
            assert.strictEqual(getMonthLength(testYear, 1), 29);
            assert.strictEqual(getMonthLength(testYear, 2), 31);
            assert.strictEqual(getMonthLength(testYear, 3), 30);
            assert.strictEqual(getMonthLength(testYear, 4), 31);
            assert.strictEqual(getMonthLength(testYear, 5), 30);
            assert.strictEqual(getMonthLength(testYear, 6), 31);
            assert.strictEqual(getMonthLength(testYear, 7), 31);
            assert.strictEqual(getMonthLength(testYear, 8), 30);
            assert.strictEqual(getMonthLength(testYear, 9), 31);
            assert.strictEqual(getMonthLength(testYear, 10), 30);
            assert.strictEqual(getMonthLength(testYear, 11), 31);
        });
    });

    describe('getCurrentDateTimeStr()', () =>
    {
        const looseRegexCurrentDateTime = /(\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2})/g;
        const regexCurrentDateTime = /(\d{4}_(0[1-9]|1[0-2])_(0[1-9]|[12]\d|3[01])_(0\d|1\d|2[0-3])_([0-5]\d)_([0-5]\d))/g;

        test('Should return Current Date Time string in YYYY_MM_DD_HH_MM_SS format with no spaces or unexpected characters making sure it accepts digits', () =>
        {
            assert.strictEqual(looseRegexCurrentDateTime.test(getCurrentDateTimeStr()), true);
        });

        test('Should return Current Date Time string in YYYY_MM_DD_HH_MM_SS format with no spaces or unexpected characters', () =>
        {
            assert.strictEqual(regexCurrentDateTime.test(getCurrentDateTimeStr()), true);
        });
    });
});
