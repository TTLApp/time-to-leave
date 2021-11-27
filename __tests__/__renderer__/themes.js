/* eslint-disable no-undef */
'use strict';

import {
    applyTheme,
    isValidTheme
} from '../../renderer/themes.js';
window.$ = window.jQuery = require('jquery');

describe('Theme Functions', function()
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

    describe('applyTheme()', function()
    {
        test('should apply', () =>
        {
            expect(applyTheme('system-default')).toBeTruthy();
            expect(applyTheme('light')).toBeTruthy();
            expect(applyTheme('dark')).toBeTruthy();
            expect(applyTheme('cadent-star')).toBeTruthy();
        });

        test('should not apply', function()
        {
            expect(applyTheme('foo')).not.toBeTruthy();
            expect(applyTheme('bar')).not.toBeTruthy();
        });
    });
});
