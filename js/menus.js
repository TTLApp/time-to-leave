'use strict';

import { app, BrowserWindow, clipboard, dialog, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';

const { checkForUpdates } = require('./update-manager');
const { getSavedPreferences } = require('./saved-preferences.js');
const {
    importDatabaseFromFile,
    exportDatabaseToFile
} = require('./import-export.js');
const { createNotification } = require('./notification');
const { getCurrentTranslation } = require('../src/configs/i18next.config');
let {
    openWaiverManagerWindow,
    prefWindow,
    getDialogCoordinates
} = require('./windows');

import { appConfig, getDetails } from './app-config.cjs';
import { savePreferences } from './user-preferences.js';
import { getCurrentDateTimeStr } from './date-aux.js';

// Centralized Constants for Menu Labels
const MenuConstants = {
    Labels: {
        WORKDAY_WAIVER_MANAGER: '$Menu.workday-waiver-manager',
        EXIT: '$Menu.exit',
        PUNCH_TIME: '$Menu.punch-time',
        SHOW_APP: '$Menu.show-app',
        QUIT: '$Menu.quit',
        CUT: '$Menu.cut',
        COPY: '$Menu.copy',
        PASTE: '$Menu.paste',
        SELECT_ALL: '$Menu.select-all',
        PREFERENCES: '$Menu.preferences',
        EXPORT_DATABASE: '$Menu.export-database',
        IMPORT_DATABASE: '$Menu.import-database',
        CLEAR_DATABASE: '$Menu.clear-database',
        RELOAD: '$Menu.reload',
        TOGGLE_DEV_TOOLS: '$Menu.toggle-dev-tools',
        CHECK_FOR_UPDATES: '$Menu.check-for-updates',
        SEND_FEEDBACK: '$Menu.send-feedback',
        ABOUT: '$Menu.about',
        TTL_GITHUB: '$Menu.ttl-github',
        DATABASE_WAS_EXPORTED: '$Menu.database-was-exported',
        DATABASE_IMPORTED: '$Menu.import-successful',
        SOMETHING_WENT_WRONG: '$Menu.something-went-wrong',
        FAILED_ENTRIES: '$Menu.failed-entries',
        ALL_CLEAR: '$Menu.all-clear',
        CONFIRM_CLEAR_ALL_DATA: '$Menu.confirm-clear-all-data',
        CONFIRM_IMPORT_DATABASE: '$Menu.confirm-import-db',
        YES: '$Menu.yes-please',
        NO: '$Menu.no-thanks',
        ALL_FILES: '$Menu.all-files'
    }
};

function getMainMenuTemplate(mainWindow) {
    return [
        {
            label: getCurrentTranslation(MenuConstants.Labels.WORKDAY_WAIVER_MANAGER),
            id: 'workday-waiver-manager',
            click(item, window, event) {
                openWaiverManagerWindow(mainWindow, event);
            }
        },
        { type: 'separator' },
        {
            label: getCurrentTranslation(MenuConstants.Labels.EXIT),
            accelerator: appConfig.macOS ? 'CommandOrControl+Q' : 'Control+Q',
            click() {
                app.quit();
            }
        }
    ];
}

function getContextMenuTemplate(mainWindow) {
    return [
        {
            label: getCurrentTranslation(MenuConstants.Labels.PUNCH_TIME),
            click: function () {
                const now = new Date();

                mainWindow.webContents.send('PUNCH_DATE');
                createNotification(
                    `${getCurrentTranslation(MenuConstants.Labels.PUNCH_TIME)} ${now.toTimeString().slice(0, 5)}`
                ).show();
            }
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.SHOW_APP),
            click: function () {
                mainWindow.show();
            }
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.QUIT),
            click: function () {
                app.quit();
            }
        }
    ];
}

function getDockMenuTemplate(mainWindow) {
    return [
        {
            label: getCurrentTranslation(MenuConstants.Labels.PUNCH_TIME),
            click: function () {
                const now = new Date();

                mainWindow.webContents.send('PUNCH_DATE');
                createNotification(
                    `${getCurrentTranslation(MenuConstants.Labels.PUNCH_TIME)} ${now.toTimeString().slice(0, 5)}`
                ).show();
            }
        }
    ];
}

function getEditMenuTemplate(mainWindow) {
    return [
        {
            label: getCurrentTranslation(MenuConstants.Labels.CUT),
            accelerator: 'Command+X',
            selector: 'cut:'
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.COPY),
            accelerator: 'Command+C',
            selector: 'copy:'
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.PASTE),
            accelerator: 'Command+V',
            selector: 'paste:'
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.SELECT_ALL),
            accelerator: 'Command+A',
            selector: 'selectAll:'
        },
        { type: 'separator' },
        {
            label: getCurrentTranslation(MenuConstants.Labels.PREFERENCES),
            accelerator: appConfig.macOS ? 'Command+,' : 'Control+,',
            click() {
                if (prefWindow !== null) {
                    prefWindow.show();
                    return;
                }

                const htmlPath = path.join(
                    'file://',
                    __dirname,
                    '../src/preferences.html'
                );
                const dialogCoordinates = getDialogCoordinates(500, 620, mainWindow);
                prefWindow = new BrowserWindow({
                    width: 550,
                    height: 620,
                    minWidth: 480,
                    x: dialogCoordinates.x,
                    y: dialogCoordinates.y,
                    parent: mainWindow,
                    resizable: true,
                    icon: appConfig.iconpath,
                    webPreferences: {
                        nodeIntegration: true,
                        preload: path.join(
                            __dirname,
                            '../renderer/preload-scripts/preferences-bridge.js'
                        ),
                        contextIsolation: true
                    }
                });
                prefWindow.setMenu(null);
                prefWindow.loadURL(htmlPath);
                prefWindow.show();
                prefWindow.on('close', function () {
                    prefWindow = null;
                    const savedPreferences = getSavedPreferences();
                    if (savedPreferences !== null) {
                        savePreferences(savedPreferences);
                        mainWindow.webContents.send('PREFERENCES_SAVED', savedPreferences);
                    }
                });
                prefWindow.webContents.on('before-input-event', (event, input) => {
                    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
                        BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
                    }
                });
            }
        },
        { type: 'separator' },
        {
            label: getCurrentTranslation(MenuConstants.Labels.EXPORT_DATABASE),
            click() {
                const options = {
                    title: getCurrentTranslation(MenuConstants.Labels.EXPORT_DATABASE),
                    defaultPath: `time_to_leave_${getCurrentDateTimeStr()}`,
                    buttonLabel: getCurrentTranslation(MenuConstants.Labels.EXPORT_DATABASE),
                    filters: [
                        { name: '.ttldb', extensions: ['ttldb'] },
                        {
                            name: getCurrentTranslation(MenuConstants.Labels.ALL_FILES),
                            extensions: ['*']
                        }
                    ]
                };
                const response = dialog.showSaveDialogSync(options);
                if (response) {
                    exportDatabaseToFile(response);
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                        title: 'Time to Leave',
                        message: getCurrentTranslation(MenuConstants.Labels.DATABASE_WAS_EXPORTED),
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: getCurrentTranslation(MenuConstants.Labels.DATABASE_WAS_EXPORTED)
                    });
                }
            }
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.IMPORT_DATABASE),
            click() {
                const options = {
                    title: getCurrentTranslation(MenuConstants.Labels.IMPORT_DATABASE),
                    buttonLabel: getCurrentTranslation(MenuConstants.Labels.IMPORT_DATABASE),

                    filters: [
                        { name: '.ttldb', extensions: ['ttldb'] },
                        {
                            name: getCurrentTranslation(MenuConstants.Labels.ALL_FILES),
                            extensions: ['*']
                        }
                    ]
                };
                const response = dialog.showOpenDialogSync(options);
                if (response) {
                    const options = {
                        type: 'question',
                        buttons: [
                            getCurrentTranslation(MenuConstants.Labels.YES),
                            getCurrentTranslation(MenuConstants.Labels.NO)
                        ],
                        defaultId: 2,
                        title: getCurrentTranslation(MenuConstants.Labels.IMPORT_DATABASE),
                        message: getCurrentTranslation(MenuConstants.Labels.CONFIRM_IMPORT_DATABASE)
                    };

                    const confirmation = dialog.showMessageBoxSync(
                        BrowserWindow.getFocusedWindow(),
                        options
                    );
                    if (confirmation === /*Yes*/ 0) {
                        const importResult = importDatabaseFromFile(response);
                        mainWindow.webContents.send('RELOAD_CALENDAR');
                        if (importResult['result']) {
                            dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                                title: 'Time to Leave',
                                message: getCurrentTranslation(MenuConstants.Labels.DATABASE_IMPORTED),
                                type: 'info',
                                icon: appConfig.iconpath,
                                detail: getCurrentTranslation(MenuConstants.Labels.DATABASE_IMPORTED)
                            });
                        } else if (importResult['failed'] !== 0) {
                            const message = `${importResult['failed']}/${importResult['total']} ${getCurrentTranslation(
                                MenuConstants.Labels.FAILED_ENTRIES
                            )}`;
                            dialog.showMessageBoxSync({
                                icon: appConfig.iconpath,
                                type: 'warning',
                                title: getCurrentTranslation(MenuConstants.Labels.FAILED_ENTRIES),
                                message: message
                            });
                        } else {
                            dialog.showMessageBoxSync({
                                icon: appConfig.iconpath,
                                type: 'warning',
                                title: getCurrentTranslation(MenuConstants.Labels.FAILED_ENTRIES),
                                message: getCurrentTranslation(MenuConstants.Labels.SOMETHING_WENT_WRONG)
                            });
                        }
                    }
                }
            }
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.CLEAR_DATABASE),
            click() {
                const options = {
                    type: 'question',
                    buttons: [
                        getCurrentTranslation(MenuConstants.Labels.NO),
                        getCurrentTranslation(MenuConstants.Labels.YES)
                    ],
                    defaultId: 2,
                    title: getCurrentTranslation(MenuConstants.Labels.CLEAR_DATABASE),
                    message: getCurrentTranslation(MenuConstants.Labels.CONFIRM_CLEAR_ALL_DATA)
                };

                const response = dialog.showMessageBoxSync(
                    BrowserWindow.getFocusedWindow(),
                    options
                );
                if (response === 1) {
                    const store = new Store();
                    const waivedWorkdays = new Store({ name: 'waived-workdays' });
                    const flexibleStore = new Store({ name: 'flexible-store' });

                    store.clear();
                    waivedWorkdays.clear();
                    flexibleStore.clear();
                    mainWindow.webContents.send('RELOAD_CALENDAR');
                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                        title: 'Time to Leave',
                        message: getCurrentTranslation(MenuConstants.Labels.ALL_CLEAR),
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: `\n${getCurrentTranslation(MenuConstants.Labels.ALL_CLEAR)}`
                    });
                }
            }
        }
    ];
}

function getViewMenuTemplate() {
    return [
        {
            label: getCurrentTranslation(MenuConstants.Labels.RELOAD),
            accelerator: 'CommandOrControl+R',
            click() {
                BrowserWindow.getFocusedWindow().reload();
            }
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.TOGGLE_DEV_TOOLS),
            accelerator: appConfig.macOS ? 'Command+Alt+I' : 'Control+Shift+I',
            click() {
                BrowserWindow.getFocusedWindow().toggleDevTools();
            }
        }
    ];
}

function getHelpMenuTemplate() {
    return [
        {
            label: getCurrentTranslation(MenuConstants.Labels.TTL_GITHUB),
            click() {
                shell.openExternal('https://github.com/thamara/time-to-leave');
            }
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.CHECK_FOR_UPDATES),
            click() {
                checkForUpdates(/*showUpToDateDialog=*/ true);
            }
        },
        {
            label: getCurrentTranslation(MenuConstants.Labels.SEND_FEEDBACK),
            click() {
                shell.openExternal('https://github.com/thamara/time-to-leave/issues/new');
            }
        },
        { type: 'separator' },
        {
            label: getCurrentTranslation(MenuConstants.Labels.ABOUT),
            click() {
                const detail = getDetails();
                dialog
                    .showMessageBox(BrowserWindow.getFocusedWindow(), {
                        title: 'Time to Leave',
                        message: 'Time to Leave',
                        type: 'info',
                        icon: appConfig.iconpath,
                        detail: `\n${detail}`,
                        buttons: [
                            getCurrentTranslation(MenuConstants.Labels.YES),
                            getCurrentTranslation(MenuConstants.Labels.NO)
                        ],
                        noLink: true
                    })
                    .then(result => {
                        const buttonId = result.response;
                        if (buttonId === 0) {
                            clipboard.writeText(detail);
                        }
                    })
                    .catch(err => {
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
