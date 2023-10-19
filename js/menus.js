'use strict';

const { app, BrowserWindow, clipboard, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

const { checkForUpdates } = require('./update-manager');
const { getSavedPreferences } = require('./saved-preferences.js');
const { importDatabaseFromFile, exportDatabaseToFile } = require('./import-export.js');
const { createNotification } = require('./notification');
const { getCurrentTranslation } = require('../src/configs/i18next.config');
let { openWaiverManagerWindow, prefWindow, getDialogCoordinates } = require('./windows');

import { appConfig, getDetails } from './app-config.js';
import { savePreferences } from './user-preferences.js';
import { getCurrentDateTimeStr } from './date-aux.js';

function getMainMenuTemplate(mainWindow)
{
    return [
        {
            label: getCurrentTranslation('$Menu.workday-waiver-manager'),
            id: 'workday-waiver-manager',
            click(item, window, event)
            {
                openWaiverManagerWindow(mainWindow, event);
            },
        },
        {type: 'separator'},
        {
            label:getCurrentTranslation('$Menu.exit'),
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
            label: getCurrentTranslation('$Menu.punch-time'),
            click: function()
            {
                const now = new Date();

                mainWindow.webContents.send('PUNCH_DATE');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                createNotification(`${getCurrentTranslation('$Menu.punched-time')} ${now.toTimeString().slice(0,5)}`).show();
            }
        },
        {
            label: getCurrentTranslation('$Menu.show-app'),
            click: function()
            {
                mainWindow.show();
            }
        },
        {
            label: getCurrentTranslation('$Menu.quit'),
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
            label: getCurrentTranslation('$Menu.punch-time'), click: function()
            {
                const now = new Date();

                mainWindow.webContents.send('PUNCH_DATE');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                createNotification(`${getCurrentTranslation('$Menu.punched-time')} ${now.toTimeString().slice(0,5)}`).show();
            }
        }
    ];
}

function getEditMenuTemplate(mainWindow)
{
    return [
        {
            label: getCurrentTranslation('$Menu.cut'),
            accelerator: 'Command+X',
            selector: 'cut:'
        },
        {
            label: getCurrentTranslation('$Menu.copy'),
            accelerator: 'Command+C',
            selector: 'copy:'
        },
        {
            label: getCurrentTranslation('$Menu.paste'),
            accelerator: 'Command+V',
            selector: 'paste:'
        },
        {
            label: getCurrentTranslation('$Menu.select-all'),
            accelerator: 'Command+A',
            selector: 'selectAll:'
        },
        {type: 'separator'},
        {
            label: getCurrentTranslation('$Menu.preferences'),
            accelerator: appConfig.macOS ? 'Command+,' : 'Control+,',
            click()
            {
                if (prefWindow !== null)
                {
                    prefWindow.show();
                    return;
                }

                const htmlPath = path.join('file://', __dirname, '../src/preferences.html');
                const dialogCoordinates = getDialogCoordinates(500, 620, mainWindow);
                prefWindow = new BrowserWindow({ width: 500,
                    height: 620,
                    minWidth: 480,
                    x: dialogCoordinates.x,
                    y: dialogCoordinates.y,
                    parent: mainWindow,
                    resizable: true,
                    icon: appConfig.iconpath,
                    webPreferences: {
                        nodeIntegration: true,
                        preload: path.join(__dirname, '../renderer/preload-scripts/preferences-bridge.js'),
                        contextIsolation: true
                    } });
                prefWindow.setMenu(null);
                prefWindow.loadURL(htmlPath);
                prefWindow.show();
                prefWindow.on('close', function()
                {
                    prefWindow = null;
                    const savedPreferences = getSavedPreferences();
                    if (savedPreferences !== null)
                    {
                        savePreferences(savedPreferences);
                        mainWindow.webContents.send('PREFERENCE_SAVED', savedPreferences);
                    }
                });
                prefWindow.webContents.on('before-input-event', (event, input) =>
                {
                    if (input.control && input.shift && input.key.toLowerCase() === 'i')
                    {
                        BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
                    }
                });
            },
        },
        {type: 'separator'},
        {
            label: getCurrentTranslation('$Menu.export-database'),
            click()
            {
                const options = {
                    title: getCurrentTranslation('$Menu.export-db-to-file'),
                    defaultPath : `time_to_leave_${getCurrentDateTimeStr()}`,
                    buttonLabel : getCurrentTranslation('$Menu.export'),

                    filters : [
                        { name: '.ttldb', extensions: ['ttldb',] },
                        { name: getCurrentTranslation('$Menu.all-files'), extensions: ['*'] }
                    ]
                };
                const response = dialog.showSaveDialogSync(options);
                if (response)
                {
                    exportDatabaseToFile(response);
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                        {
                            title: 'Time to Leave',
                            message: getCurrentTranslation('$Menu.database-export'),
                            type: 'info',
                            icon: appConfig.iconpath,
                            detail: getCurrentTranslation('$Menu.database-was-exported')
                        });
                }
            },
        },
        {
            label: getCurrentTranslation('$Menu.import-database'),
            click()
            {
                const options = {
                    title: getCurrentTranslation('$Menu.import-db-from-file'),
                    buttonLabel : getCurrentTranslation('$Menu.import'),

                    filters : [
                        {name: '.ttldb', extensions: ['ttldb',]},
                        {name: getCurrentTranslation('$Menu.all-files'), extensions: ['*']}
                    ]
                };
                const response = dialog.showOpenDialogSync(options);
                if (response)
                {
                    const options = {
                        type: 'question',
                        buttons: [getCurrentTranslation('$Menu.yes-please'), getCurrentTranslation('$Menu.no-thanks')],
                        defaultId: 2,
                        title: getCurrentTranslation('$Menu.import-database'),
                        message: getCurrentTranslation('$Menu.confirm-import-db'),
                    };

                    const confirmation = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                    if (confirmation === /*Yes*/0)
                    {
                        const importResult = importDatabaseFromFile(response);
                        // Reload only the calendar itself to avoid a flash
                        mainWindow.webContents.send('RELOAD_CALENDAR');
                        if (importResult['result'])
                        {
                            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                                {
                                    title: 'Time to Leave',
                                    message: getCurrentTranslation('$Menu.database-imported'),
                                    type: 'info',
                                    icon: appConfig.iconpath,
                                    detail: getCurrentTranslation('$Menu.import-successful')
                                });
                        }
                        else if (importResult['failed'] !== 0)
                        {
                            const message = `${importResult['failed']}/${importResult['total']} ${getCurrentTranslation('$Menu.could-not-be-loaded')}`;
                            dialog.showMessageBoxSync({
                                icon: appConfig.iconpath,
                                type: 'warning',
                                title: getCurrentTranslation('$Menu.failed-entries'),
                                message: message
                            });
                        }
                        else
                        {
                            dialog.showMessageBoxSync({
                                icon: appConfig.iconpath,
                                type: 'warning',
                                title: getCurrentTranslation('$Menu.failed-entries'),
                                message: getCurrentTranslation('$Menu.something-went-wrong')
                            });
                        }
                    }
                }
            },
        },
        {
            label: getCurrentTranslation('$Menu.clear-database'),
            click()
            {
                const options = {
                    type: 'question',
                    buttons: [getCurrentTranslation('$Menu.cancel'), getCurrentTranslation('$Menu.yes-please'), getCurrentTranslation('$Menu.no-thanks')],
                    defaultId: 2,
                    title: getCurrentTranslation('$Menu.clear-database'),
                    message: getCurrentTranslation('$Menu.confirm-clear-all-data'),
                };

                const response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                if (response === 1)
                {
                    const store = new Store();
                    const waivedWorkdays = new Store({name: 'waived-workdays'});
                    const flexibleStore = new Store({name: 'flexible-store'});

                    store.clear();
                    waivedWorkdays.clear();
                    flexibleStore.clear();
                    // Reload only the calendar itself to avoid a flash
                    mainWindow.webContents.send('RELOAD_CALENDAR');
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                        {
                            title: 'Time to Leave',
                            message: getCurrentTranslation('$Menu.clear-database'),
                            type: 'info',
                            icon: appConfig.iconpath,
                            detail: `\n${getCurrentTranslation('$Menu.all-clear')}`
                        });
                }
            }
        },
    ];
}

function getViewMenuTemplate()
{
    return [
        {
            label: getCurrentTranslation('$Menu.reload'),
            accelerator: 'CommandOrControl+R',
            click()
            {
                BrowserWindow.getFocusedWindow().reload();
            }
        },
        {
            label: getCurrentTranslation('$Menu.toggle-dev-tools'),
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
            label: getCurrentTranslation('$Menu.ttl-github'),
            click()
            {
                shell.openExternal('https://github.com/thamara/time-to-leave');
            }
        },
        {
            label: getCurrentTranslation('$Menu.check-for-updates'),
            click()
            {
                checkForUpdates(/*showUpToDateDialog=*/true);
            }
        },
        {
            label: getCurrentTranslation('$Menu.send-feedback'),
            click()
            {
                shell.openExternal('https://github.com/thamara/time-to-leave/issues/new');
            }
        },
        {
            type: 'separator'
        },
        {
            label: getCurrentTranslation('$Menu.about'),
            click()
            {
                const detail = getDetails();
                dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                    {
                        title: 'Time to Leave',
                        message: 'Time to Leave',
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: `\n${detail}`,
                        buttons: [getCurrentTranslation('$Menu.copy'), getCurrentTranslation('$Menu.ok')],
                        noLink: true
                    }
                ).then((result) =>
                {
                    const buttonId = result.response;
                    if (buttonId === 0)
                    {
                        clipboard.writeText(detail);
                    }
                }).catch(err =>
                {
                    console.log(err);
                });
            }
        }
    ];
}

module.exports = {
    getContextMenuTemplate,
    getDockMenuTemplate,
    getEditMenuTemplate,
    getHelpMenuTemplate,
    getMainMenuTemplate,
    getViewMenuTemplate
};
