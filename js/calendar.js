'use strict';

const { ipcRenderer } = require('electron');

import { getUserPreferences } from './user-preferences.js';
import { CalendarFactory } from './classes/CalendarFactory.js';
import { applyTheme } from '../renderer/themes.js';

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

/*
 * Punch the date and time as requested by user.
 */
ipcRenderer.on('PUNCH_DATE', function()
{
    calendar.punchDate();
});

/*
 * Reload calendar, used after database altering actions.
 */
ipcRenderer.on('RELOAD_CALENDAR', function()
{
    calendar.reload();
});

// On page load, create the calendar and setup notification
$(() =>
{
    const preferences = getUserPreferences();
    setupCalendar(preferences);
});
