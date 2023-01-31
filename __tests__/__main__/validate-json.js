/* eslint-disable no-undef */
'use strict';

const {
    validateJSON
} = require('../../js/validate-json');

describe('Validate json', function()
{
    process.env.NODE_ENV = 'test';
    describe('validateJSON(instance)', function()
    {

        describe('validate type', function()
        {
            const goodFlexibleEntry = [{ 'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const goodWaivedEntry = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidType = [{ 'type': 'not valid type', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            test('should be valid JSON', () =>
            {
                expect(validateJSON(goodWaivedEntry)).toBeTruthy();
                expect(validateJSON(goodFlexibleEntry)).toBeTruthy();
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidType)).not.toBeTruthy();
            });
        });

        describe('validate date', function()
        {
            const goodFlexibleEntry = [{ 'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const goodWaivedEntry = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidDateFormat = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidDateType = [{ 'type': 'flexible', 'date': ['2020-06-13'], 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidDateValue = [{ 'type': 'flexible', 'date': '2020-26-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidDayInMonth = [{ 'type': 'flexible', 'date': '2020-04-31', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            test('should be valid JSON', () =>
            {
                expect(validateJSON(goodWaivedEntry)).toBeTruthy();
                expect(validateJSON(goodFlexibleEntry)).toBeTruthy();
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
            const goodWaivedEntry = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const invalidDataType = [{ 'type': 'waived', 'date': '2020-06-03', 'data': ['waived'], 'hours': '08:00' }];
            test('should be valid JSON', () =>
            {
                expect(validateJSON(goodWaivedEntry)).toBeTruthy();
            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(invalidDataType)).not.toBeTruthy();
            });
        });

        describe('validate hours', function()
        {
            const goodWaivedEntry = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00' }];
            const goodWaivedEntry2 = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '--:--' }];
            const invalidHoursFormat = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08-00' }];
            const invalidHoursType = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': 8 }];
            const invalidHoursValue = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '30:00' }];
            const invalidHoursValueNegative = [{ 'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '-01:00' }];
            test('should be valid JSON', () =>
            {
                expect(validateJSON(goodWaivedEntry)).toBeTruthy();
                expect(validateJSON(goodWaivedEntry2)).toBeTruthy();
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
            const goodFlexibleEntry = [{ 'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat1 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['0800', '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat2 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['08', '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat3 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': [8, '12:00', '13:00', '14:00'] }];
            const invalidValuesFormat4 = [{ 'type': 'flexible', 'date': '03-06-2020', 'values': ['08-00', '12:00', '13:00', '14:00'] }];
            const invalidValuesType = [{ 'type': 'flexible', 'date': ['2020-06-03'], 'values': '08:00' }];
            const invalidValuesValue = [{ 'type': 'flexible', 'date': '2020-26-03', 'values': ['80:00', '12:00', '13:00', '14:00'] }];
            const invalidPointsInTime = [{ 'type': 'flexible', 'date': '2020-02-01', 'values': ['08:00', '07:00', '13:00', '14:00'] }];
            test('should be valid JSON', () =>
            {
                expect(validateJSON(goodFlexibleEntry)).toBeTruthy();
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
            const notADay = [{ 'type': 'flexible', 'date': '2020-12-00', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const notADay2 = [{ 'type': 'flexible', 'date': '2020-12-32', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                for (let i=1; i<=9; i++)
                {
                    const firstNineDays = [{ 'type': 'flexible', 'date': '2020-12-0'+ i, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    expect(validateJSON(firstNineDays)).toBeTruthy();
                }
                for (let i=10; i<=31; i++)
                {
                    const restDays = [{ 'type': 'flexible', 'date': '2020-12-'+ i, 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    expect(validateJSON(restDays)).toBeTruthy();
                }

            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(notADay)).not.toBeTruthy();
                expect(validateJSON(notADay2)).not.toBeTruthy();

            });
        });

        describe('validate every month2', function()
        {
            const notAMonth = [{ 'type': 'flexible', 'date': '2020-00-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const notAMonth2 = [{ 'type': 'flexible', 'date': '2020-13-03', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                for (let i=1; i<=9; i++)
                {
                    const firstNineMonths = [{ 'type': 'flexible', 'date': '2020-0'+ i +'-12', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    expect(validateJSON(firstNineMonths)).toBeTruthy();
                }
                for (let i=10; i<=12; i++)
                {
                    const restMonths = [{ 'type': 'flexible', 'date': '2020-'+ i +'-12', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
                    expect(validateJSON(restMonths)).toBeTruthy();
                }

            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(notAMonth)).not.toBeTruthy();
                expect(validateJSON(notAMonth2)).not.toBeTruthy();

            });
        });

        describe('validate leap year', function()
        {
            const validLeapYear = [{ 'type': 'flexible', 'date': '2020-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];
            const notValidLeapYear = [{ 'type': 'flexible', 'date': '2021-02-29', 'values': ['08:00', '12:00', '13:00', '14:00'] }];

            test('should be valid JSON', () =>
            {
                expect(validateJSON(validLeapYear)).toBeTruthy();

            });
            test('should not be valid JSON', () =>
            {
                expect(validateJSON(notValidLeapYear)).not.toBeTruthy();
            });
        });

    });
});
