/* eslint-disable no-undef */
'use strict';

const { getDateStr, getCurrentDateTimeStr } = require('../../js/date-aux');

describe('Date Functions', () =>
{
    const badDate = ['this', 'is', 'not', 'a', 'date'];
    const testDate = new Date();
    const expectedDate = new Date(testDate.getTime() - (testDate.getTimezoneOffset() * 60000)).toISOString().substr(0, 10);
    const testCurrentTimeStr = testDate.toLocaleTimeString([], {hour: '2-digit', hourCycle: 'h23', minute:'2-digit', second:'2-digit'}).substr(0, 8);
    const reg = /[-:]/g;
    const testGetCurrentDateTimeStr = `${expectedDate}_${testCurrentTimeStr}`.replace(reg,'_');




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
        test('Test the format of the output using regular expression (The format is YYYY_MM_DD_HH_MM_SS)', () =>
        {
            expect(getCurrentDateTimeStr()).toBe(testGetCurrentDateTimeStr);
        });
    });

});


