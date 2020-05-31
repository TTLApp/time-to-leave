/* eslint-disable no-undef */
const {
    applyTheme,
    isValidTheme
} = require('../../js/themes');
window.$ = window.jQuery = require('jquery');

describe('Theme Functions', function() {

    describe('isValidTheme()', function() {
        test('should validate', () => {
            expect(isValidTheme('light')).toBeTruthy();
            expect(isValidTheme('dark')).toBeTruthy();
        });
    });

    describe('isValidTheme()', function() {
        test('should not validate', () => {
            expect(isValidTheme('foo')).not.toBeTruthy();
            expect(isValidTheme('bar')).not.toBeTruthy();
        });
    });

    describe('applyTheme()', function() {
        test('should apply', () => {
            expect(applyTheme('light')).toBeTruthy();
            expect(applyTheme('dark')).toBeTruthy();
        });

        test('should not apply', function() {
            expect(applyTheme('foo')).not.toBeTruthy();
            expect(applyTheme('bar')).not.toBeTruthy();
        });
    });
});

