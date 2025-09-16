'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';
import { stub } from 'sinon';
import fs from 'fs';
import path from 'path';

import {
    applyTheme,
    isValidTheme,
    themeOptions
} from '../../renderer/themes.js';

const $_backup = global.$;
const availableThemes = themeOptions.filter(theme => theme !== 'system-default');
const invalidThemes = ['non_existent'];

describe('Theme Functions', function()
{
    before(() =>
    {
        // Stub $ and window.matchMedia for applyTheme()
        global.$ = stub().returns({'attr': stub()});
        stub(global.window, 'matchMedia').returns({matches: true});
    });

    describe('isValidTheme()', function()
    {
        it('should validate', () =>
        {
            assert.strictEqual(isValidTheme('system-default'), true);
            availableThemes.forEach(theme =>
            {
                assert.strictEqual(isValidTheme(theme), true, `Theme '${theme}' should be valid`);
            });
        });
    });

    describe('isValidTheme()', function()
    {
        it('should not validate invalid themes', () =>
        {
            invalidThemes.forEach(theme =>
            {
                assert.strictEqual(isValidTheme(theme), false, `Theme '${theme}' should be invalid`);
            });
        });
    });

    describe('applyTheme()', function()
    {
        beforeEach(() =>
        {
            global.window.matchMedia.resetHistory();
            global.$.resetHistory();
        });

        it('should apply all available themes', () =>
        {
            assert.strictEqual(applyTheme('system-default'), true);
            availableThemes.forEach(theme =>
            {
                assert.strictEqual(applyTheme(theme), true, `Theme '${theme}' should apply successfully`);
            });

            const expectedMatchMediaCalls = 1;
            const expectedJQueryCalls = 1 + availableThemes.length;

            assert.strictEqual(global.window.matchMedia.callCount, expectedMatchMediaCalls);
            assert.strictEqual(global.$.callCount, expectedJQueryCalls);
        });

        it('should not apply invalid themes', function()
        {
            invalidThemes.forEach(theme =>
            {
                assert.strictEqual(applyTheme(theme), false, `Theme '${theme}' should not apply`);
            });

            assert.strictEqual(global.window.matchMedia.callCount, 0);
            assert.strictEqual(global.$.callCount, 0);
        });
    });

    describe('Theme Filenames', function()
    {
        it('should have kebab-case file names for theme css files', () =>
        {
            const themesDir = path.join(process.cwd(), 'css', 'themes');
            const files = fs.readdirSync(themesDir);

            const themeFiles = files
                .filter(file => file.endsWith('.css'))
                .filter(file => !file.includes('template') && !file.includes('index'));

            const kebabCasePattern = /^[a-z]+(-[a-z]+)*\.css$/;

            themeFiles.forEach(file =>
            {
                assert.match(file, kebabCasePattern,
                    `Theme file '${file}' should use kebab-case ('my-theme.css', not 'my_theme.css' or 'MyTheme.css')`);
            });
        });

        it('should have theme names that match file names', () =>
        {
            const themesDir = path.join(process.cwd(), 'css', 'themes');
            const files = fs.readdirSync(themesDir);

            const themeFiles = files
                .filter(file => file.endsWith('.css'))
                .filter(file => !file.includes('template') && !file.includes('index'))
                .map(file => path.basename(file, '.css'));

            themeFiles.forEach(themeName =>
            {
                assert.ok(themeOptions.includes(themeName),
                    `should have a corresponding entry in theme array '${themeName}.css'`);
            });

            availableThemes.forEach(themeName =>
            {
                assert.ok(themeFiles.includes(themeName),
                    `Should have a file '${themeName}.css' for theme '${themeName}'`);
            });
        });
    });

    describe('Theme CSS Variables', function()
    {
        // Required CSS variables for any theme
        const requiredVariables = [
            // Base colors
            '--page-bground', '--page-color',

            // Table colors
            '--table-bground', '--input-bground', '--table-header-bground', '--table-border',
            '--table-total-border', '--table-cell-offtime-bground', '--table-cell-offtime-color',
            '--table-cell-total-bground', '--table-cell-total-color', '--table-header-label-bground',
            '--table-header-label-shadow',

            // Status colors
            '--error', '--punch-bground', '--punch-color', '--punch-invert',
            '--punch-disable-bground',

            // Control colors
            '--slider-background-color', '--slider-checked-color', '--slider-unchecked-color',
            '--weekday-background', '--weekday-selected',

            // System states
            '--svg-invert', '--disabled-input-bground', '--title-color', '--input-border',
            '--tab-font-color', '--tab-waiver-color', '--tab-waiver-border', '--outline'
        ];

        const themeFilesWithVariables = availableThemes.filter(themeName =>
        {
            if (themeName === 'index') return false; // Skip generated index.css it's just imports

            const themesDir = path.join(process.cwd(), 'css', 'themes');
            const themeFile = path.join(themesDir, `${themeName}.css`);
            const themeContent = fs.readFileSync(themeFile, 'utf8');
            return /--[a-zA-Z-]+\s*:/.test(themeContent);
        });

        it('should contain all required CSS variables in each theme file', () =>
        {
            const themesDir = path.join(process.cwd(), 'css', 'themes');

            themeFilesWithVariables.forEach(themeName =>
            {
                const themeFile = path.join(themesDir, `${themeName}.css`);
                const themeContent = fs.readFileSync(themeFile, 'utf8');

                requiredVariables.forEach(variable =>
                {
                    const variablePattern = new RegExp(`${variable.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\s*:`);
                    assert.match(themeContent, variablePattern,
                        `Theme '${themeName}' should define CSS variable '${variable}'`);
                });
            });
        });

        it('should define CSS variables with valid values (not empty)', () =>
        {
            const themesDir = path.join(process.cwd(), 'css', 'themes');

            themeFilesWithVariables.forEach(themeName =>
            {
                const themeFile = path.join(themesDir, `${themeName}.css`);
                const themeContent = fs.readFileSync(themeFile, 'utf8');

                requiredVariables.forEach(variable =>
                {
                    const variablePattern = new RegExp(`${variable.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\s*:\\s*([^;]+);`);
                    const match = themeContent.match(variablePattern);
                    assert.ok(match, `Theme '${themeName}' should define CSS variable '${variable}'`);
                    
                    const value = match[1].trim();
                    assert.ok(value.length > 0,
                        `Theme '${themeName}' variable '${variable}' should have a non-empty value, got: '${value}'`);

                });
            });
        });
    });

    after(() =>
    {
        global.$ = $_backup;
        window.matchMedia.restore();
    });
});
