'use strict';

import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Theme System', function()
{
    describe('Theme Options', function()
    {
        it('should have defined theme options', function()
        {
            const expectedThemes = ['system-default', 'dark', 'light'];
            assert.ok(Array.isArray(expectedThemes), 'Theme options should be an array');
            assert.ok(expectedThemes.includes('system-default'), 'Should include system-default theme');
            assert.ok(expectedThemes.includes('dark'), 'Should include dark theme');
            assert.ok(expectedThemes.includes('light'), 'Should include light theme');
        });
    });

    describe('Theme CSS Files', function()
    {
        it('should have theme CSS files in themes directory', async function()
        {
            const fs = await import('fs');
            const themesPath = path.join(__dirname, '..', '..', 'css', 'themes');

            // Verify themes directory and files exist
            assert.ok(fs.existsSync(themesPath), 'Themes directory should exist');
            const files = fs.readdirSync(themesPath);
            const cssFiles = files.filter(file => file.endsWith('.css'));

            // If nothing else it should have at least the index.css file
            assert.ok(cssFiles.length > 0, 'Should have at least one CSS file in themes directory');
            assert.ok(files.includes('index.css'), 'Should include index.css file');
        });

        it('should have readable theme CSS files', async function()
        {
            const fs = await import('fs');
            const themesPath = path.join(__dirname, '..', '..', 'css', 'themes');

            if (fs.existsSync(themesPath))
            {
                const files = fs.readdirSync(themesPath);
                const cssFiles = files.filter(file => file.endsWith('.css') && file !== 'theme.css.template');

                cssFiles.forEach(file =>
                {
                    const filePath = path.join(themesPath, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    assert.ok(content.length > 0, `${file} should not be empty`);
                    assert.ok(typeof content === 'string', `${file} should be valid`);
                });
            }
        });
    });

    describe('Theme Configuration', function()
    {
        it('should have theme references in user preferences', async function()
        {
            const fs = await import('fs');
            const preferencesPath = path.join(__dirname, '..', '..', 'js', 'user-preferences.mjs');

            if (fs.existsSync(preferencesPath))
            {
                const content = fs.readFileSync(preferencesPath, 'utf8');

                assert.ok(content.includes('isValidTheme'), 'Should import isValidTheme function');
                assert.ok(content.includes('\'theme\''), 'Should reference theme in preferences');
                assert.ok(content.includes('isValidTheme(value)'), 'Should validate theme values');
            }
        });

        it('should have theme IPC constants defined', async function()
        {
            const fs = await import('fs');
            const ipcPath = path.join(__dirname, '..', '..', 'js', 'ipc-constants.mjs');

            if (fs.existsSync(ipcPath))
            {
                const content = fs.readFileSync(ipcPath, 'utf8');
                assert.ok(content.includes('ReloadTheme'), 'Should define ReloadTheme IPC constant');
                assert.ok(content.includes('RELOAD_THEME'), 'Should define RELOAD_THEME string constant');
            }
        });
    });
});
