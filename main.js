/*eslint-disable no-useless-escape*/
'use strict';

const { app, ipcMain } = require('electron');
const { createWindow, createMenu, getMainWindow, triggerStartupDialogs } = require('./js/main-window');
const { notify } = require('./js/notification');
const { openWaiverManagerWindow } = require('./js/windows.js');
const { getUserPreferences } = require('./js/user-preferences.js');
const i18n = require('./src/configs/i18next.config');
const { handleSquirrelEvent } = require('./js/squirrel.js');
const { appConfig } = require('./js/app-config');

if (appConfig.win32)
{
    if (handleSquirrelEvent(app))
    {
        // squirrel event handled and app will exit in 1000ms, so don't do anything else
        app.quit();
    }
}

i18n.on('loaded', () =>
{
    const userPreferences = getUserPreferences();
    i18n.changeLanguage(userPreferences.language);
    triggerStartupDialogs();
    i18n.off('loaded');
});

i18n.on('languageChanged', lng =>
{
    createMenu();
    const mainWindow = getMainWindow();
    mainWindow.webContents.send('LANGUAGE_CHANGED', {
        language: lng,
        namespace: 'translation',
        resource: i18n.getResourceBundle(lng, 'translation')
    });
});

ipcMain.on('GET_INITIAL_TRANSLATIONS', (event, language) =>
{
    i18n.loadLanguages(language, () =>
    {
        const initial = {
            arg: {
                translation: i18n.getResourceBundle(language, 'translation')
            }
        };
        event.returnValue = initial;
    });
});

ipcMain.on('SET_WAIVER_DAY', (event, waiverDay) =>
{
    global.waiverDay = waiverDay;
    const mainWindow = getMainWindow();
    openWaiverManagerWindow(mainWindow);
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
        notify(i18n.t('$Notification.punch-reminder'));
    }
}

function refreshOnDayChange()
{
    const mainWindow = getMainWindow();
    if (mainWindow === null)
    {
        return;
    }

    let today = new Date();
    if (today > launchDate)
    {
        let oldDate = launchDate.getDate();
        let oldMonth = launchDate.getMonth();
        let oldYear = launchDate.getFullYear();
        launchDate = today;
        // Reload only the calendar itself to avoid a flash
        mainWindow.webContents.executeJavaScript(`calendar.refreshOnDayChange(${oldDate},${oldMonth},${oldYear})`);
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
    createWindow();
    setInterval(refreshOnDayChange, 60 * 60 * 1000);
    const { powerMonitor } = require('electron');
    powerMonitor.on('unlock-screen', () => { checkIdleAndNotify(); });
    powerMonitor.on('resume', () => { checkIdleAndNotify(); });
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

const env = process.env.NODE_ENV || 'development';
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
if (env === 'development')
{
    try
    {
        require('electron-reloader')(module);
    }
    catch (_)
    {
        // eslint-disable-next-line no-empty
        // We don't need to do anything in this block.
    }
}
