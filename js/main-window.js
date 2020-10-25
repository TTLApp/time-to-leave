'use strict';

const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const { getDefaultWidthHeight, getUserPreferences } = require('./user-preferences.js');
const path = require('path');
const { checkForUpdates, shouldCheckForUpdates } = require('./update-manager');
const { appConfig } = require('./app-config');
const {
    getContextMenuTemplate,
    getDockMenuTemplate,
    getEditMenuTemplate,
    getHelpMenuTemplate,
    getMainMenuTemplate,
    getViewMenuTemplate
} = require('./menus');
const i18n = require('../src/configs/i18next.config');
let { contextMenu, tray } = require('./windows.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

function getMainWindow()
{
    return mainWindow;
}

function createMenu()
{
    const menu = Menu.buildFromTemplate([
        {
            label: i18n.t('$Menu.menu'),
            submenu: getMainMenuTemplate(mainWindow)
        },
        {
            label: i18n.t('$Menu.edit'),
            submenu: getEditMenuTemplate(mainWindow)
        },
        {
            label: i18n.t('$Menu.view'),
            submenu: getViewMenuTemplate()
        },
        {
            label: i18n.t('$Menu.help'),
            submenu: getHelpMenuTemplate()
        }
    ]);
    Menu.setApplicationMenu(menu);
    if (appConfig.macOS)
    {
        // Use the macOS dock if we've got it
        let dockMenuTemplate = getDockMenuTemplate(mainWindow);
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

    ipcMain.on('TOGGLE_TRAY_PUNCH_TIME', function(_event, arg)
    {
        let contextMenuTemplate = getContextMenuTemplate(mainWindow);
        contextMenuTemplate[0].enabled = arg;
        contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
    });

    ipcMain.on('RESIZE_MAIN_WINDOW', (event, width, height) =>
    {
        mainWindow.setSize(width, height);
    });

    ipcMain.on('VIEW_CHANGED', (event, savedPreferences) =>
    {
        mainWindow.webContents.send('PREFERENCE_SAVED', savedPreferences);
    });

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

    if (shouldCheckForUpdates())
    {
        checkForUpdates(/*showUpToDateDialog=*/false);
    }
}


module.exports = {
    createWindow,
    createMenu,
    getMainWindow
};
