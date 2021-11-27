/* eslint-disable no-undef */
'use strict';

const {
    defaultPreferences,
    getPreferencesFilePath,
    getUserPreferences,
    savePreferences,
    isNotBoolean,
    isNotificationInterval,
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

describe('Should return true if the value is a valid notification interval', () =>
{
    test('Value as number (val >= 1 || val <= 30)', () =>
    {
        expect(isNotificationInterval(1)).toBe(true);
        expect(isNotificationInterval(15)).toBe(true);
        expect(isNotificationInterval(30)).toBe(true);
        expect(isNotificationInterval(-5)).not.toBe(true);
        expect(isNotificationInterval(0)).not.toBe(true);
        expect(isNotificationInterval(31)).not.toBe(true);
        expect(isNotificationInterval(60)).not.toBe(true);
    });
    test('Value as string (val >= 1 || val <= 30)', () =>
    {
        expect(isNotificationInterval('1')).toBe(true);
        expect(isNotificationInterval('30')).toBe(true);
        expect(isNotificationInterval('-5')).not.toBe(true);
        expect(isNotificationInterval('31')).not.toBe(true);
        expect(isNotificationInterval('A')).not.toBe(true);
        expect(isNotificationInterval('abc')).not.toBe(true);
    });
    test('Value as boolean type', () =>
    {
        expect(isNotificationInterval(true)).not.toBe(true);
        expect(isNotificationInterval(false)).not.toBe(true);
    });
});

describe('User Preferences save/load', () =>
{
    process.env.NODE_ENV = 'test';

    // Remove preferences file to guarantee equal execution of tests
    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath))
        fs.unlinkSync(preferencesFilePath);

    const testPreferences = defaultPreferences;
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

