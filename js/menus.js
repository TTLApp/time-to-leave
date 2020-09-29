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
const { os } = require('os');
const { savePreferences } = require('./user-preferences.js');
const path = require('path');
const Store = require('electron-store');
let { waiverWindow, prefWindow } = require('./windows');

function migrateFixedDbToFlexibleRequest(mainWindow, options) {
    let response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
    if (response === 1) {
        const migrateResult = migrateFixedDbToFlexible(response);
        mainWindow.webContents.executeJavaScript('calendar.reload()');
        if (migrateResult) {
            Menu.getApplicationMenu().getMenuItemById('migrate-to-flexible-calendar').enabled = false;
            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                {
                    title: 'Time to Leave',
                    message: 'Database migrated',
                    type: 'info',
                    icon: appConfig.iconpath,
                    detail: 'Yay! Migration successful!'
                });
        } else {
            dialog.showMessageBoxSync({
                type: 'warning',
                title: 'Failed migrating',
                message: 'Something wrong happened :('
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
            label: 'Workday Waiver Manager',
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
            label:'Exit',
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
            label: 'Punch time', click: function()
            {
                var now = new Date();

                mainWindow.webContents.executeJavaScript('calendar.punchDate()');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                notify(`Punched time ${now.toTimeString().slice(0,5)}`);
            }
        },
        {
            label: 'Show App', click: function()
            {
                mainWindow.show();
            }
        },
        {
            label: 'Quit', click: function()
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
            label: 'Punch time', click: function()
            {
                var now = new Date();

                mainWindow.webContents.executeJavaScript('calendar.punchDate()');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                notify(`Punched time ${now.toTimeString().slice(0,5)}`);
            }
        }
    ];
}

function getEditMenuTemplate(mainWindow)
{
    return [
        {
            label: 'Cut',
            accelerator: 'Command+X',
            selector: 'cut:'
        },
        {
            label: 'Copy',
            accelerator: 'Command+C',
            selector: 'copy:'
        },
        {
            label: 'Paste',
            accelerator: 'Command+V',
            selector: 'paste:'
        },
        {
            label: 'Select All',
            accelerator: 'Command+A',
            selector: 'selectAll:'
        },
        {type: 'separator'},
        {
            label: 'Preferences',
            accelerator: appConfig.macOS ? 'Command+,' : 'Control+,',
            click()
            {
                if (prefWindow !== null)
                {
                    prefWindow.show();
                    return;
                }

                const htmlPath = path.join('file://', __dirname, '../src/preferences.html');
                prefWindow = new BrowserWindow({ width: 400,
                    height: 560,
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
                        store.size !== 0 && flexibleStore.size === 0) {
                        setAlreadyAskedForFlexibleDbMigration(true);
                        const options = {
                            type: 'question',
                            buttons: ['Cancel', 'Yes, please', 'No, thanks'],
                            defaultId: 2,
                            title: 'Migrate fixed calendar database to flexible',
                            message: 'Your flexible calendar is empty. Do you want to start by migrating the existing fixed calendar database to your flexible one?',
                        };

                        migrateFixedDbToFlexibleRequest(mainWindow, options);
                    }
                });
            },
        },
        {type: 'separator'},
        {
            label: 'Migrate to flexible calendar',
            id: 'migrate-to-flexible-calendar',
            enabled: enableMigrationToFlexibleButton(),
            click() {
                const options = {
                    type: 'question',
                    buttons: ['Cancel', 'Yes, please', 'No, thanks'],
                    defaultId: 2,
                    title: 'Migrate fixed calendar database to flexible',
                    message: 'Are you sure you want to migrate the fixed calendar database to the flexible calendar?\n\nThe existing flexible calendar database will be cleared.',
                };

                migrateFixedDbToFlexibleRequest(mainWindow, options);
            },
        },
        {type: 'separator'},
        {
            label: 'Export database',
            click()
            {
                var options = {
                    title: 'Export DB to file',
                    defaultPath : 'time_to_leave',
                    buttonLabel : 'Export',

                    filters : [
                        { name: '.ttldb', extensions: ['ttldb',] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                };
                let response = dialog.showSaveDialogSync(options);
                if (response)
                {
                    exportDatabaseToFile(response);
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                        {
                            title: 'Time to Leave',
                            message: 'Database export',
                            type: 'info',
                            icon: appConfig.iconpath,
                            detail: 'Okay, database was exported.'
                        });
                }
            },
        },
        {
            label: 'Import database',
            click()
            {
                var options = {
                    title: 'Import DB from file',
                    buttonLabel : 'Import',

                    filters : [
                        {name: '.ttldb', extensions: ['ttldb',]},
                        {name: 'All Files', extensions: ['*']}
                    ]
                };
                let response = dialog.showOpenDialogSync(options);
                if (response)
                {
                    const options = {
                        type: 'question',
                        buttons: ['Yes, please', 'No, thanks'],
                        defaultId: 2,
                        title: 'Import database',
                        message: 'Are you sure you want to import a database? It will override any current information.',
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
                                    message: 'Database imported',
                                    type: 'info',
                                    icon: appConfig.iconpath,
                                    detail: 'Yay! Import successful!'
                                });
                        }
                        else if (importResult['failed'] !== 0)
                        {
                            if (importResult['failed'] !== 0)
                            {
                                const message = importResult['failed'] + ' out of ' + importResult['total'] + ' could not be loaded.';
                                dialog.showMessageBoxSync({
                                    type: 'warning',
                                    title: 'Failed entries',
                                    message: message
                                });
                            }
                        }
                        else
                        {
                            dialog.showMessageBoxSync({
                                type: 'warning',
                                title: 'Failed entries',
                                message: 'Something wrong happened :('
                            });
                        }
                    }
                }
            },
        },
        {
            label:'Clear database',
            click()
            {
                const options = {
                    type: 'question',
                    buttons: ['Cancel', 'Yes, please', 'No, thanks'],
                    defaultId: 2,
                    title: 'Clear database',
                    message: 'Are you sure you want to clear all the data?',
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
                            message: 'Clear Database',
                            type: 'info',
                            icon: appConfig.iconpath,
                            detail: '\nAll cleared!'
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
            label: 'Reload',
            accelerator: 'CommandOrControl+R',
            click()
            {
                BrowserWindow.getFocusedWindow().reload();
            }
        },
        {
            label: 'Toggle Developer Tools',
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
            label: 'TTL GitHub',
            click()
            {
                shell.openExternal('https://github.com/thamara/time-to-leave');
            }
        },
        {
            label: 'Check for updates',
            click()
            {
                checkForUpdates(/*showUpToDateDialog=*/true);
            }
        },
        {
            label: 'Send feedback',
            click()
            {
                shell.openExternal('https://github.com/thamara/time-to-leave/issues/new');
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'About',
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
                        buttons: ['Copy', 'OK'],
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