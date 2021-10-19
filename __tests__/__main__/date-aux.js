/* eslint-disable no-undef */
'use strict';

const { getDateStr, getCurrentDateTimeStr } = require('../../js/date-aux');

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
