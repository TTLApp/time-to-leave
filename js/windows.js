'use strict';

const { BrowserWindow } = require('electron');
import { appConfig } from './app-config.js';
const path = require('path');
import { getDateStr } from './date-aux.js';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let waiverWindow = null;
const prefWindow = null;
const tray = null;
const contextMenu = null;

function openWaiverManagerWindow(mainWindow, event)
{
    if (waiverWindow !== null)
    {
        waiverWindow.show();
        return;
    }

    if (event)
    {
        const today = new Date();
        global.waiverDay = getDateStr(today);
    }
    const htmlPath = path.join('file://', __dirname, '../src/workday-waiver.html');
    waiverWindow = new BrowserWindow({ width: 600,
        height: 500,
        x: Math.round(mainWindow.getBounds().x + mainWindow.getBounds().width/2 - 600/2),
        y: Math.round(mainWindow.getBounds().y + mainWindow.getBounds().height/2 - 500/2),
        parent: mainWindow,
        resizable: true,
        icon: appConfig.iconpath,
        webPreferences: {
            enableRemoteModule: true,
            nodeIntegration: true
        } });
    waiverWindow.setMenu(null);
    waiverWindow.loadURL(htmlPath);
    waiverWindow.show();
    waiverWindow.on('close', function()
    {
        waiverWindow = null;
        mainWindow.webContents.send('WAIVER_SAVED');
    });
}

module.exports = {
    waiverWindow,
    prefWindow,
    tray,
    contextMenu,
    openWaiverManagerWindow
};