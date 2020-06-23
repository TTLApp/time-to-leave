/* eslint-disable no-undef */
const {
    defaultPreferences,
    getPreferencesFilePath,
    getUserPreferences,
    savePreferences,
} = require('../../js/user-preferences');
const fs = require('fs');

describe('User Preferences save/load', () => {
    process.env.NODE_ENV = 'test';

    // Remove preferences file to guarantee equal execution of tests
    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath))
        fs.unlinkSync(preferencesFilePath);

    let testPreferences = defaultPreferences;
    testPreferences['working-days-sunday'] = true;

    const empty = {};

    describe('savePreferences() and getUserPreferences()', () => {

        test('getUserPreferences() before saving any', () => {
            expect(savePreferences(defaultPreferences)).toBeDefined();
            expect(getUserPreferences()).not.toStrictEqual(empty);
            expect(getUserPreferences()).toStrictEqual(defaultPreferences);
        });

        test('savePreferences()', () => {
            expect(savePreferences(testPreferences)).toBeDefined();
        });

        test('getUserPreferences() to check that it saved', () => {
            expect(getUserPreferences()).toStrictEqual(testPreferences);
            expect(savePreferences(defaultPreferences)).toBeDefined();
        });
    });

});

