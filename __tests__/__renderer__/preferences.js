/* eslint-disable no-undef */
'use strict';

const fs = require('fs');
const path = require('path');
const {
    defaultPreferences,
    getPreferencesFilePath,
    getUserPreferences,
    savePreferences
} = require('../../js/user-preferences');
const { preferencesApi } = require('../../renderer/preload-scripts/preferences-api.js');
const i18n = require('../../src/configs/i18next.config');

/* eslint-disable-next-line no-global-assign */
window.$ = require('jquery');

// APIs from the preload script of the preferences window
window.mainApi = preferencesApi;
// Mocking with the actual access that main would have
window.mainApi.getUserPreferencesPromise = () => { return new Promise((resolve) => resolve(getUserPreferences()));}

const {
    refreshContent,
    populateLanguages,
    listenerLanguage,
    renderPreferencesWindow
} = require('../../src/preferences');

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

function prepareMockup()
{
    const userPreferences = path.join(__dirname, '../../src/preferences.html');
    const content = fs.readFileSync(userPreferences);
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(content, 'text/html');
    document.body.innerHTML = htmlDoc.body.innerHTML;
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
            expect(val).toBe(testPreferences[item]);
        });
    }
    else
    {
        expect($(`#${item}`).val()).toBe(testPreferences[item]);
    }
}

function resetPreferenceFile()
{
    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath)) fs.unlinkSync(preferencesFilePath);
}

const testPreferences = Object.assign({}, defaultPreferences);

describe('Test Preferences Window', () =>
{
    process.env.NODE_ENV = 'test';
    resetPreferenceFile();

    describe('Changing values of items in window', () =>
    {
        beforeEach((async (done) =>
        {
            prepareMockup();
            await refreshContent();
            renderPreferencesWindow();
            populateLanguages(i18n);
            listenerLanguage();
            done();
        }));
        afterEach(() =>
        {
            savePreferences(testPreferences);
        });
        test('Change count-today to true', () =>
        {
            changeItemValue('count-today', true);
            checkRenderedItem('count-today');
        });
        test('Change close-to-tray to false', () =>
        {
            changeItemValue('close-to-tray', false);
            checkRenderedItem('close-to-tray');
        });
        test('Change minimize-to-tray to false', () =>
        {
            changeItemValue('minimize-to-tray', false);
            checkRenderedItem('minimize-to-tray');
        });
        test('Change hide-non-working-days to true', () =>
        {
            changeItemInputValue('hide-non-working-days', true);
            checkRenderedItem('hide-non-working-days', isCheckBox);
        });
        test('Change hours-per-day from 08:00 to 05:00', () =>
        {
            changeItemValue('hours-per-day', '05:00');
            checkRenderedItem('hours-per-day');
        });
        test('Change repetition to false', () =>
        {
            changeItemInputValue('repetition', false);
            checkRenderedItem('repetition', isCheckBox);
        });
        test('Change notification to false', () =>
        {
            changeItemInputValue('notification', false);
            checkRenderedItem('notification', isCheckBox);
        });
        test('Re-change notification to true and expect repetition to stay false - changed above', () =>
        {
            changeItemInputValue('notification', true);
            checkRenderedItem('notification', isCheckBox);
            checkRenderedItem('repetition', isCheckBox);
        });
        test('Change notifications-interval to 10', () =>
        {
            changeItemValue('notifications-interval', '10');
            checkRenderedItem('notifications-interval');
        });
        test('Change start-at-login to true', () =>
        {
            changeItemInputValue('start-at-login', true);
            checkRenderedItem('start-at-login', isCheckBox);
        });
        test('Changing theme from system-default to light', () =>
        {
            changeItemValue('theme', 'light');
            checkRenderedItem('theme');
        });
        test('Change overall-balance-start-date to 2020-01-01', () =>
        {
            changeItemValue('overall-balance-start-date', '2020-01-01');
            checkRenderedItem('overall-balance-start-date');
        });
        test('Negates all default working-days values', () =>
        {
            weekdays.forEach(value =>
            {
                changeItemInputValue(
                    `working-days-${value}`,
                    !defaultPreferences[`working-days-${value}`]
                );
                checkRenderedItem(`working-days-${value}`, isCheckBox);
            });
        });
        test('Changing view option from month to day', () =>
        {
            changeItemValue('view', 'day');
            checkRenderedItem('view');
        });
    });
});

