/* eslint-disable no-undef */
'use strict';

const assert = require('assert');
import { validateJSON } from '../../js/validate-json.js';

describe('Validate json', function()
{
    process.env.NODE_ENV = 'test';
    describe('validateJSON(instance)', function()
    {
        describe('validate type', function()
        {
            const validFlexibleType = [{ 'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const validWaivedType = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidTypeValue = [{ 'type': 'not valid type', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidTypeType = [{ 'type': ['not valid type'], 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(validWaivedType), undefined);
                assert.notStrictEqual(validateJSON(validFlexibleType), undefined);
            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidTypeValue), undefined);
                assert.notStrictEqual(validateJSON(invalidTypeType), undefined);
            });
        });

        describe('validate date with and without leading 0', function()
        {
            const validFlexibleDate1 = [{ 'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const validFlexibleDate2 = [{ 'type': 'flexible', 'date': '2020-6-3', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const validWaivedDate1 = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const validWaivedDate2 = [{ 'type': 'waived', 'date': '2020-6-3', 'data': 'waived', 'hours': '08:00' }];
            test('should be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(validFlexibleDate1), undefined);
                assert.notStrictEqual(validateJSON(validFlexibleDate2), undefined);
                assert.notStrictEqual(validateJSON(validWaivedDate1), undefined);
                assert.notStrictEqual(validateJSON(validWaivedDate2), undefined);
            });
        });

        describe('validate date', function()
        {
            const validFlexibleDate = [{ 'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const validWaivedDate = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidDateFormat = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidDateType = [{ 'type': 'flexible', 'date': ['2020-06-13'], 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidDateValue = [{ 'type': 'flexible', 'date': '2020-26-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidDayInMonth = [{ 'type': 'flexible', 'date': '2020-04-31', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            test('should be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(validWaivedDate), undefined);
                assert.notStrictEqual(validateJSON(validFlexibleDate), undefined);
            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidDateFormat), undefined);
                assert.notStrictEqual(validateJSON(invalidDateType), undefined);
                assert.notStrictEqual(validateJSON(invalidDateValue), undefined);
                assert.notStrictEqual(validateJSON(invalidDayInMonth), undefined);
            });
        });

        describe('validate data', function()
        {
            const validData = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidDataType = [{ 'type': 'waived', 'date': '2020-06-03', 'data': ['waived'], 'hours': '08:00' }];
            test('should be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(validData), undefined);
            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidDataType), undefined);
            });
        });

        describe('validate hours', function()
        {
            const validHours = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const validHours2 = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '--:--' }];
            const invalidHoursFormat = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08-00' }];
            const invalidHoursType = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': 8 }];
            const invalidHoursValue = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '30:00' }];
            const invalidHoursValueNegative = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '-01:00' }];
            test('should be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(validHours), undefined);
                assert.notStrictEqual(validateJSON(validHours2), undefined);
            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidHoursFormat), undefined);
                assert.notStrictEqual(validateJSON(invalidHoursType), undefined);
                assert.notStrictEqual(validateJSON(invalidHoursValue), undefined);
                assert.notStrictEqual(validateJSON(invalidHoursValueNegative), undefined);
            });
        });

        describe('validate values', function()
        {
            const validValues = [{ 'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat1 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['0800', '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat2 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['08', '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat3 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': [8, '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat4 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['08-00', '12:00', '13:00', '14:00'] }];
            const invalidValuesType = [{ 'type': 'flexible', 'date': ['2020-06-03'], 'values': '08:00' }];
            const invalidValuesValue = [{ 'type': 'flexible', 'date': '2020-26-03', 'values': ['80:00', '12:00', '13:00', '14:00'] }];
            const invalidPointsInTime = [{ 'type': 'flexible', 'date': '2020-02-01', 'values': ['08:00', '07:00', '13:00', '14:00'] }];
            test('should be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(validValues), undefined);
            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidValuesFormat1), undefined);
                assert.notStrictEqual(validateJSON(invalidValuesFormat2), undefined);
                assert.notStrictEqual(validateJSON(invalidValuesFormat3), undefined);
                assert.notStrictEqual(validateJSON(invalidValuesFormat4), undefined);
                assert.notStrictEqual(validateJSON(invalidValuesType), undefined);
                assert.notStrictEqual(validateJSON(invalidValuesValue), undefined);
                assert.notStrictEqual(validateJSON(invalidPointsInTime), undefined);
            });
        });

        describe('validate every day', function()
        {
            const invalidDay = [{ 'type': 'flexible', 'date': '2020-12-00', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidDay2 = [{ 'type': 'flexible', 'date': '2020-12-32', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                for (let i = 1; i <= 9; i++)
                {
                    const firstNineDays = [{ 'type': 'flexible', 'date': `2020-12-0${i}`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    assert.notStrictEqual(validateJSON(firstNineDays), undefined);
                }
                for (let i = 10; i <= 31; i++)
                {
                    const restDays = [{ 'type': 'flexible', 'date': `2020-12-${i}`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    assert.notStrictEqual(validateJSON(restDays), undefined);
                }
            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidDay), undefined);
                assert.notStrictEqual(validateJSON(invalidDay2), undefined);
            });
        });

        describe('validate every month', function()
        {
            const invalidMonth = [{ 'type': 'flexible', 'date': '2020-00-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidMonth2 = [{ 'type': 'flexible', 'date': '2020-13-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                for (let i = 1; i <= 9; i++)
                {
                    const firstNineMonths = [{ 'type': 'flexible', 'date': `2020-0${i}-13`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    assert.notStrictEqual(validateJSON(firstNineMonths), undefined);
                }
                for (let i = 10; i <= 12; i++)
                {
                    const restMonths = [{ 'type': 'flexible', 'date': `2020-${i}-13`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    assert.notStrictEqual(validateJSON(restMonths), undefined);
                }
            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidMonth), undefined);
                assert.notStrictEqual(validateJSON(invalidMonth2), undefined);
            });
        });

        describe('validate leap year', function()
        {
            const validLeapYear = [{ 'type': 'flexible', 'date': '2020-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidLeapYear = [{ 'type': 'flexible', 'date': '2021-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(validLeapYear), undefined);

            });
            test('should not be valid JSON', () =>
            {
                assert.notStrictEqual(validateJSON(invalidLeapYear), undefined);
            });
        });
    });
});
