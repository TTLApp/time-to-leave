/* eslint-disable no-undef */
'use strict';

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
                expect(validateJSON(validWaivedType)).toBeTruthy();
                expect(validateJSON(validFlexibleType)).toBeTruthy();
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidTypeValue)).not.toBeTruthy();
                expect(validateJSON(invalidTypeType)).not.toBeTruthy();
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
                expect(validateJSON(validFlexibleDate1)).toBeTruthy();
                expect(validateJSON(validFlexibleDate2)).toBeTruthy();
                expect(validateJSON(validWaivedDate1)).toBeTruthy();
                expect(validateJSON(validWaivedDate2)).toBeTruthy();
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
                expect(validateJSON(validWaivedDate)).toBeTruthy();
                expect(validateJSON(validFlexibleDate)).toBeTruthy();
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidDateFormat)).not.toBeTruthy();
                expect(validateJSON(invalidDateType)).not.toBeTruthy();
                expect(validateJSON(invalidDateValue)).not.toBeTruthy();
                expect(validateJSON(invalidDayInMonth)).not.toBeTruthy();
            });
        });

        describe('validate data', function()
        {
            const validData = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidDataType = [{ 'type': 'waived', 'date': '2020-06-03', 'data': ['waived'], 'hours': '08:00' }];
            test('should be valid JSON', () =>
            {
                expect(validateJSON(validData)).toBeTruthy();
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidDataType)).not.toBeTruthy();
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
                expect(validateJSON(validHours)).toBeTruthy();
                expect(validateJSON(validHours2)).toBeTruthy();
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidHoursFormat)).not.toBeTruthy();
                expect(validateJSON(invalidHoursType)).not.toBeTruthy();
                expect(validateJSON(invalidHoursValue)).not.toBeTruthy();
                expect(validateJSON(invalidHoursValueNegative)).not.toBeTruthy();
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
                expect(validateJSON(validValues)).toBeTruthy();
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidValuesFormat1)).not.toBeTruthy();
                expect(validateJSON(invalidValuesFormat2)).not.toBeTruthy();
                expect(validateJSON(invalidValuesFormat3)).not.toBeTruthy();
                expect(validateJSON(invalidValuesFormat4)).not.toBeTruthy();
                expect(validateJSON(invalidValuesType)).not.toBeTruthy();
                expect(validateJSON(invalidValuesValue)).not.toBeTruthy();
                expect(validateJSON(invalidPointsInTime)).not.toBeTruthy();
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
                    expect(validateJSON(firstNineDays)).toBeTruthy();
                }
                for (let i = 10; i <= 31; i++)
                {
                    const restDays = [{ 'type': 'flexible', 'date': `2020-12-${i}`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    expect(validateJSON(restDays)).toBeTruthy();
                }
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidDay)).not.toBeTruthy();
                expect(validateJSON(invalidDay2)).not.toBeTruthy();
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
                    expect(validateJSON(firstNineMonths)).toBeTruthy();
                }
                for (let i = 10; i <= 12; i++)
                {
                    const restMonths = [{ 'type': 'flexible', 'date': `2020-${i}-13`, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    expect(validateJSON(restMonths)).toBeTruthy();
                }
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidMonth)).not.toBeTruthy();
                expect(validateJSON(invalidMonth2)).not.toBeTruthy();
            });
        });

        describe('validate leap year', function()
        {
            const validLeapYear = [{ 'type': 'flexible', 'date': '2020-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidLeapYear = [{ 'type': 'flexible', 'date': '2021-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                expect(validateJSON(validLeapYear)).toBeTruthy();

            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidLeapYear)).not.toBeTruthy();
            });
        });
    });
});
