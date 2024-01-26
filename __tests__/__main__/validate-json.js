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
                assert.strictEqual(validateJSON(validWaivedType), true);
                assert.strictEqual(validateJSON(validFlexibleType), true);
            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidTypeValue), false);
                assert.strictEqual(validateJSON(invalidTypeType), false);
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
                assert.strictEqual(validateJSON(validFlexibleDate1), true);
                assert.strictEqual(validateJSON(validFlexibleDate2), true);
                assert.strictEqual(validateJSON(validWaivedDate1), true);
                assert.strictEqual(validateJSON(validWaivedDate2), true);
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
                assert.strictEqual(validateJSON(validWaivedDate), true);
                assert.strictEqual(validateJSON(validFlexibleDate), true);
            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidDateFormat), false);
                assert.strictEqual(validateJSON(invalidDateType), false);
                assert.strictEqual(validateJSON(invalidDateValue), false);
                assert.strictEqual(validateJSON(invalidDayInMonth), false);
            });
        });

        describe('validate data', function()
        {
            const validData = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidDataType = [{ 'type': 'waived', 'date': '2020-06-03', 'data': ['waived'], 'hours': '08:00' }];
            test('should be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(validData), true);
            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidDataType), false);
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
                assert.strictEqual(validateJSON(validHours), true);
                assert.strictEqual(validateJSON(validHours2), true);
            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidHoursFormat), false);
                assert.strictEqual(validateJSON(invalidHoursType), false);
                assert.strictEqual(validateJSON(invalidHoursValue), false);
                assert.strictEqual(validateJSON(invalidHoursValueNegative), false);
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
                assert.strictEqual(validateJSON(validValues), true);
            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidValuesFormat1), false);
                assert.strictEqual(validateJSON(invalidValuesFormat2), false);
                assert.strictEqual(validateJSON(invalidValuesFormat3), false);
                assert.strictEqual(validateJSON(invalidValuesFormat4), false);
                assert.strictEqual(validateJSON(invalidValuesType), false);
                assert.strictEqual(validateJSON(invalidValuesValue), false);
                assert.strictEqual(validateJSON(invalidPointsInTime), false);
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
                    assert.strictEqual(validateJSON(firstNineDays), true);
                }
                for (let i = 10; i <= 31; i++)
                {
                    const restDays = [{ 'type': 'flexible', 'date': `2020-12-${i}`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    assert.strictEqual(validateJSON(restDays), true);
                }
            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidDay), false);
                assert.strictEqual(validateJSON(invalidDay2), false);
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
                    assert.strictEqual(validateJSON(firstNineMonths), true);
                }
                for (let i = 10; i <= 12; i++)
                {
                    const restMonths = [{ 'type': 'flexible', 'date': `2020-${i}-13`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    assert.strictEqual(validateJSON(restMonths), true);
                }
            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidMonth), false);
                assert.strictEqual(validateJSON(invalidMonth2), false);
            });
        });

        describe('validate leap year', function()
        {
            const validLeapYear = [{ 'type': 'flexible', 'date': '2020-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidLeapYear = [{ 'type': 'flexible', 'date': '2021-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(validLeapYear), true);

            });
            test('should not be valid JSON', () =>
            {
                assert.strictEqual(validateJSON(invalidLeapYear), false);
            });
        });
    });
});
