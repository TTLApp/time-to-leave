'use strict';

import { CalendarFactory } from '../renderer/classes/CalendarFactory.js';
import { applyTheme } from '../renderer/themes.js';
import { searchLeaveByElement } from '../renderer/notification-channel.js';

// Global values for calendar
let calendar = undefined;

function setupCalendar(preferences)
{
    window.rendererApi.getLanguageDataPromise().then(async languageData =>
    {
        calendar = await CalendarFactory.getInstance(preferences, languageData, calendar);
        applyTheme(preferences.theme);
    });
}

/*
 * Reload the calendar upon request from main
 */
window.calendarApi.handleCalendarReload(async() =>
{
    await calendar.reload();
});

/*
 * Update the calendar after a day has passed
 */
window.calendarApi.handleRefreshOnDayChange((event, oldDate, oldMonth, oldYear) =>
{
    calendar.refreshOnDayChange(oldDate, oldMonth, oldYear);
});

/*
 * Get notified when preferences has been updated.
 */
window.calendarApi.handlePreferencesSaved((event, prefs) =>
{
    setupCalendar(prefs);
});

/*
 * Get notified when waivers get updated.
 */
window.calendarApi.handleWaiverSaved(async() =>
{
    await calendar.loadInternalWaiveStore();
    calendar.redraw();
});

/*
 * Punch the date and time as requested by user.
 */
window.calendarApi.handlePunchDate(() =>
{
    calendar.punchDate();
});

/*
 * Reload theme.
 */
window.calendarApi.handleThemeChange(async(event, theme) =>
{
    applyTheme(theme);
});

/*
 * Returns value of "leave by" for notifications.
 */
window.calendarApi.handleLeaveBy(searchLeaveByElement);

/*
 * Change the cursor on the app to a wait cursor while an operation is happening.
 */
window.calendarApi.handleToggleCursorWait((enable) =>
{
    const waitClass = 'cursor-wait';
    if (enable)
    {
        if (!$('html').hasClass(waitClass))
        {
            $('html').addClass(waitClass);
        }
    }
    else
    {
        $('html').removeClass(waitClass);
    }
});

// On page load, create the calendar and setup notification
$(() =>
{
    const preferences = window.rendererApi.getOriginalUserPreferences();
    requestAnimationFrame(() =>
    {
        setupCalendar(preferences);
        requestAnimationFrame(() =>
        {
            setTimeout(() =>
            {
                window.rendererApi.notifyWindowReadyToShow();
            }, 100);
        });
    });
});
