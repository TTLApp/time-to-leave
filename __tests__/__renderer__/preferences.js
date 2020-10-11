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

/* eslint-disable-next-line no-global-assign */
window.$ = require('jquery');
require('../../src/preferences');

function prepareMockup()
{
    const userPreferences = path.join(__dirname, '../../src/preferences.html');
    const content = fs.readFileSync(userPreferences);
    let parser = new DOMParser();
    let htmlDoc = parser.parseFromString(content, 'text/html');
    document.body.innerHTML = htmlDoc.body.innerHTML;
}

describe('Test Preferences Window', function()
{
    process.env.NODE_ENV = 'test';

    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath)) fs.unlinkSync(preferencesFilePath);

    let testPreferences = defaultPreferences;
    testPreferences['number-of-entries'] = 'flexible';


    describe('Changing value of number-of-entries', function()
    {
        test('Changing number-of-entries to flexible', () =>
        {
            prepareMockup();

            $('#number-of-entries').val(testPreferences['number-of-entries']);
            savePreferences(testPreferences);
            let new_preferences = getUserPreferences();

            expect($('#number-of-entries').val()).toBe(
                new_preferences['number-of-entries']
            );
        });
    });
});
