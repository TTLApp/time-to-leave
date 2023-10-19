'use strict';

const { app, BrowserWindow, dialog, ipcMain, Menu, shell, Tray } = require('electron');
const path = require('path');
const Store = require('electron-store');

const { checkForUpdates, shouldCheckForUpdates } = require('./update-manager');
const { migrateFixedDbToFlexible } = require('./import-export.js');
const {
    getContextMenuTemplate,
    getDockMenuTemplate,
    getEditMenuTemplate,
    getHelpMenuTemplate,
    getMainMenuTemplate,
    getViewMenuTemplate
} = require('./menus');
const { getCurrentTranslation } = require('../src/configs/i18next.config');
let { contextMenu, tray } = require('./windows.js');

import { getDefaultWidthHeight, getUserPreferences } from './user-preferences.js';
import { appConfig, getDetails } from './app-config.js';
import { createLeaveNotification } from './notification.js';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;
let leaveByInterval = null;
function getMainWindow()
{
    return mainWindow;
}

function createMenu()
{
    const menu = Menu.buildFromTemplate([
        {
            label: getCurrentTranslation('$Menu.menu'),
            submenu: getMainMenuTemplate(mainWindow)
        },
        {
            label: getCurrentTranslation('$Menu.edit'),
            submenu: getEditMenuTemplate(mainWindow)
        },
        {
            label: getCurrentTranslation('$Menu.view'),
            submenu: getViewMenuTemplate()
        },
        {
            label: getCurrentTranslation('$Menu.help'),
            submenu: getHelpMenuTemplate()
        }
    ]);

    if (appConfig.macOS)
    {
        Menu.setApplicationMenu(menu);
        // Use the macOS dock if we've got it
        const dockMenuTemplate = getDockMenuTemplate(mainWindow);
        app.dock.setMenu(Menu.buildFromTemplate(dockMenuTemplate));
        mainWindow.maximize();
    }
    else
    {
        mainWindow.setMenu(menu);
    }
}

function createWindow()
{
    // Create the browser window.
    const widthHeight = getDefaultWidthHeight();
    mainWindow = new BrowserWindow({
        width: widthHeight.width,
        height: widthHeight.height,
        minWidth: 450,
        minHeight: 450,
        useContentSize: false,
        zoomToPageWidth: true, //MacOS only
        icon: appConfig.iconpath,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });

    createMenu();

    // Prevents flickering from maximize
    mainWindow.show();

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    ipcMain.on('TOGGLE_TRAY_PUNCH_TIME', (_event, arg) =>
    {
        const contextMenuTemplate = getContextMenuTemplate(mainWindow);
        contextMenuTemplate[0].enabled = arg;
        contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
        tray.setContextMenu(contextMenu);
    });

    ipcMain.on('RESIZE_MAIN_WINDOW', (event, width, height) =>
    {
        mainWindow.setSize(width, height);
    });

    ipcMain.on('VIEW_CHANGED', (event, savedPreferences) =>
    {
        mainWindow.webContents.send('PREFERENCE_SAVED', savedPreferences);
    });

    ipcMain.on('RECEIVE_LEAVE_BY', (event, element) =>
    {
        const notification = createLeaveNotification(element);
        if (notification) notification.show();
    });

    leaveByInterval = setInterval(() =>
    {
        mainWindow.webContents.send('GET_LEAVE_BY');
    }, 60 * 1000);

    tray = new Tray(appConfig.trayIcon);
    tray.on('click', () =>
    {
        mainWindow.show();
    });

    tray.on('right-click', () =>
    {
        tray.popUpContextMenu(contextMenu);
    });

    mainWindow.on('minimize', (event) =>
    {
        const savedPreferences = getUserPreferences();
        if (savedPreferences['minimize-to-tray'])
        {
            event.preventDefault();
            mainWindow.hide();
        }
        else
        {
            mainWindow.minimize();
        }
    });

    // Emitted when the window is closed.
    mainWindow.on('close', (event) =>
    {
        const savedPreferences = getUserPreferences();
        if (!app.isQuitting && savedPreferences['close-to-tray'])
        {
            event.preventDefault();
            mainWindow.hide();
        }
    });

}

function triggerStartupDialogs()
{
    if (shouldCheckForUpdates())
    {
        checkForUpdates(/*showUpToDateDialog=*/false);
    }

    if (shouldProposeFlexibleDbMigration())
    {
        proposeFlexibleDbMigration();
    }
}

function proposeFlexibleDbMigration()
{
    const options = {
        type: 'question',
        buttons: [getCurrentTranslation('$Menu.migrate'), getCurrentTranslation('$Menu.fresh-start')],
        defaultId: 2,
        title: getCurrentTranslation('$Menu.migrate-calendar-to-flexible'),
        message: getCurrentTranslation('$Menu.should-migrate-to-flexible'),
    };

    const response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
    if (response === 0 /*migrate*/)
    {
        const migrateResult = migrateFixedDbToFlexible();
        getMainWindow().webContents.send('RELOAD_CALENDAR');
        if (migrateResult['result'] === true)
        {
            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                {
                    title: 'Time to Leave',
                    message: getCurrentTranslation('$Menu.database-migrated'),
                    type: 'info',
                    icon: appConfig.iconpath,
                    detail: getCurrentTranslation('$Menu.migration-successful')
                });
        }
        else
        {
            handleFailedFlexibleDbMigration(migrateResult);
        }
    }
    else if (response === 1 /*fresh-start*/)
    {
        const confirmOptions = {
            type: 'question',
            buttons: [getCurrentTranslation('$Menu.cancel'), getCurrentTranslation('$Menu.yes-please')],
            defaultId: 2,
            title: getCurrentTranslation('$Menu.fresh-start'),
            message: getCurrentTranslation('$Menu.fresh-start-confirm'),
        };

        const confirmResponse = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), confirmOptions);
        if (confirmResponse === 0 /*cancel*/)
        {
            proposeFlexibleDbMigration();
        }
    }
}

/**
 * @param {Object} migrateResult Result of migrateFixedDbToFlexible() call
 */
function handleFailedFlexibleDbMigration(migrateResult)
{
    const warningResponse = dialog.showMessageBoxSync({
        type: 'warning',
        buttons: [getCurrentTranslation('$Menu.report'), getCurrentTranslation('$Menu.quit')],
        title: getCurrentTranslation('$Menu.failed-migrating'),
        message: getCurrentTranslation('$Menu.something-went-wrong')
    });

    if (warningResponse === 0 /*report*/)
    {
        const issueTitle = 'Failed Migrating Database';
        const err = migrateResult['err'];
        const LB = '%0D%0A'; // Line Break char in html encoding
        const encodedDetails = getDetails().replaceAll('\n', LB);
        const issueBody = `While performing database migration, my application failed with the following issue:${LB}` +
            LB +
            '```' + LB +
            err + LB +
            '```' + LB +
            LB +
            'Environment:' + LB +
            LB +
            encodedDetails + LB +
            LB +
            'Please look into it.';
        shell.openExternal(`https://github.com/thamara/time-to-leave/issues/new?labels=bug&title=${issueTitle}&body=${issueBody}`);
    }

    app.quit();
}

function shouldProposeFlexibleDbMigration()
{
    const store = new Store();
    const flexibleStore = new Store({name: 'flexible-store'});

    // There is data saved on the old store, but nothing yet on the flexible store.
    return store.size !== 0 && flexibleStore.size === 0;
}

function resetMainWindow()
{
    ipcMain.removeAllListeners();
    if (mainWindow && !mainWindow.isDestroyed())
    {
        mainWindow.close();
        mainWindow.removeAllListeners();
        mainWindow = null;
    }
    if (tray)
    {
        tray.removeAllListeners();
    }
    clearInterval(leaveByInterval);
    leaveByInterval = null;
    tray = null;
}

module.exports = {
    createWindow,
    createMenu,
    getMainWindow,
    triggerStartupDialogs,
    shouldProposeFlexibleDbMigration,
    proposeFlexibleDbMigration,
    resetMainWindow,
    getLeaveByInterval: () => leaveByInterval,
    getWindowTray: () => tray
};
