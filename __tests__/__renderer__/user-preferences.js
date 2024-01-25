/* eslint-disable no-undef */
'use strict';

const assert = require('assert');

const {
    defaultPreferences,
    getPreferencesFilePath,
    getUserPreferences,
    savePreferences,
    isNotBoolean,
    isNotificationInterval,
} = require('../../js/user-preferences');
import fs from 'fs';

describe('Should return false if the value is not boolean type', () =>
{
    test('Value as boolean type', () =>
    {
        assert.strictEqual(isNotBoolean(true), false);
    });
    test('Value as string type', () =>
    {
        assert.strictEqual(isNotBoolean('string'), true);
    });
});

describe('Should return true if the value is a valid notification interval', () =>
{
    test('Value as number (val >= 1 || val <= 30)', () =>
    {
        assert.strictEqual(isNotificationInterval(1), true);
        assert.strictEqual(isNotificationInterval(15), true);
        assert.strictEqual(isNotificationInterval(30), true);
        assert.notStrictEqual(isNotificationInterval(-5), true);
        assert.notStrictEqual(isNotificationInterval(0), true);
        assert.notStrictEqual(isNotificationInterval(31), true);
        assert.notStrictEqual(isNotificationInterval(60), true);
    });
    test('Value as string (val >= 1 || val <= 30)', () =>
    {
        assert.strictEqual(isNotificationInterval('1'), true);
        assert.strictEqual(isNotificationInterval('30'), true);
        assert.notStrictEqual(isNotificationInterval('-5'), true);
        assert.notStrictEqual(isNotificationInterval('31'), true);
        assert.notStrictEqual(isNotificationInterval('A'), true);
        assert.notStrictEqual(isNotificationInterval('abc'), true);
    });
    test('Value as boolean type', () =>
    {
        assert.notStrictEqual(isNotificationInterval(true), true);
        assert.notStrictEqual(isNotificationInterval(false), true);
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
            assert.notStrictEqual(savePreferences(defaultPreferences), undefined);
            expect(getUserPreferences()).not.toStrictEqual(empty);
            expect(getUserPreferences()).toStrictEqual(defaultPreferences);
        });

        test('savePreferences()', () =>
        {
            assert.notStrictEqual(savePreferences(testPreferences), undefined);
        });

        test('getUserPreferences() to check that it saved', () =>
        {
            expect(getUserPreferences()).toStrictEqual(testPreferences);
            assert.notStrictEqual(savePreferences(defaultPreferences), undefined);
        });
    });

});

