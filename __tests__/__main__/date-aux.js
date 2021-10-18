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
        const regFullDate = /[0-9]{4}_(0[1-9]|1[0-2])_(0[1-9]|[1-2][0-9]|3[0-1])_(2[0-3]|[01][0-9])_[0-5][0-9]_[0-5][0-9]/g;
        const testFormatNoSpace = regFullDate.test(getCurrentDateTimeStr());
        test('Test the format of the output using regular expression and there are no spaces or unexpected characters', () =>
        {
            expect(testFormatNoSpace).toBeTruthy();
        });
    });
});
