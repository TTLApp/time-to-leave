'use strict';

const path = require('path');
const { app } = require('electron');
const ElectronNotification = require('electron').Notification;

const {
    subtractTime,
    validateTime,
    hourToMinutes
} = require('./time-math.js');
const {
    getNotificationsInterval,
    notificationIsEnabled,
    repetitionIsEnabled
} = require('./user-preferences.js');
const { getDateStr } = require('./date-aux.js');
const { getCurrentTranslation } = require('../src/configs/i18next.config.js');

let dismissToday = null;

function createNotification(msg, actions = [])
{
    const appPath = process.env.NODE_ENV === 'production'
        ? `${process.resourcesPath}/app`
        : path.join(__dirname, '..');
    let notification;
    if (process.platform === 'win32')
    {
        // TODO Change to the toastXml to allow buttons when Electron version is at least 12.0.0
        // https://github.com/electron/electron/pull/25401 was released on
        // https://github.com/electron/electron/releases/tag/v12.0.0
        // Actions are not supported on electron windows notifications in current version
        // XML specification: https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml
        /*
        notification = new ElectronNotification({ toastXml: `
            <toast  launch="time-to-leave" activationType="protocol">
            <visual>
            <binding template="ToastGeneric">
            <image placement="AppLogoOverride" hint-crop="circle"  src="http://timetoleave.app/ttl.36a76c7b.svg"/>
            <text>This is the first text</text>
            <text>this is the second text</text>
            </binding>
            </visual>
            <actions>
                ${actions.map(action => `<action content="${action.title}" arguments="${action.action}" activationType="background" />`)}
             </actions>
                </toast>`
        });
        */
        notification = new ElectronNotification({
            title: 'Time to Leave',
            body: msg,
            icon: path.join(appPath, 'assets/ttl.png'),
            sound: true
        });
    }
    else
    {
        notification = new ElectronNotification({
            title: 'Time to Leave',
            body: msg,
            icon: path.join(appPath, 'assets/ttl.png'),
            sound: true,
            actions
        });

    }
    notification.addListener('click', () =>
    {
        app.emit('activate');
    });
    return notification;
}

/*
 * Notify user if it's time to leave
 */
function createLeaveNotification(timeToLeave)
{
    const now = new Date();
    const dateToday = getDateStr(now);
    const skipNotify = dismissToday === dateToday;

    if (!notificationIsEnabled() || !timeToLeave || skipNotify)
    {
        return false;
    }

    if (validateTime(timeToLeave))
    {
        /**
         * How many minutes should pass before the Time-To-Leave notification should be presented again.
         * @type {number} Minutes post the clockout time
         */
        const notificationInterval = getNotificationsInterval();
        const curTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        // Let check if it's past the time to leave, and the minutes line up with the interval to check
        const minutesDiff = hourToMinutes(subtractTime(timeToLeave, curTime));
        const isRepeatingInterval = curTime > timeToLeave && (minutesDiff % notificationInterval === 0);
        if (curTime === timeToLeave || (isRepeatingInterval && repetitionIsEnabled()))
        {

            const dismissBtn = {type: 'button', text: getCurrentTranslation('$Notification.dismiss-for-today'), action: 'dismiss', title: 'dismiss'};
            return createNotification(getCurrentTranslation('$Notification.time-to-leave'), [dismissBtn])
                .addListener('action', (response) =>
                {
                    // Actions are only supported on macOS
                    if ( response && dismissBtn.title.toLowerCase() === response.toLowerCase())
                    {
                        dismissToday = dateToday;
                    }
                }).addListener('close', () =>
                {
                    // We'll assume that if someone closes the notification they're
                    // dismissing the notifications
                    dismissToday = dateToday;
                });
        }
    }
    return false;
}

/**
 * Test related function to force a dismiss value
 * @param {String} dismiss Dismiss value in HH:MM format
 */
function updateDismiss(dismiss)
{
    dismissToday = dismiss;
}

/**
 * Test related function to get the dismiss value
 */
function getDismiss()
{
    return dismissToday;
}

module.exports = {
    createNotification,
    getDismiss,
    createLeaveNotification,
    updateDismiss,
};
