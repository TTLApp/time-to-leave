'use strict';

const { ipcRenderer } = require('electron');
const {
    subtractTime,
    validateTime,
    hourToMinutes
} = require('./js/time-math.js');
const { notify } = require('./js/notification.js');
const { getUserPreferences } = require('./js/user-preferences.js');
const { applyTheme } = require('./js/themes.js');
const { CalendarFactory } = require('./js/classes/CalendarFactory.js');
const i18n = require('./src/configs/i18next.config.js');

// Global values for calendar
let preferences = getUserPreferences();
let calendar = null;

const lang = preferences['language'];
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
 * Get nofified when preferences has been updated.
 */
ipcRenderer.on('PREFERENCE_SAVED', function(event, prefs)
{
    preferences = prefs;
    calendar = CalendarFactory.getInstance(prefs, calendar);
    applyTheme(prefs.theme);
});

/*
 * Get nofified when waivers get updated.
 */
ipcRenderer.on('WAIVER_SAVED', function()
{
    calendar.loadInternalWaiveStore();
    calendar.redraw();
});

/*
 * Returns true if the notification is enabled in preferences.
 */
function notificationIsEnabled()
{
    return preferences['notification'];
}

/*
 * Notify user if it's time to leave
 */
function notifyTimeToLeave()
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
        const notificationInterval = preferences['notifications-interval'];
        let now = new Date();
        let curTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        // Let check if it's past the time to leave, and the minutes line up with the interval to check
        let minutesDiff = hourToMinutes(subtractTime(timeToLeave, curTime));
        let isRepeatingInterval = curTime > timeToLeave && (minutesDiff % notificationInterval === 0);

        if (curTime === timeToLeave || (isRepeatingInterval && preferences['repetition']))
        {
            notify('Hey there! I think it\'s time to leave.');
        }
    }
}

// On page load, create the calendar and setup notification
$(() =>
{
    // Wait until translation is complete
    i18n.changeLanguage(preferences['language'])
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
