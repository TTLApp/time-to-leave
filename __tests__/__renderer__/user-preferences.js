/* eslint-disable no-undef */
'use strict';

const {
    defaultPreferences,
    getPreferencesFilePath,
    getUserPreferences,
    savePreferences,
    isNotBoolean,
    isValidPreferenceTime,
} = require('../../js/user-preferences');
const fs = require('fs');

describe('Should return false if the value is not boolean type', () =>
{
    test('Value as boolean type', () =>
    {
        expect(isNotBoolean(true)).toBe(false);
    });
    test('Value as string type', () =>
    {
        expect(isNotBoolean('string')).toBe(true);
    });
});

describe('Should return true if the value is a valid time', () =>
{
    test('Value as time format (hh:mm)', () =>
    {
        expect(isValidPreferenceTime('00:35')).toBe(true);
    });
    test('Value as number type (val < 1 || val > 30)', () =>
    {
        expect(isValidPreferenceTime(60)).toBe(true);
    });
    test('Value as boolean type', () =>
    {
        expect(isValidPreferenceTime(true)).toBe(false);
    });
});

describe('User Preferences save/load', () =>
{
    process.env.NODE_ENV = 'test';

    // Remove preferences file to guarantee equal execution of tests
    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath))
        fs.unlinkSync(preferencesFilePath);

    let testPreferences = defaultPreferences;
    testPreferences['working-days-sunday'] = true;

    const empty = {};

    describe('savePreferences() and getUserPreferences()', () =>
    {

        test('getUserPreferences() before saving any', () =>
        {
            expect(savePreferences(defaultPreferences)).toBeDefined();
            expect(getUserPreferences()).not.toStrictEqual(empty);
            expect(getUserPreferences()).toStrictEqual(defaultPreferences);
        });

        test('savePreferences()', () =>
        {
            expect(savePreferences(testPreferences)).toBeDefined();
        });

        test('getUserPreferences() to check that it saved', () =>
        {
            expect(getUserPreferences()).toStrictEqual(testPreferences);
            expect(savePreferences(defaultPreferences)).toBeDefined();
        });
    });

});

