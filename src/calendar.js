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
