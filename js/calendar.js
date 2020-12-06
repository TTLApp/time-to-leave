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
    repetitionIsEnabled,
    savePreferences
} = require('./js/user-preferences.js');
const { applyTheme } = require('./js/themes.js');
const { CalendarFactory } = require('./js/classes/CalendarFactory.js');
const i18n = require('./src/configs/i18next.config.js');

// Global values for calendar
let calendar = null;

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

    let timeToLeave = $('#leave-by').val();
    if (validateTime(timeToLeave))
    {
        /**
         * How many minutes should pass before the Time-To-Leave notification should be presented again.
         * @type {number} Minutes post the clockout time
         */
        const notificationInterval = getNotificationsInterval();
        let now = new Date();
        let curTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        let today = now.toISOString().slice(0,10).replace(/-/g,'');

        let preferences = getUserPreferences();
        const dismissForToday = preferences['dismiss-for-today'] === today;

        // Let check if it's past the time to leave, and the minutes line up with the interval to check
        let minutesDiff = hourToMinutes(subtractTime(timeToLeave, curTime));
        let isRepeatingInterval = curTime > timeToLeave && (minutesDiff % notificationInterval === 0);

        if (!dismissForToday && (curTime === timeToLeave || (isRepeatingInterval && repetitionIsEnabled())))
        {
            let tDismiss = i18n.t('$Notification.dismiss-for-today');
            const res = await notify(i18n.t('$Notification.time-to-leave'), [tDismiss]);
            if (res.toLowerCase() === tDismiss.toLowerCase())
            { // notify resolves action in lowercase
                preferences['dismiss-for-today'] = today;
                savePreferences(preferences);
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
            let preferences = getUserPreferences();
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
