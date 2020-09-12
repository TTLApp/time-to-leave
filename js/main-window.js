const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const { getDefaultWidthHeight, getUserPreferences } = require('./user-preferences.js');
const path = require('path');
const { checkForUpdates, shouldcheckForUpdates } = require('./update-manager');
const { appConfig } = require('./app-config');
const {
    getContextMenuTemplate,
    getDockMenuTemplate,
    getEditMenuTemplate,
    getHelpMenuTemplate,
    getMainMenuTemplate,
    getViewMenuTemplate
} = require('./menus');
let { contextMenu, mainWindow, tray } = require('./windows');

function createWindow()
{
    // Create the browser window.
    let widthHeight = getDefaultWidthHeight();
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

    var menu = Menu.buildFromTemplate([
        {
            label: 'Menu',
            submenu: getMainMenuTemplate(mainWindow)
        },
        {
            label: 'Edit',
            submenu: getEditMenuTemplate(mainWindow)
        },
        {
            label: 'View',
            submenu: getViewMenuTemplate()
        },
        {
            label: 'Help',
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
    tray.on('click', function handleCliked()
    {
        mainWindow.show();
    });

    tray.on('right-click', function handleCliked()
    {
        tray.popUpContextMenu(contextMenu);
    });

    mainWindow.on('minimize',function(event)
    {
        event.preventDefault();
        mainWindow.hide();
    });

    // Emitted when the window is closed.
    mainWindow.on('close', function(event)
    {
        let savedPreferences = getUserPreferences();
        if (!app.isQuitting && savedPreferences['close-to-tray'])
        {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    if (shouldcheckForUpdates())
    {
        checkForUpdates(/*showUpToDateDialog=*/false);
    }
}


module.exports = {
    createWindow
};