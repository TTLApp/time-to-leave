/* eslint-disable no-undef */
'use strict';

const { getDateStr, getCurrentDateTimeStr, getMonthLength } = require('../../js/date-aux');

describe('Date Functions', () =>
{
    const badDate = ['this', 'is', 'not', 'a', 'date'];
    const testDate = new Date();
    const expectedDate = new Date(testDate.getTime() - (testDate.getTimezoneOffset() * 60000)).toISOString().substr(0, 10);
    const regexCurrentDateTime = /(\d{4}_(0[1-9]|1[0-2])_(0[1-9]|[12]\d|3[01])_(0\d|1\d|2[0-3])_([0-5]\d)_([0-5]\d))/g;

    describe('getDateStr(Date())', () =>
    {
        test('Given a JS Date() object, should return YYYY-MM-DD', () =>
        {
            expect(getDateStr(testDate)).toBe(expectedDate);
        });

        test('Given an insane object, should return an error', () =>
        {
            expect(getDateStr(badDate)).not.toBe(expectedDate);
        });
    });

    describe('getMonthLength(Year, Month)', () =>
    {
        const testYear = 2024;
        const testMonth = 1;
        const expectedLength = 29;
        test('Given a JS Year and Month, should return number of days in month', () =>
        {
            expect(getMonthLength(testYear, testMonth)).toBe(expectedLength);
        });
    });

    describe('getCurrentDateTimeStr()', () =>
    {
        test('Should return Current Date Time string in YYYY_MM_DD_HH_MM_SS format with no spaces or unexpected characters', () =>
        {
            expect(regexCurrentDateTime.test(getCurrentDateTimeStr())).toBe(true);
        });
    });
});
