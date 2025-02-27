'use strict';

import { BrowserWindow } from 'electron';
import path from 'path';

import { appConfig, rootDir } from './app-config.mjs';
import { getDateStr } from './date-aux.mjs';
import { toggleMainWindowWait } from './main-window.mjs';
import { getSavedPreferences } from './saved-preferences.mjs';
import { getUserPreferences, savePreferences } from './user-preferences.mjs';
import IpcConstants from './ipc-constants.mjs';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
global.waiverWindow = null;
global.prefWindow = null;
global.tray = null;
global.contextMenu = null;

class Windows
{
    static openWaiverManagerWindow(mainWindow, event)
    {
        if (global.waiverWindow !== null)
        {
            global.waiverWindow.show();
            return;
        }

        if (event)
        {
            const today = new Date();
            global.waiverDay = getDateStr(today);
        }
        const htmlPath = path.join('file://', rootDir, '/src/workday-waiver.html');
        const dialogCoordinates = Windows.getDialogCoordinates(600, 500, mainWindow);
        const userPreferences = getUserPreferences();
        global.waiverWindow = new BrowserWindow({ width: 600,
            height: 500,
            x: dialogCoordinates.x,
            y: dialogCoordinates.y,
            parent: mainWindow,
            resizable: true,
            show: false,
            icon: appConfig.iconpath,
            webPreferences: {
                nodeIntegration: true,
                preload: path.join(rootDir, '/renderer/preload-scripts/workday-waiver-bridge.mjs'),
                contextIsolation: true,
                additionalArguments: [
                    `--preferences=${JSON.stringify(userPreferences)}`,
                ],
            } });
        global.waiverWindow.setMenu(null);
        global.waiverWindow.loadURL(htmlPath);
        global.waiverWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
        {
            toggleMainWindowWait(false /*enable*/);
            global.waiverWindow.show();
        });
        global.waiverWindow.on('close', function()
        {
            global.waiverWindow = null;
            mainWindow.webContents.send(IpcConstants.WaiverSaved);
        });
        global.waiverWindow.webContents.on('before-input-event', (event, input) =>
        {
            if (input.control && input.shift && input.key.toLowerCase() === 'i')
            {
                BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
            }
        });
        toggleMainWindowWait(true /*enable*/);
    }

    static openPreferencesWindow(mainWindow)
    {
        if (global.prefWindow !== null)
        {
            global.prefWindow.show();
            return;
        }

        const htmlPath = path.join('file://', rootDir, 'src/preferences.html');
        const dialogCoordinates = Windows.getDialogCoordinates(550, 620, mainWindow);
        const userPreferences = getUserPreferences();
        global.prefWindow = new BrowserWindow({ width: 550,
            height: 620,
            minWidth: 480,
            x: dialogCoordinates.x,
            y: dialogCoordinates.y,
            parent: mainWindow,
            show: false,
            resizable: true,
            icon: appConfig.iconpath,
            webPreferences: {
                nodeIntegration: true,
                preload: path.join(rootDir, '/renderer/preload-scripts/preferences-bridge.mjs'),
                contextIsolation: true,
                additionalArguments: [
                    `--preferences=${JSON.stringify(userPreferences)}`,
                ],
            } });
        global.prefWindow.setMenu(null);
        global.prefWindow.loadURL(htmlPath);
        global.prefWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
        {
            toggleMainWindowWait(false /*enable*/);
            global.prefWindow.show();
        });
        global.prefWindow.on('close', function()
        {
            global.prefWindow = null;
            const savedPreferences = getSavedPreferences();
            if (savedPreferences !== null)
            {
                savePreferences(savedPreferences);
                mainWindow.webContents.send(IpcConstants.PreferencesSaved, savedPreferences);
            }
        });
        global.prefWindow.webContents.on('before-input-event', (event, input) =>
        {
            if (input.control && input.shift && input.key.toLowerCase() === 'i')
            {
                BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
            }
        });
        toggleMainWindowWait(true /*enable*/);
    }

    /**
     * Return the x and y coordinate for a dialog window,
     * so the dialog window is centered on the TTL window.
     * Round values, as coordinates have to be integers.
     * @param {number} dialogWidth
     * @param {number} dialogHeight
     * @param {object} mainWindow
     */
    static getDialogCoordinates(dialogWidth, dialogHeight, mainWindow)
    {
        return {
            x : Math.round(mainWindow.getBounds().x + mainWindow.getBounds().width/2 - dialogWidth/2),
            y : Math.round(mainWindow.getBounds().y + mainWindow.getBounds().height/2 - dialogHeight/2),
        };
    }

    static getWaiverWindow()
    {
        return global.waiverWindow;
    }

    static getPreferencesWindow()
    {
        return global.prefWindow;
    }

    static resetWindowsElements()
    {
        global.waiverWindow = null;
        global.prefWindow = null;
        global.tray = null;
        global.contextMenu = null;
    }
}

export default Windows;
