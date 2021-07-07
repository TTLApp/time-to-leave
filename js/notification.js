'use strict';

const notifier = require('node-notifier');
const path = require('path');

const title = 'Time to Leave';

function notify(msg, actions)
{
    const appPath = process.env.NODE_ENV === 'production'
        ? `${process.resourcesPath}/app`
        : path.join(__dirname, '..');

    return new Promise((resolve, reject) =>
    {
        notifier.notify({
            title: title,
            message: msg,
            icon: path.join(appPath, 'assets/timer.png'), // Absolute path (doesn't work on balloons)
            sound: true, // Only Notification Center or Windows Toasters
            wait: true,
            actions: actions,
        }, (error, action) =>
        {
            if (error) reject(error);
            else resolve(action);
        });
    });

}


module.exports = {
    notify
};
