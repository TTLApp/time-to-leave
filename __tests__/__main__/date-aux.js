/* eslint-disable no-undef */
'use strict';

const { getDateStr, getCurrentDateTimeStr, getMonthLength } = require('../../js/date-aux');

describe('Date Functions', () =>
{
    const badDate = ['this', 'is', 'not', 'a', 'date'];
    const testDate = new Date();
    const expectedDate = new Date(testDate.getTime() - (testDate.getTimezoneOffset() * 60000)).toISOString().substr(0, 10);

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
        test('Given for the Year(2024) and Months, should return number of days in month', () =>
        {
            expect(getMonthLength(testYear, 0)).toBe(31);
            expect(getMonthLength(testYear, 1)).toBe(29);
            expect(getMonthLength(testYear, 2)).toBe(31);
            expect(getMonthLength(testYear, 3)).toBe(30);
            expect(getMonthLength(testYear, 4)).toBe(31);
            expect(getMonthLength(testYear, 5)).toBe(30);
            expect(getMonthLength(testYear, 6)).toBe(31);
            expect(getMonthLength(testYear, 7)).toBe(31);
            expect(getMonthLength(testYear, 8)).toBe(30);
            expect(getMonthLength(testYear, 9)).toBe(31);
            expect(getMonthLength(testYear, 10)).toBe(30);
            expect(getMonthLength(testYear, 11)).toBe(31);
        });
    });

    describe('getCurrentDateTimeStr()', () =>
    {
        const looseRegexCurrentDateTime = /(\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2})/g;
        const regexCurrentDateTime = /(\d{4}_(0[1-9]|1[0-2])_(0[1-9]|[12]\d|3[01])_(0\d|1\d|2[0-3])_([0-5]\d)_([0-5]\d))/g;

        test('Should return Current Date Time string in YYYY_MM_DD_HH_MM_SS format with no spaces or unexpected characters making sure it accepts digits', () =>
        {
            expect(looseRegexCurrentDateTime.test(getCurrentDateTimeStr())).toBe(true);
        });

        test('Should return Current Date Time string in YYYY_MM_DD_HH_MM_SS format with no spaces or unexpected characters', () =>
        {
            expect(regexCurrentDateTime.test(getCurrentDateTimeStr())).toBe(true);
        });
    });
});
