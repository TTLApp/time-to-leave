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
            assert.strictEqual(isValidTheme('system-default'), true);
            assert.strictEqual(isValidTheme('light'), true);
            assert.strictEqual(isValidTheme('dark'), true);
            assert.strictEqual(isValidTheme('cadent-star'), true);
        });
    });

    describe('isValidTheme()', function()
    {
        test('should not validate', () =>
        {
            assert.strictEqual(isValidTheme('foo'), false);
            assert.strictEqual(isValidTheme('bar'), false);
        });
    });

    describe('applyTheme()', function()
    {
        test('should apply', () =>
        {
            assert.strictEqual(applyTheme('system-default'), true);
            assert.strictEqual(applyTheme('light'), true);
            assert.strictEqual(applyTheme('dark'), true);
            assert.strictEqual(applyTheme('cadent-star'), true);
        });

        test('should not apply', function()
        {
            assert.strictEqual(applyTheme('foo'), false);
            assert.strictEqual(applyTheme('bar'), false);
        });
    });
});
