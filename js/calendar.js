'use strict';

import { applyTheme } from '../renderer/themes.js';

const { ipcRenderer } = require('electron');
const {
    getUserPreferences
} = require('./js/user-preferences.js');
const { CalendarFactory } = require('./js/classes/CalendarFactory.js');

// Global values for calendar
let calendar = undefined;

function setupCalendar(preferences)
{
    ipcRenderer.invoke('GET_LANGUAGE_DATA').then(languageData =>
    {
        calendar = CalendarFactory.getInstance(preferences, languageData, calendar);
        applyTheme(preferences.theme);
    });
}

/*
 * Update the calendar after a day has passed
 */
ipcRenderer.on('REFRESH_ON_DAY_CHANGE', (event, oldDate, oldMonth, oldYear) =>
{
    calendar.refreshOnDayChange(oldDate, oldMonth, oldYear);
});

/*
 * Get notified when preferences has been updated.
 */
ipcRenderer.on('PREFERENCE_SAVED', function(event, prefs)
{
    setupCalendar(prefs);
});

/*
 * Get notified when waivers get updated.
 */
ipcRenderer.on('WAIVER_SAVED', function()
{
    calendar.loadInternalWaiveStore();
    calendar.redraw();
});

// On page load, create the calendar and setup notification
$(() =>
{
    const preferences = getUserPreferences();
    setupCalendar(preferences);
});
