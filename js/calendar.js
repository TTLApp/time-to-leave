'use strict';

const { ipcRenderer } = require('electron');
const {
    subtractTime,
    validateTime,
    hourToMinutes
} = require('./js/time-math.js');
const { notify } = require('./js/notification.js');
const {
    getUserPreferences,
    getUserLanguage,
    getNotificationsInterval,
    notificationIsEnabled,
    repetitionIsEnabled
} = require('./js/user-preferences.js');
const { applyTheme } = require('./js/themes.js');
const { CalendarFactory } = require('./js/classes/CalendarFactory.js');
const { getDateStr } = require('./js/date-aux.js');
const i18n = require('./src/configs/i18next.config.js');

// Global values for calendar
let calendar = null;
let dismissToday = null;

const lang = getUserLanguage();
// Need to force load of translations
ipcRenderer.sendSync('GET_INITIAL_TRANSLATIONS', lang);

ipcRenderer.on('LANGUAGE_CHANGED', (event, message) =>
{
    if (!i18n.hasResourceBundle(message.language, message.namespace))
    {
        i18n.addResourceBundle(
            message.language,
            message.namespace,
            message.resource
        );
    }
    i18n.changeLanguage(message.language);
});

/*
 * Get notified when preferences has been updated.
 */
ipcRenderer.on('PREFERENCE_SAVED', function(event, prefs)
{
    calendar = CalendarFactory.getInstance(prefs, calendar);
    applyTheme(prefs.theme);
}
);

/*
 * Get notified when waivers get updated.
 */
ipcRenderer.on('WAIVER_SAVED', function()
{
    calendar.loadInternalWaiveStore();
    calendar.redraw();
});

/*
 * Notify user if it's time to leave
 */
async function notifyTimeToLeave()
{
    if (!notificationIsEnabled() || $('#leave-by').length === 0)
    {
        return;
    }

    const timeToLeave = $('#leave-by').val();
    if (validateTime(timeToLeave))
    {
        /**
         * How many minutes should pass before the Time-To-Leave notification should be presented again.
         * @type {number} Minutes post the clockout time
         */
        const notificationInterval = getNotificationsInterval();
        const now = new Date();
        const curTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        // Let check if it's past the time to leave, and the minutes line up with the interval to check
        const minutesDiff = hourToMinutes(subtractTime(timeToLeave, curTime));
        const isRepeatingInterval = curTime > timeToLeave && (minutesDiff % notificationInterval === 0);

        const dateToday = getDateStr(now);
        const skipNotify = dismissToday === dateToday;
        if (skipNotify)
        {
            return;
        }

        if (curTime === timeToLeave || (isRepeatingInterval && repetitionIsEnabled()))
        {
            try
            {
                const dismissBtn = i18n.t('$Notification.dismiss-for-today');
                const actionBtn = await notify(i18n.t('$Notification.time-to-leave'), [dismissBtn]);
                if (dismissBtn.toLowerCase() !== actionBtn.toLowerCase())
                {
                    return;
                }
                dismissToday = dateToday;
            }
            catch (err)
            {
                console.error(err);
            }
        }
    }
}

// On page load, create the calendar and setup notification
$(() =>
{
    // Wait until translation is complete
    i18n.changeLanguage(lang)
        .then(() =>
        {
            const preferences = getUserPreferences();
            calendar = CalendarFactory.getInstance(preferences);
            setInterval(notifyTimeToLeave, 60000);
            applyTheme(preferences.theme);

            $('#punch-button').on('click', () => { calendar.punchDate(); });
        })
        .catch(err =>
        {
            console.log('Error when changing language: ' + err);
        });
});
