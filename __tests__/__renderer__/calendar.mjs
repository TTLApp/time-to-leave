'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';
import { JSDOM } from 'jsdom';
import path from 'path';

import { rootDir } from '../../js/app-config.mjs';
import { getDefaultPreferences } from '../../js/user-preferences.mjs';

async function prepareMockup()
{
    const calendar = path.join(rootDir, '/src/calendar.html');
    const htmlDoc = await JSDOM.fromFile(calendar, 'text/html');
    window.document.documentElement.innerHTML = htmlDoc.window.document.documentElement.innerHTML;
}

const testPreferences = structuredClone(getDefaultPreferences());

describe('Test Calendar Window', () =>
{
    let handleToggleMainWindowWaitCallback = undefined;
    before(async() =>
    {
        // Mocking APIs
        window.rendererApi = {
            getLanguageDataPromise: () =>
            {
                return new Promise((resolve) => resolve({
                    'language': 'en',
                    'data': {}
                }));
            },
            getOriginalUserPreferences: () => { return testPreferences; },
            notifyWindowReadyToShow: () => {}
        };

        window.calendarApi = {
            handleToggleMainWindowWait: (callback) => { handleToggleMainWindowWaitCallback = callback; },
            handleCalendarReload: () => {},
            handleRefreshOnDayChange: () => {},
            handlePreferencesSaved: () => {},
            handleWaiverSaved: () => {},
            handlePunchDate: () => {},
            handleThemeChange: () => {},
            handleLeaveBy: () => {}
        };

        // Using dynamic imports because when the file is imported a $() callback is triggered and
        // methods must be mocked before-hand
        await import('../../src/calendar.js');
    });

    beforeEach(async function()
    {
        await prepareMockup();
    });

    describe('Toggle wait mode', () =>
    {
        it('Starts without wait class', () =>
        {
            assert.notStrictEqual(handleToggleMainWindowWaitCallback, undefined, 'Callback was set');
            const hasClass = $('html').hasClass('wait');
            assert.strictEqual(hasClass, false, 'Starts without wait class');
        });

        it('Toggling wait state for the window', () =>
        {
            assert.notStrictEqual(handleToggleMainWindowWaitCallback, undefined, 'Callback was set');

            handleToggleMainWindowWaitCallback(undefined, true);
            let hasClass = $('html').hasClass('wait');
            assert.strictEqual(hasClass, true, 'Now has wait class');

            handleToggleMainWindowWaitCallback(undefined, false);
            hasClass = $('html').hasClass('wait');
            assert.strictEqual(hasClass, false, 'Back to not having wait class');
        });
    });
});
