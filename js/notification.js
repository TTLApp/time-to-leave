'use strict';

const notifier = require('node-notifier');
const path = require('path');

const title = 'Time to Leave';

function notify(msg) 
{
    const appPath = process.env.NODE_ENV === 'production'
        ? `${process.resourcesPath}/app`
        : path.join(__dirname, '..');

    return new Promise(resolve => 
    {
        notifier.notify({
            title: title,
            message: msg,
            icon: path.join(appPath, 'assets/timer.png'), // Absolute path (doesn't work on balloons)
            sound: true, // Only Notification Center or Windows Toasters
            wait: true
        });
        resolve(msg);
    });

}


module.exports = {
    notify
};
