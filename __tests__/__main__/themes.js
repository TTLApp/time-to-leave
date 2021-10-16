/* eslint-disable no-undef */
'use strict';

const {
    isValidTheme
} = require('../../js/themes.js');

describe('Main: Theme Functions', function()
{
    describe('isValidTheme()', function()
    {
        test('should validate', () =>
        {
            expect(isValidTheme('system-default')).toBeTruthy();
            expect(isValidTheme('light')).toBeTruthy();
            expect(isValidTheme('dark')).toBeTruthy();
            expect(isValidTheme('cadent-star')).toBeTruthy();
        });
    });

    describe('isValidTheme()', function()
    {
        test('should not validate', () =>
        {
            expect(isValidTheme('foo')).not.toBeTruthy();
            expect(isValidTheme('bar')).not.toBeTruthy();
        });
    });
});
