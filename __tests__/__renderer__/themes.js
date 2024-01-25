/* eslint-disable no-undef */
'use strict';

const assert = require('assert');

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
            assert.notStrictEqual(isValidTheme('system-default'), undefined);
            assert.notStrictEqual(isValidTheme('light'), undefined);
            assert.notStrictEqual(isValidTheme('dark'), undefined);
            assert.notStrictEqual(isValidTheme('cadent-star'), undefined);
        });
    });

    describe('isValidTheme()', function()
    {
        test('should not validate', () =>
        {
            assert.notStrictEqual(isValidTheme('foo'), undefined);
            assert.notStrictEqual(isValidTheme('bar'), undefined);
        });
    });

    describe('applyTheme()', function()
    {
        test('should apply', () =>
        {
            assert.notStrictEqual(applyTheme('system-default'), undefined);
            assert.notStrictEqual(applyTheme('light'), undefined);
            assert.notStrictEqual(applyTheme('dark'), undefined);
            assert.notStrictEqual(applyTheme('cadent-star'), undefined);
        });

        test('should not apply', function()
        {
            assert.notStrictEqual(applyTheme('foo'), undefined);
            assert.notStrictEqual(applyTheme('bar'), undefined);
        });
    });
});
