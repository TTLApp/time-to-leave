/* eslint-disable no-undef */
'use strict';

import assert from 'assert';
import fs from 'fs';

import {
    getDefaultPreferences,
    getPreferencesFilePath,
    getUserPreferences,
    isNotBoolean,
    isNotificationInterval,
    savePreferences,
} from '../../js/user-preferences.mjs';

describe('Should return false if the value is not boolean type', () =>
{
    it('Value as boolean type', () =>
    {
        assert.strictEqual(isNotBoolean(true), false);
    });

    it('Value as string type', () =>
    {
        assert.strictEqual(isNotBoolean('string'), true);
    });
});

describe('Should return true if the value is a valid notification interval', () =>
{
    it('Value as number (val >= 1 || val <= 30)', () =>
    {
        assert.strictEqual(isNotificationInterval(1), true);
        assert.strictEqual(isNotificationInterval(15), true);
        assert.strictEqual(isNotificationInterval(30), true);
        assert.notStrictEqual(isNotificationInterval(-5), true);
        assert.notStrictEqual(isNotificationInterval(0), true);
        assert.notStrictEqual(isNotificationInterval(31), true);
        assert.notStrictEqual(isNotificationInterval(60), true);
    });

    it('Value as string (val >= 1 || val <= 30)', () =>
    {
        assert.strictEqual(isNotificationInterval('1'), true);
        assert.strictEqual(isNotificationInterval('30'), true);
        assert.notStrictEqual(isNotificationInterval('-5'), true);
        assert.notStrictEqual(isNotificationInterval('31'), true);
        assert.notStrictEqual(isNotificationInterval('A'), true);
        assert.notStrictEqual(isNotificationInterval('abc'), true);
    });

    it('Value as boolean type', () =>
    {
        assert.notStrictEqual(isNotificationInterval(true), true);
        assert.notStrictEqual(isNotificationInterval(false), true);
    });
});

describe('User Preferences save/load', () =>
{
    before(() =>
    {
        // Remove preferences file to guarantee equal execution of tests
        const preferencesFilePath = getPreferencesFilePath();
        if (fs.existsSync(preferencesFilePath))
        {
            fs.unlinkSync(preferencesFilePath);
        }
    });

    const testPreferences = structuredClone(getDefaultPreferences());
    testPreferences['working-days-sunday'] = true;

    const empty = {};

    describe('savePreferences() and getUserPreferences()', () =>
    {
        it('getUserPreferences() before saving any', () =>
        {
            assert.notStrictEqual(savePreferences(getDefaultPreferences()), undefined);
            assert.notDeepStrictEqual(getUserPreferences(), empty);
            assert.deepStrictEqual(getUserPreferences(), getDefaultPreferences());
        });

        it('savePreferences()', () =>
        {
            assert.notStrictEqual(savePreferences(testPreferences), undefined);
        });

        it('getUserPreferences() to check that it saved', () =>
        {
            assert.deepStrictEqual(getUserPreferences(), testPreferences);
            assert.notStrictEqual(savePreferences(getDefaultPreferences()), undefined);
        });
    });
});
