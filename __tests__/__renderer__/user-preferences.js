/* eslint-disable no-undef */
const {
    defaultPreferences,
    getUserPreferences,
    savePreferences,
} = require('../../js/user-preferences');

describe('User Preferences save/load', () => {
    process.env.NODE_ENV = 'test';

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

