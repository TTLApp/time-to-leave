/* eslint-disable no-undef */
'use strict';

const { getDateStr } = require('../../js/date-aux');

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
});


