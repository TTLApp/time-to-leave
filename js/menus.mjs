'use strict';

import { app, BrowserWindow, clipboard, dialog, shell } from 'electron';
import Store from 'electron-store';
import path from 'path';

import { appConfig, getDetails, rootDir } from './app-config.mjs';
import { getCurrentDateTimeStr } from './date-aux.mjs';
import ImportExport from './import-export.mjs';
import Notification from './notification.mjs';
import { getSavedPreferences } from './saved-preferences.mjs';
import UpdateManager from './update-manager.mjs';
import { getUserPreferences, savePreferences } from './user-preferences.mjs';
import Windows from './windows.mjs';
import i18NextConfig from '../src/configs/i18next.config.mjs';

function getMainMenuTemplate(mainWindow)
{
    return [
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.workday-waiver-manager'),
            id: 'workday-waiver-manager',
            click(item, window, event)
            {
                Windows.openWaiverManagerWindow(mainWindow, event);
            }
        },
        { type: 'separator' },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.exit'),
            accelerator: appConfig.macOS ? 'CommandOrControl+Q' : 'Control+Q',
            click()
            {
                app.quit();
            }
        }
    ];
}

function getContextMenuTemplate(mainWindow)
{
    return [
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.punch-time'),
            click: function()
            {
                const now = new Date();

                mainWindow.webContents.send('PUNCH_DATE');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                Notification.createNotification(
                    `${i18NextConfig.getCurrentTranslation(
                        '$Menu.punched-time'
                    )} ${now.toTimeString().slice(0, 5)}`
                ).show();
            }
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.show-app'),
            click: function()
            {
                mainWindow.show();
            }
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.quit'),
            click: function()
            {
                app.quit();
            }
        }
    ];
}

function getDockMenuTemplate(mainWindow)
{
    return [
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.punch-time'),
            click: function()
            {
                const now = new Date();

                mainWindow.webContents.send('PUNCH_DATE');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                Notification.createNotification(
                    `${i18NextConfig.getCurrentTranslation(
                        '$Menu.punched-time'
                    )} ${now.toTimeString().slice(0, 5)}`
                ).show();
            }
        }
    ];
}

function getEditMenuTemplate(mainWindow)
{
    return [
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.cut'),
            accelerator: 'Command+X',
            selector: 'cut:'
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.copy'),
            accelerator: 'Command+C',
            selector: 'copy:'
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.paste'),
            accelerator: 'Command+V',
            selector: 'paste:'
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.select-all'),
            accelerator: 'Command+A',
            selector: 'selectAll:'
        },
        { type: 'separator' },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.preferences'),
            accelerator: appConfig.macOS ? 'Command+,' : 'Control+,',
            click()
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
                global.prefWindow.show();
                global.prefWindow.on('close', function()
                {
                    global.prefWindow = null;
                    const savedPreferences = getSavedPreferences();
                    if (savedPreferences !== null)
                    {
                        savePreferences(savedPreferences);
                        mainWindow.webContents.send('PREFERENCES_SAVED', savedPreferences);
                    }
                });
                global.prefWindow.webContents.on('before-input-event', (event, input) =>
                {
                    if (input.control && input.shift && input.key.toLowerCase() === 'i')
                    {
                        BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
                    }
                });
            }
        },
        { type: 'separator' },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.export-database'),
            click()
            {
                const options = {
                    title: i18NextConfig.getCurrentTranslation('$Menu.export-db-to-file'),
                    defaultPath: `time_to_leave_${getCurrentDateTimeStr()}`,
                    buttonLabel: i18NextConfig.getCurrentTranslation('$Menu.export'),

                    filters: [
                        { name: '.ttldb', extensions: ['ttldb'] },
                        {
                            name: i18NextConfig.getCurrentTranslation('$Menu.all-files'),
                            extensions: ['*']
                        }
                    ]
                };
                const response = dialog.showSaveDialogSync(options);
                if (response)
                {
                    ImportExport.exportDatabaseToFile(response);
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                        title: 'Time to Leave',
                        message: i18NextConfig.getCurrentTranslation('$Menu.database-export'),
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: i18NextConfig.getCurrentTranslation('$Menu.database-was-exported')
                    });
                }
            }
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.import-database'),
            click()
            {
                const options = {
                    title: i18NextConfig.getCurrentTranslation('$Menu.import-db-from-file'),
                    buttonLabel: i18NextConfig.getCurrentTranslation('$Menu.import'),

                    filters: [
                        { name: '.ttldb', extensions: ['ttldb'] },
                        {
                            name: i18NextConfig.getCurrentTranslation('$Menu.all-files'),
                            extensions: ['*']
                        }
                    ]
                };
                const response = dialog.showOpenDialogSync(options);
                if (response)
                {
                    const options = {
                        type: 'question',
                        buttons: [
                            i18NextConfig.getCurrentTranslation('$Menu.yes-please'),
                            i18NextConfig.getCurrentTranslation('$Menu.no-thanks')
                        ],
                        defaultId: 2,
                        title: i18NextConfig.getCurrentTranslation('$Menu.import-database'),
                        message: i18NextConfig.getCurrentTranslation('$Menu.confirm-import-db')
                    };

                    const confirmation = dialog.showMessageBoxSync(
                        BrowserWindow.getFocusedWindow(),
                        options
                    );
                    if (confirmation === /*Yes*/ 0)
                    {
                        const importResult = ImportExport.importDatabaseFromFile(response);
                        // Reload only the calendar itself to avoid a flash
                        mainWindow.webContents.send('RELOAD_CALENDAR');
                        if (importResult['result'])
                        {
                            dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                                title: 'Time to Leave',
                                message: i18NextConfig.getCurrentTranslation('$Menu.database-imported'),
                                type: 'info',
                                icon: appConfig.iconpath,
                                detail: i18NextConfig.getCurrentTranslation('$Menu.import-successful')
                            });
                        }
                        else if (importResult['failed'] !== 0)
                        {
                            const message = `${importResult['failed']}/${
                                importResult['total']
                            } ${i18NextConfig.getCurrentTranslation('$Menu.could-not-be-loaded')}`;
                            dialog.showMessageBoxSync({
                                icon: appConfig.iconpath,
                                type: 'warning',
                                title: i18NextConfig.getCurrentTranslation('$Menu.failed-entries'),
                                message: message
                            });
                        }
                        else
                        {
                            dialog.showMessageBoxSync({
                                icon: appConfig.iconpath,
                                type: 'warning',
                                title: i18NextConfig.getCurrentTranslation('$Menu.failed-entries'),
                                message: i18NextConfig.getCurrentTranslation('$Menu.something-went-wrong')
                            });
                        }
                    }
                }
            }
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.clear-database'),
            click()
            {
                const options = {
                    type: 'question',
                    buttons: [
                        i18NextConfig.getCurrentTranslation('$Menu.cancel'),
                        i18NextConfig.getCurrentTranslation('$Menu.yes-please'),
                        i18NextConfig.getCurrentTranslation('$Menu.no-thanks')
                    ],
                    defaultId: 2,
                    title: i18NextConfig.getCurrentTranslation('$Menu.clear-database'),
                    message: i18NextConfig.getCurrentTranslation('$Menu.confirm-clear-all-data')
                };

                const response = dialog.showMessageBoxSync(
                    BrowserWindow.getFocusedWindow(),
                    options
                );
                if (response === 1)
                {
                    const store = new Store();
                    const waivedWorkdays = new Store({ name: 'waived-workdays' });
                    const calendarStore = new Store({ name: 'flexible-store' });

                    store.clear();
                    waivedWorkdays.clear();
                    calendarStore.clear();
                    // Reload only the calendar itself to avoid a flash
                    mainWindow.webContents.send('RELOAD_CALENDAR');
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                        title: 'Time to Leave',
                        message: i18NextConfig.getCurrentTranslation('$Menu.clear-database'),
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: `\n${i18NextConfig.getCurrentTranslation('$Menu.all-clear')}`
                    });
                }
            }
        }
    ];
}

function getViewMenuTemplate()
{
    return [
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.reload'),
            accelerator: 'CommandOrControl+R',
            click()
            {
                BrowserWindow.getFocusedWindow().reload();
            }
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.toggle-dev-tools'),
            accelerator: appConfig.macOS ? 'Command+Alt+I' : 'Control+Shift+I',
            click()
            {
                BrowserWindow.getFocusedWindow().toggleDevTools();
            }
        }
    ];
}

function getHelpMenuTemplate()
{
    return [
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.ttl-github'),
            click()
            {
                shell.openExternal('https://github.com/TTLApp/time-to-leave');
            }
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.check-for-updates'),
            click()
            {
                UpdateManager.checkForUpdates(/*showUpToDateDialog=*/ true);
            }
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.send-feedback'),
            click()
            {
                shell.openExternal(
                    'https://github.com/TTLApp/time-to-leave/issues/new'
                );
            }
        },
        {
            type: 'separator'
        },
        {
            label: i18NextConfig.getCurrentTranslation('$Menu.about'),
            click()
            {
                const detail = getDetails();
                dialog
                    .showMessageBox(BrowserWindow.getFocusedWindow(), {
                        title: 'Time to Leave',
                        message: 'Time to Leave',
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: `\n${detail}`,
                        buttons: [
                            i18NextConfig.getCurrentTranslation('$Menu.copy'),
                            i18NextConfig.getCurrentTranslation('$Menu.ok')
                        ],
                        noLink: true
                    })
                    .then(result =>
                    {
                        const buttonId = result.response;
                        if (buttonId === 0)
                        {
                            clipboard.writeText(detail);
                        }
                    })
                    .catch(err =>
                    {
                        console.log(err);
                    });
            }
        }
    ];
}

export {
    getContextMenuTemplate,
    getDockMenuTemplate,
    getEditMenuTemplate,
    getHelpMenuTemplate,
    getMainMenuTemplate,
    getViewMenuTemplate
};
