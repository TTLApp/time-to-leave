'use strict';

import { app, ipcMain } from 'electron';

import { appConfig } from './js/app-config.mjs';
import { createWindow, createMenu, getMainWindow, triggerStartupDialogs } from './js/main-window.mjs';
import Notification from './js/notification.mjs';
import { handleSquirrelEvent } from './js/squirrel.mjs';
import Windows from './js/windows.mjs';
import { setupCalendarStore } from './main/calendar-aux.mjs';
import { setupWorkdayWaiverHandlers } from './main/workday-waiver-aux.mjs';
import i18NextConfig from './src/configs/i18next.config.mjs';

// Allow require()
import { createRequire } from 'module';
import IpcConstants from './js/ipc-constants.mjs';
const require = createRequire(import.meta.url);

const WindowAux = require('./js/window-aux.cjs');

if (appConfig.win32)
{
    if (handleSquirrelEvent(app))
    {
        // squirrel event handled and app will exit in 1000ms, so don't do anything else
        app.quit();
    }
}

setupWorkdayWaiverHandlers();

ipcMain.on(IpcConstants.SetWaiverDay, (event, waiverDay) =>
{
    global.waiverDay = waiverDay;
    const mainWindow = getMainWindow();
    Windows.openWaiverManagerWindow(mainWindow);
});

ipcMain.handle(IpcConstants.GetWaiverDay, () =>
{
    return global.waiverDay;
});

ipcMain.on(IpcConstants.ShowDialogSync, (event, dialogOptions) =>
{
    WindowAux.showDialogSync(dialogOptions);
});

ipcMain.handle(IpcConstants.ShowDialog, (event, dialogOptions) =>
{
    return WindowAux.showDialog(dialogOptions);
});

let launchDate = new Date();

// Logic for recommending user to punch in when they've been idle for too long
let recommendPunchIn = false;
setTimeout(() => { recommendPunchIn = true; }, 30 * 60 * 1000);

process.on('uncaughtException', function(err)
{
    if (!err.message.includes('net::ERR_NETWORK_CHANGED'))
    {
        console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
});

function checkIdleAndNotify()
{
    if (recommendPunchIn)
    {
        recommendPunchIn = false;
        Notification.createNotification(i18NextConfig.getCurrentTranslation('$Notification.punch-reminder')).show();
    }
}

function refreshOnDayChange()
{
    const mainWindow = getMainWindow();
    if (mainWindow === null)
    {
        return;
    }

    const today = new Date();
    if (today > launchDate)
    {
        const oldDate = launchDate.getDate();
        const oldMonth = launchDate.getMonth();
        const oldYear = launchDate.getFullYear();
        launchDate = today;

        // Reload only the calendar itself to avoid a flash
        mainWindow.webContents.send(IpcConstants.RefreshOnDayChange, oldDate, oldMonth, oldYear);
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// Check first to see if the app is aleady running,
// fail out gracefully if so.
if (!app.requestSingleInstanceLock())
{
    app.exit(0);
}
else
{
    app.on('second-instance', () =>
    {
        // Someone tried to run a second instance, we should focus our window.
        const mainWindow = getMainWindow();
        if (mainWindow)
        {
            if (mainWindow.isMinimized())
            {
                mainWindow.restore();
            }
            mainWindow.focus();
        }
    });
}

app.on('ready', () =>
{
    i18NextConfig.setupI18n(createMenu).then(() =>
    {
        // On other platforms the header is automatically set, but on windows
        // we need to force the name so it doesn't appear as `electron.app.Electron`
        if (process.platform === 'win32')
        {
            app.setAppUserModelId('Time to Leave');
        }
        createWindow();
        createMenu();
        setupCalendarStore();
        i18NextConfig.setLanguageChangedCallback(createMenu);
        triggerStartupDialogs();
        setInterval(refreshOnDayChange, 60 * 60 * 1000);
        const { powerMonitor } = require('electron');
        powerMonitor.on('unlock-screen', () => { checkIdleAndNotify(); });
        powerMonitor.on('resume', () => { checkIdleAndNotify(); });
    });
});

// Emitted before the application starts closing its windows.
// It's not emitted when closing the windows
app.on('before-quit', () =>
{
    app.isQuitting = true;
});

// Quit when all windows are closed.
app.on('window-all-closed', () =>
{
    app.quit();
});

app.on('activate', () =>
{
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    const mainWindow = getMainWindow();
    if (mainWindow === null)
    {
        createWindow();
    }
    else
    {
        mainWindow.show();
    }
});
