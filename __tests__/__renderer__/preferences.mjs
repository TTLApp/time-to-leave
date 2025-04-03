'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import { stub } from 'sinon';
import path from 'path';

import { rootDir } from '../../js/app-config.mjs';
import {
    getDefaultPreferences,
    getPreferencesFilePath,
    savePreferences,
} from '../../js/user-preferences.mjs';
import { preferencesApi } from '../../renderer/preload-scripts/preferences-api.mjs';
import i18nTranslator from '../../renderer/i18n-translator.js';

const isCheckBox = true;
const weekdays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
];

let windowReady = false;
async function waitUntilWindowReady()
{
    while (!windowReady)
    {
        await new Promise(r => setTimeout(r, 100));
    }
}

async function prepareMockup()
{
    const userPreferences = path.join(rootDir, '/src/preferences.html');
    const htmlDoc = await JSDOM.fromFile(userPreferences, 'text/html');
    window.document.documentElement.innerHTML = htmlDoc.window.document.documentElement.innerHTML;
    // The script on the preferences page only gets loaded once. We wait here until it is loaded so the page is ready for interactions
    await waitUntilWindowReady();
}

function changeItemValue(item, value)
{
    testPreferences[item] = value;
    $(`#${item}`)
        .val(testPreferences[item])
        .trigger('change');
}

function changeItemInputValue(item, value)
{
    testPreferences[item] = value;

    $(`input[name*='${item}']`)
        .prop('checked', testPreferences[item])
        .trigger('change');
}

function checkRenderedItem(item, isCheckbox = false)
{
    if (isCheckbox)
    {
        $(`input[name*='${item}']`).prop('checked', (i, val) =>
        {
            assert.strictEqual(val, testPreferences[item]);
        });
    }
    else
    {
        assert.strictEqual($(`#${item}`).val(), testPreferences[item]);
    }
}

function resetPreferenceFile()
{
    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath))
    {
        fs.unlinkSync(preferencesFilePath);
    }
}

const testPreferences = Object.assign({}, getDefaultPreferences());

// Functions from preferences.js that will be imported dynamically
let convertTimeFormat;
let listenerLanguage;
let populateLanguages;
let renderPreferencesWindow;
let setupListeners;
let resetContent;

describe('Test Preferences Window', () =>
{
    before(async() =>
    {
        stub(i18nTranslator, 'getTranslationInLanguageData').returnsThis();

        // APIs from the preload script of the preferences window
        window.preferencesApi = preferencesApi;

        // Mocking with the actual value
        window.rendererApi = {
            getLanguageDataPromise: () =>
            {
                return new Promise((resolve) => resolve({
                    'language': 'en',
                    'data': {}
                }));
            },
            getOriginalUserPreferences: () => { return testPreferences; },
            notifyWindowReadyToShow: () => { windowReady = true; },
            showDialog: () => { return new Promise((resolve) => resolve({ response: 0 })); },
        };

        // Stub methods
        window.preferencesApi.notifyNewPreferences = () => {};

        resetPreferenceFile();

        // Using dynamic imports because when the file is imported a $() callback is triggered and
        // methods must be mocked before-hand
        const file = await import('../../src/preferences.js');
        convertTimeFormat = file.convertTimeFormat;
        listenerLanguage = file.listenerLanguage;
        populateLanguages = file.populateLanguages;
        renderPreferencesWindow = file.renderPreferencesWindow;
        setupListeners = file.setupListeners;
        resetContent = file.resetContent;
    });

    describe('Changing values of items in window', () =>
    {
        beforeEach(async function()
        {
            await prepareMockup();
            renderPreferencesWindow();
            populateLanguages();
            listenerLanguage();
        });

        afterEach(() =>
        {
            savePreferences(testPreferences);
        });

        it('Change count-today to true', () =>
        {
            changeItemValue('count-today', true);
            checkRenderedItem('count-today');
        });

        it('Change close-to-tray to false', () =>
        {
            changeItemValue('close-to-tray', false);
            checkRenderedItem('close-to-tray');
        });

        it('Change minimize-to-tray to false', () =>
        {
            changeItemValue('minimize-to-tray', false);
            checkRenderedItem('minimize-to-tray');
        });

        it('Change hide-non-working-days to true', () =>
        {
            changeItemInputValue('hide-non-working-days', true);
            checkRenderedItem('hide-non-working-days', isCheckBox);
        });

        it('Change hours-per-day from 08:00 to 05:00', () =>
        {
            changeItemValue('hours-per-day', '05:00');
            checkRenderedItem('hours-per-day');
        });

        it('Change repetition to false', () =>
        {
            changeItemInputValue('repetition', false);
            checkRenderedItem('repetition', isCheckBox);
        });

        it('Change notification to false', () =>
        {
            changeItemInputValue('notification', false);
            checkRenderedItem('notification', isCheckBox);
        });

        it('Re-change notification to true and expect repetition to stay false - changed above', () =>
        {
            changeItemInputValue('notification', true);
            checkRenderedItem('notification', isCheckBox);
            checkRenderedItem('repetition', isCheckBox);
        });

        it('Change notifications-interval to 10', () =>
        {
            changeItemValue('notifications-interval', '10');
            checkRenderedItem('notifications-interval');
        });

        it('Change start-at-login to true', () =>
        {
            changeItemInputValue('start-at-login', true);
            checkRenderedItem('start-at-login', isCheckBox);
        });

        it('Changing theme from system-default to light', () =>
        {
            changeItemValue('theme', 'light');
            checkRenderedItem('theme');
        });

        it('Change overall-balance-start-date to 2020-01-01', () =>
        {
            changeItemValue('overall-balance-start-date', '2020-01-01');
            checkRenderedItem('overall-balance-start-date');
        });

        it('Negates all default working-days values', () =>
        {
            weekdays.forEach(value =>
            {
                changeItemInputValue(
                    `working-days-${value}`,
                    !getDefaultPreferences()[`working-days-${value}`]
                );
                checkRenderedItem(`working-days-${value}`, isCheckBox);
            });
        });

        it('Changing view option from month to day', () =>
        {
            changeItemValue('view', 'day');
            checkRenderedItem('view');
        });

        it('Languages are rendered in alphabetical order', () =>
        {
            let lastValue = '';
            $('#language option').map(function()
            {
                if (lastValue === '') lastValue = this.value;
                else
                {
                    assert.strictEqual(lastValue.localeCompare(this.value) < 0, true);
                    lastValue = this.value;
                }
            });
            assert.notStrictEqual(lastValue, '');
        });
    });

    describe('Check if configure hours per day conversion function', () =>
    {
        it('should convert single digit hour to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('6'), '06:00');
        });

        it('should convert double digit hour to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('12'), '12:00');
        });

        it('should convert H.M format to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('6.5'), '06:30');
        });

        it('should convert H.MM format to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('6.50'), '06:30');
        });

        it('should convert HH.M format to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('12.5'), '12:30');
        });

        it('should convert HH.MM format to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('12.50'), '12:30');
        });

        it('should convert H:MM format to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('6:30'), '06:30');
        });

        it('should convert HH:MM format to HH:MM format', () =>
        {
            assert.strictEqual(convertTimeFormat('12:30'), '12:30');
        });
    });

    describe('Checking reset logic', () =>
    {
        beforeEach(async function()
        {
            await prepareMockup();
            resetContent();
            populateLanguages();
            listenerLanguage();
        });

        it('Check reset function restores setting', () =>
        {
            changeItemInputValue('count-today', true);
            checkRenderedItem('count-today', isCheckBox);
            resetContent();
            $('input[name*=\'count-today\']').prop('checked', (i, val) =>
            {
                assert.strictEqual(val, false);
            });
        });

        it('Click reset and check that reset function is being called', (done) =>
        {
            changeItemInputValue('count-today', true);
            checkRenderedItem('count-today', isCheckBox);
            // For some reason listeners are not set-up when we get to this point
            // despite them being called at the beginning of the test
            setupListeners();
            $('#reset-button').trigger('click');
            // Need to briefly timeout so the click actions can propagate
            setTimeout(() =>
            {
                $('input[name*=\'count-today\']').prop('checked', (i, val) =>
                {
                    assert.strictEqual(val, false);
                });
                done();
            }, 1);
        });
    });

    after(() =>
    {
        i18nTranslator.getTranslationInLanguageData.restore();
    });
});
