'use strict';

const { app, BrowserWindow, clipboard, dialog, shell, Menu } = require('electron');
const { appConfig } = require('./app-config');
const { checkForUpdates } = require('./update-manager');
const { getDateStr } = require('./date-aux.js');
const {
    getSavedPreferences,
    setAlreadyAskedForFlexibleDbMigration,
    getAlreadyAskedForFlexibleDbMigration
} = require('./saved-preferences.js');
const { importDatabaseFromFile, exportDatabaseToFile, migrateFixedDbToFlexible } = require('./import-export.js');
const { notify } = require('./notification');
const os = require('os');
const { savePreferences } = require('./user-preferences.js');
const path = require('path');
const Store = require('electron-store');
const i18n = require('../src/configs/i18next.config');
let { waiverWindow, prefWindow } = require('./windows');

function migrateFixedDbToFlexibleRequest(mainWindow, options)
{
    let response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
    if (response === 1)
    {
        const migrateResult = migrateFixedDbToFlexible();
        mainWindow.webContents.executeJavaScript('calendar.reload()');
        if (migrateResult)
        {
            Menu.getApplicationMenu().getMenuItemById('migrate-to-flexible-calendar').enabled = false;
            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                {
                    title: 'Time to Leave',
                    message: i18n.t('$Menu.database-migrated'),
                    type: 'info',
                    icon: appConfig.iconpath,
                    detail: i18n.t('$Menu.migration-successful')
                });
        }
        else
        {
            dialog.showMessageBoxSync({
                type: 'warning',
                title: i18n.t('$Menu.failed-migrating'),
                message: i18n.t('$Menu.something-went-wrong')
            });
        }
    }
}

function enableMigrationToFlexibleButton()
{
    const store = new Store();
    const flexibleStore = new Store({name: 'flexible-store'});
    return store.size !== 0 && flexibleStore.size === 0;
}

function getMainMenuTemplate(mainWindow)
{
    return [
        {
            label: i18n.t('$Menu.workday-waiver-manager'),
            id: 'workday-waiver-manager',
            click(item, window, event)
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
            },
        },
        {type: 'separator'},
        {
            label:i18n.t('$Menu.exit'),
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
            label: i18n.t('$Menu.punch-time'), click: function()
            {
                let now = new Date();

                mainWindow.webContents.executeJavaScript('calendar.punchDate()');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                notify(`${i18n.t('$Menu.punched-time')} ${now.toTimeString().slice(0,5)}`);
            }
        },
        {
            label: i18n.t('$Menu.show-app'), click: function()
            {
                mainWindow.show();
            }
        },
        {
            label: i18n.t('$Menu.quit'), click: function()
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
            label: i18n.t('$Menu.punch-time'), click: function()
            {
                let now = new Date();

                mainWindow.webContents.executeJavaScript('calendar.punchDate()');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                notify(`${i18n.t('$Menu.punched-time')} ${now.toTimeString().slice(0,5)}`);
            }
        }
    ];
}

function getEditMenuTemplate(mainWindow)
{
    return [
        {
            label: i18n.t('$Menu.cut'),
            accelerator: 'Command+X',
            selector: 'cut:'
        },
        {
            label: i18n.t('$Menu.copy'),
            accelerator: 'Command+C',
            selector: 'copy:'
        },
        {
            label: i18n.t('$Menu.paste'),
            accelerator: 'Command+V',
            selector: 'paste:'
        },
        {
            label: i18n.t('$Menu.select-all'),
            accelerator: 'Command+A',
            selector: 'selectAll:'
        },
        {type: 'separator'},
        {
            label: i18n.t('$Menu.preferences'),
            accelerator: appConfig.macOS ? 'Command+,' : 'Control+,',
            click()
            {
                if (prefWindow !== null)
                {
                    prefWindow.show();
                    return;
                }

                const htmlPath = path.join('file://', __dirname, '../src/preferences.html');
                prefWindow = new BrowserWindow({ width: 500,
                    height: 620,
                    parent: mainWindow,
                    resizable: true,
                    icon: appConfig.iconpath,
                    webPreferences: {
                        enableRemoteModule: true,
                        nodeIntegration: true
                    } });
                prefWindow.setMenu(null);
                prefWindow.loadURL(htmlPath);
                prefWindow.show();
                prefWindow.on('close', function()
                {
                    prefWindow = null;
                    let savedPreferences = getSavedPreferences();
                    if (savedPreferences !== null)
                    {
                        savePreferences(savedPreferences);
                        mainWindow.webContents.send('PREFERENCE_SAVED', savedPreferences);
                    }

                    const store = new Store();
                    const flexibleStore = new Store({name: 'flexible-store'});

                    if (!getAlreadyAskedForFlexibleDbMigration() &&
                        savedPreferences && savedPreferences['number-of-entries'] === 'flexible' &&
                        store.size !== 0 && flexibleStore.size === 0)
                    {
                        setAlreadyAskedForFlexibleDbMigration(true);
                        const options = {
                            type: 'question',
                            buttons: [i18n.t('$Menu.cancel'), i18n.t('$Menu.yes-please'), i18n.t('$Menu.no-thanks')],
                            defaultId: 2,
                            title: i18n.t('$Menu.migrate-calendar-to-flexible'),
                            message: i18n.t('$Menu.should-migrate-to-flexible'),
                        };

                        migrateFixedDbToFlexibleRequest(mainWindow, options);
                    }
                });
            },
        },
        {type: 'separator'},
        {
            label: i18n.t('$Menu.migrate-to-flexible-calendar'),
            id: 'migrate-to-flexible-calendar',
            enabled: enableMigrationToFlexibleButton(),
            click()
            {
                const options = {
                    type: 'question',
                    buttons: [i18n.t('$Menu.cancel'), i18n.t('$Menu.yes-please'), i18n.t('$Menu.no-thanks')],
                    defaultId: 2,
                    title: i18n.t('$Menu.migrate-calendar-to-flexible'),
                    message: i18n.t('$Menu.confirm-migrate-to-flexible'),
                };

                migrateFixedDbToFlexibleRequest(mainWindow, options);
            },
        },
        {type: 'separator'},
        {
            label: i18n.t('$Menu.export-database'),
            click()
            {
                let options = {
                    title: i18n.t('$Menu.export-db-to-file'),
                    defaultPath : 'time_to_leave',
                    buttonLabel : i18n.t('$Menu.export'),

                    filters : [
                        { name: '.ttldb', extensions: ['ttldb',] },
                        { name: i18n.t('$Menu.all-files'), extensions: ['*'] }
                    ]
                };
                let response = dialog.showSaveDialogSync(options);
                if (response)
                {
                    exportDatabaseToFile(response);
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                        {
                            title: 'Time to Leave',
                            message: i18n.t('$Menu.database-export'),
                            type: 'info',
                            icon: appConfig.iconpath,
                            detail: i18n.t('$Menu.database-was-exported.')
                        });
                }
            },
        },
        {
            label: i18n.t('$Menu.import-database'),
            click()
            {
                let options = {
                    title: i18n.t('$Menu.import-db-from-file'),
                    buttonLabel : i18n.t('$Menu.import'),

                    filters : [
                        {name: '.ttldb', extensions: ['ttldb',]},
                        {name: i18n.t('$Menu.all-files'), extensions: ['*']}
                    ]
                };
                let response = dialog.showOpenDialogSync(options);
                if (response)
                {
                    const options = {
                        type: 'question',
                        buttons: [i18n.t('$Menu.yes-please'), i18n.t('$Menu.no-thanks')],
                        defaultId: 2,
                        title: i18n.t('$Menu.import-database'),
                        message: i18n.t('$Menu.confirm-import-db'),
                    };

                    let confirmation = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                    if (confirmation === /*Yes*/0)
                    {
                        const importResult = importDatabaseFromFile(response);
                        // Reload only the calendar itself to avoid a flash
                        mainWindow.webContents.executeJavaScript('calendar.reload()');
                        if (importResult['result'])
                        {
                            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                                {
                                    title: 'Time to Leave',
                                    message: i18n.t('$Menu.database-imported'),
                                    type: 'info',
                                    icon: appConfig.iconpath,
                                    detail: i18n.t('$Menu.import-successful')
                                });
                        }
                        else if (importResult['failed'] !== 0)
                        {
                            if (importResult['failed'] !== 0)
                            {
                                const message = `${importResult['failed']}/${importResult['total']} ${i18n.t('$Menu.could-not-be-loaded')}`;
                                dialog.showMessageBoxSync({
                                    icon: appConfig.iconpath,
                                    type: 'warning',
                                    title: i18n.t('$Menu.failed-entries'),
                                    message: message
                                });
                            }
                        }
                        else
                        {
                            dialog.showMessageBoxSync({
                                icon: appConfig.iconpath,
                                type: 'warning',
                                title: i18n.t('$Menu.failed-entries'),
                                message: i18n.t('$Menu.something-went-wrong')
                            });
                        }
                    }
                }
            },
        },
        {
            label: i18n.t('$Menu.clear-database'),
            click()
            {
                const options = {
                    type: 'question',
                    buttons: [i18n.t('$Menu.cancel'), i18n.t('$Menu.yes-please'), i18n.t('$Menu.no-thanks')],
                    defaultId: 2,
                    title: i18n.t('$Menu.clear-database'),
                    message: i18n.t('$Menu.confirm-clear-all-data'),
                };

                let response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                if (response === 1)
                {
                    const store = new Store();
                    const waivedWorkdays = new Store({name: 'waived-workdays'});
                    const flexibleStore = new Store({name: 'flexible-store'});

                    store.clear();
                    waivedWorkdays.clear();
                    flexibleStore.clear();
                    // Reload only the calendar itself to avoid a flash
                    mainWindow.webContents.executeJavaScript('calendar.reload()');
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                        {
                            title: 'Time to Leave',
                            message: i18n.t('$Menu.clear-database'),
                            type: 'info',
                            icon: appConfig.iconpath,
                            detail: `\n${i18n.t('$Menu.all-clear')}`
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
            label: i18n.t('$Menu.reload'),
            accelerator: 'CommandOrControl+R',
            click()
            {
                BrowserWindow.getFocusedWindow().reload();
            }
        },
        {
            label: i18n.t('$Menu.toggle-dev-tools'),
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
            label: i18n.t('$Menu.ttl-github'),
            click()
            {
                shell.openExternal('https://github.com/thamara/time-to-leave');
            }
        },
        {
            label: i18n.t('$Menu.check-for-updates'),
            click()
            {
                checkForUpdates(/*showUpToDateDialog=*/true);
            }
        },
        {
            label: i18n.t('$Menu.send-feedback'),
            click()
            {
                shell.openExternal('https://github.com/thamara/time-to-leave/issues/new');
            }
        },
        {
            type: 'separator'
        },
        {
            label: i18n.t('$Menu.about'),
            click()
            {
                const version = app.getVersion();
                const electronVersion = process.versions.electron;
                const chromeVersion = process.versions.chrome;
                const nodeVersion = process.versions.node;
                const OSInfo = `${os.type()} ${os.arch()} ${os.release()}`;
                const detail = `Version: ${version}\nElectron: ${electronVersion}\nChrome: ${chromeVersion}\nNode.js: ${nodeVersion}\nOS: ${OSInfo}`;
                dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                    {
                        title: 'Time to Leave',
                        message: 'Time to Leave',
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: `\n${detail}`,
                        buttons: [i18n.t('$Menu.copy'), i18n.t('$Menu.ok')],
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
