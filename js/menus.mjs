'use strict';

import { app, BrowserWindow, clipboard, dialog, shell } from 'electron';
import Store from 'electron-store';

import { appConfig, getDetails } from './app-config.mjs';
import { getCurrentDateTimeStr } from './date-aux.mjs';
import ImportExport from './import-export.mjs';
import Notification from './notification.mjs';
import UpdateManager from './update-manager.mjs';
import Windows from './windows.mjs';
import i18NextConfig from '../src/configs/i18next.config.mjs';
import IpcConstants from './ipc-constants.mjs';

// Allow require()
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const WindowAux = require('./window-aux.cjs');

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

                mainWindow.webContents.send(IpcConstants.PunchDate);
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

                mainWindow.webContents.send(IpcConstants.PunchDate);
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
                Windows.openPreferencesWindow(mainWindow);
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
                    WindowAux.showDialog({
                        message: i18NextConfig.getCurrentTranslation('$Menu.database-export'),
                        type: 'info',
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
                            i18NextConfig.getCurrentTranslation('$Menu.yes'),
                            i18NextConfig.getCurrentTranslation('$Menu.no')
                        ],
                        defaultId: 1,
                        cancelId: 1,
                        message: i18NextConfig.getCurrentTranslation('$Menu.import-database'),
                        detail: i18NextConfig.getCurrentTranslation('$Menu.confirm-import-db')
                    };

                    const confirmation = WindowAux.showDialogSync(options);
                    if (confirmation === /*Yes*/ 0)
                    {
                        const importResult = ImportExport.importDatabaseFromFile(response);
                        // Reload only the calendar itself to avoid a flash
                        mainWindow.webContents.send(IpcConstants.ReloadCalendar);
                        if (importResult['result'])
                        {
                            WindowAux.showDialog({
                                message: i18NextConfig.getCurrentTranslation('$Menu.database-imported'),
                                type: 'info',
                                detail: i18NextConfig.getCurrentTranslation('$Menu.import-successful')
                            });
                        }
                        else if (importResult['failed'] !== 0)
                        {
                            const message = `${importResult['failed']}/${
                                importResult['total']
                            } ${i18NextConfig.getCurrentTranslation('$Menu.could-not-be-loaded')}`;
                            WindowAux.showDialogSync({
                                type: 'warning',
                                message: i18NextConfig.getCurrentTranslation('$Menu.failed-entries'),
                                detail: message
                            });
                        }
                        else
                        {
                            WindowAux.showDialogSync({
                                type: 'error',
                                message: i18NextConfig.getCurrentTranslation('$Menu.failed-entries'),
                                detail: i18NextConfig.getCurrentTranslation('$Menu.something-went-wrong')
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
                        i18NextConfig.getCurrentTranslation('$Menu.yes'),
                        i18NextConfig.getCurrentTranslation('$Menu.no')
                    ],
                    defaultId: 1,
                    cancelId: 1,
                    message: i18NextConfig.getCurrentTranslation('$Menu.clear-database'),
                    detail: i18NextConfig.getCurrentTranslation('$Menu.confirm-clear-all-data')
                };

                const response = WindowAux.showDialogSync(options);
                if (response === 0)
                {
                    const store = new Store();
                    const waivedWorkdays = new Store({ name: 'waived-workdays' });
                    const calendarStore = new Store({ name: 'flexible-store' });

                    store.clear();
                    waivedWorkdays.clear();
                    calendarStore.clear();
                    // Reload only the calendar itself to avoid a flash
                    mainWindow.webContents.send(IpcConstants.ReloadCalendar);
                    WindowAux.showDialog({
                        message: i18NextConfig.getCurrentTranslation('$Menu.clear-database'),
                        type: 'info',
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
                WindowAux.showDialog({
                    message: 'Time to Leave',
                    type: 'info',
                    detail: `\n${detail}`,
                    buttons: [
                        i18NextConfig.getCurrentTranslation('$Menu.copy'),
                        i18NextConfig.getCurrentTranslation('$Menu.ok')
                    ],
                    defaultId: 1,
                    cancelId: 1,
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
