'use strict';

const { app, net, shell, dialog, BrowserWindow } = require('electron');
const { getDateStr } = require('./date-aux.js');
const isOnline = require('is-online');
const Store = require('electron-store');

function shouldCheckForUpdates()
{
    const store = new Store();
    let lastChecked = store.get('update-remind-me-after');
    let today = new Date(),
        todayDate = getDateStr(today);
    return !lastChecked || todayDate > lastChecked;
}

async function checkForUpdates(showUpToDateDialog)
{
    let online = await isOnline();
    if (!online)
    {
        return;
    }

    const request = net.request('https://api.github.com/repos/thamara/time-to-leave/releases/latest');
    request.on('response', (response) =>
    {
        response.on('data', (chunk) =>
        {
            let result = `${chunk}`;
            let re = new RegExp('.*(tag_name).*', 'g');
            let matches = result.matchAll(re);
            for (const match of matches)
            {
                let res = match[0].replace(/.*v.(\d+\.\d+\.\d+).*/g, '$1');
                if (app.getVersion() < res)
                {
                    const options = {
                        type: 'question',
                        buttons: ['Dismiss', 'Download latest version', 'Remind me later'],
                        defaultId: 1,
                        title: 'TTL Check for updates',
                        message: 'You are using an old version of TTL and is missing out on a lot of new cool things!',
                    };
                    let response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                    if (response === 1)
                    {
                        //Download latest version
                        shell.openExternal('https://github.com/thamara/time-to-leave/releases/latest');
                    }
                    else if (response === 2)
                    {
                        const store = new Store();
                        // Remind me later
                        let today = new Date(),
                            todayDate = getDateStr(today);
                        store.set('update-remind-me-after', todayDate);
                    }
                }
                else if (showUpToDateDialog)
                {
                    const options = {
                        type: 'info',
                        buttons: ['OK'],
                        title: 'TTL Check for updates',
                        message: 'Your TTL is up to date.'
                    };
                    dialog.showMessageBox(null, options);
                }
            }
        });
    });
    request.end();
}

module.exports = {
    checkForUpdates,
    shouldCheckForUpdates
};