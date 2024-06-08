'use strict';

import { CalendarFactory } from '../renderer/classes/CalendarFactory.js';
import { applyTheme } from '../renderer/themes.js';
import { searchLeaveByElement } from '../renderer/notification-channel.js';

// Global values for calendar
let calendar = undefined;

function setupCalendar(preferences)
{
    window.mainApi.getLanguageDataPromise().then(async languageData =>
    {
        calendar = await CalendarFactory.getInstance(preferences, languageData, calendar);
        applyTheme(preferences.theme);
    });
}

/*
 * Reload the calendar upon request from main
 */
window.mainApi.handleCalendarReload(async() =>
{
    await calendar.reload();
});

/*
 * Update the calendar after a day has passed
 */
window.mainApi.handleRefreshOnDayChange((event, oldDate, oldMonth, oldYear) =>
{
    calendar.refreshOnDayChange(oldDate, oldMonth, oldYear);
});

/*
 * Get notified when preferences has been updated.
 */
window.mainApi.handlePreferencesSaved((event, prefs) =>
{
    setupCalendar(prefs);
});

/*
 * Get notified when waivers get updated.
 */
window.mainApi.handleWaiverSaved(async() =>
{
    await calendar.loadInternalWaiveStore();
    calendar.redraw();
});

/*
 * Punch the date and time as requested by user.
 */
window.mainApi.handlePunchDate(() =>
{
    calendar.punchDate();
});

/*
 * Reload calendar, used after database altering actions.
 */
window.mainApi.handleReloadCalendar(() =>
{
    calendar.reload();
});

/*
 * Returns value of "leave by" for notifications.
 */
window.mainApi.handleLeaveBy(searchLeaveByElement);

// On page load, create the calendar and setup notification
$(async() =>
{
    const preferences = await window.mainApi.getUserPreferencesPromise();
    setupCalendar(preferences);
});

document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('toggle');
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'light');
            // Optionally save user preference for theme here, e.g., to local storage
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            // Optionally save user preference for theme here, e.g., to local storage
        }
    });

    // Optionally load and apply user preference for theme on page load
    const currentTheme = localStorage.getItem('theme') || 'light'; // Assuming 'light' as default
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'dark';
});



