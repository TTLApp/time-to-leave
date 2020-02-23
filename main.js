const { app, BrowserWindow, dialog, ipcMain, Menu, net, shell, Tray } = require('electron');
const path = require('path');
const Store = require('electron-store');
const isOnline = require('is-online');
const { importDatabaseFromFile, exportDatabaseToFile } = require('./js/import-export.js');
const { notify } = require('./js/notification');
const { getDateStr } = require('./js/date-aux.js');
const { getUserPreferences, savePreferences } = require('./js/user-preferences.js');
const os = require('os');

let savedPreferences = null;
ipcMain.on('PREFERENCE_SAVE_DATA_NEEDED', (event, preferences) => {
    savedPreferences = preferences;
    app.setLoginItemSettings({
        openAtLogin: preferences['start-at-login']
    });
});

ipcMain.on('SET_WAIVER_DAY', (event, waiverDay) => {
    global.waiverDay = waiverDay;
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let tray;
const store = new Store();
const waivedWorkdays = new Store({name: 'waived-workdays'});
const macOS = process.platform === 'darwin';
var iconpath = path.join(__dirname, macOS ? 'assets/timer.png' : 'assets/timer.ico');
var trayIcon = path.join(__dirname, macOS ? 'assets/timer-16-Template.png' : 'assets/timer-grey.ico');
var contextMenu;
var launchDate = new Date();

// Logic for recommending user to punch in when they've been idle for too long
var recommendPunchIn = false;
setTimeout(() => { recommendPunchIn = true; }, 30 * 60 * 1000);

function checkIdleAndNotify() {
    if (recommendPunchIn) {
        recommendPunchIn = false;
        notify('Don\'t forget to punch in!');
    }
}

function shouldcheckForUpdates() {
    var lastChecked = store.get('update-remind-me-after');
    var today = new Date(),
        todayDate = getDateStr(today);
    return !lastChecked || todayDate > lastChecked;
}

async function checkForUpdates(showUpToDateDialog) {
    var online = await isOnline();
    if (!online) {
        return;
    }

    const request = net.request('https://api.github.com/repos/thamara/time-to-leave/releases/latest');
    request.on('response', (response) => {
        response.on('data', (chunk) => {
            var result = `${chunk}`;
            var re = new RegExp('.*(tag_name).*');
            var matches = result.matchAll(re);
            for (const match of matches) {
                var res = match[0].replace(/.*v.(\d+\.\d+\.\d+).*/g, '$1');
                if (app.getVersion() < res) {
                    const options = {
                        type: 'question',
                        buttons: ['Dismiss', 'Download latest version', 'Remind me later'],
                        defaultId: 1,
                        title: 'TTL Check for updates',
                        message: 'You are using an old version of TTL and is missing out on a lot of new cool things!',
                    };
                    let response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                    if (response === 1) {
                        //Download latest version
                        shell.openExternal('https://github.com/thamara/time-to-leave/releases/latest');
                    } else if (response === 2) {
                        // Remind me later
                        var today = new Date(),
                            todayDate = getDateStr(today);
                        store.set('update-remind-me-after', todayDate);
                    }
                } else if (showUpToDateDialog)
                    {
                    const options = {
                        type: 'info',
                        buttons: ['OK'],
                        title: 'TTL Check for updates',
                        message: 'Your TTL is up to date.'
                    };
                    dialog.showMessageBox(null, options);
                }
            }
        });
    });
    request.end();
}

function refreshOnDayChange() {
    var today = new Date();
    if (today > launchDate)
    {
        launchDate = today;
        // Reload only the calendar itself to avoid a flash
        win.webContents.executeJavaScript('calendar.redraw()');
    }
}

function createWindow() {
    // Create the browser window.
    var menu = Menu.buildFromTemplate([
        {
            label: 'Menu',
            submenu: [
                {
                    label: 'Workday Waiver Manager',
                    id: 'workday-waiver-manager',
                    click(item, window, event) {
                        if (event) {
                            const today = new Date();
                            global.waiverDay = getDateStr(today);
                        }
                        const htmlPath = path.join('file://', __dirname, 'src/workday-waiver.html');
                        let waiverWindow = new BrowserWindow({ width: 600,
                            height: 500,
                            parent: win,
                            resizable: true,
                            icon: iconpath,
                            webPreferences: {
                                nodeIntegration: true
                            } });
                        waiverWindow.setMenu(null);
                        waiverWindow.loadURL(htmlPath);
                        waiverWindow.show();
                        waiverWindow.on('close', function() {
                            waiverWindow = null;
                            // Reload only the calendar itself to avoid a flash
                            win.webContents.executeJavaScript('calendar.redraw()');
                        });
                    },
                },
                {type: 'separator'},
                {
                    label:'Exit',
                    accelerator: macOS ? 'CommandOrControl+Q' : 'Control+Q',
                    click() {
                        app.isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
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
                    accelerator: macOS ? 'Command+,' : 'Control+,',
                    click() {
                        const htmlPath = path.join('file://', __dirname, 'src/preferences.html');
                        let prefWindow = new BrowserWindow({ width: 400,
                            height: 440,
                            parent: win,
                            resizable: true,
                            icon: iconpath,
                            webPreferences: {
                                nodeIntegration: true
                            } });
                        prefWindow.setMenu(null);
                        prefWindow.loadURL(htmlPath);
                        prefWindow.show();
                        //prefWindow.webContents.openDevTools()
                        prefWindow.on('close', function() {
                            prefWindow = null;
                            savePreferences(savedPreferences);
                            win.webContents.send('PREFERENCE_SAVED', savedPreferences);
                        });
                    },
                },
                {type: 'separator'},
                {
                    label: 'Export database',
                    click() {
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
                        if (response) {
                            exportDatabaseToFile(response);
                            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                                {
                                    title: 'Time to Leave',
                                    message: 'Database export',
                                    type: 'info',
                                    icon: iconpath,
                                    detail: '\Okay, database was exported.'
                                });
                        }
                    },
                },
                {
                    label: 'Import database',
                    click() {
                        var options = {
                            title: 'Import DB from file',
                            buttonLabel : 'Import',

                            filters : [
                              {name: '.ttldb', extensions: ['ttldb',]},
                              {name: 'All Files', extensions: ['*']}
                            ]
                        };
                        let response = dialog.showOpenDialogSync(options);
                        if (response) {
                            const options = {
                                type: 'question',
                                buttons: ['Yes, please', 'No, thanks'],
                                defaultId: 2,
                                title: 'Import database',
                                message: 'Are you sure you want to import a database? It will override any current information.',
                            };

                            let confirmation = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                            if (confirmation === /*Yes*/0) {
                                if (importDatabaseFromFile(response)) {
                                    dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                                        {
                                            title: 'Time to Leave',
                                            message: 'Database imported',
                                            type: 'info',
                                            icon: iconpath,
                                            detail: '\Yay! Import successful!'
                                        });
                                }
                                // Reload only the calendar itself to avoid a flash
                                win.webContents.executeJavaScript('calendar.redraw()');
                                dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                                    {
                                        title: 'Time to Leave',
                                        message: 'Database imported',
                                        type: 'info',
                                        icon: iconpath,
                                        detail: '\Yay! Import successful!'
                                    }
                                );
                            }
                        }
                    },
                },
                {
                    label:'Clear database',
                    click() {
                        const options = {
                            type: 'question',
                            buttons: ['Cancel', 'Yes, please', 'No, thanks'],
                            defaultId: 2,
                            title: 'Clear database',
                            message: 'Are you sure you want to clear all the data?',
                        };

                        let response = dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
                        if (response === 1) {
                            store.clear();
                            waivedWorkdays.clear();
                            // Reload only the calendar itself to avoid a flash
                            win.webContents.executeJavaScript('calendar.redraw()');
                            dialog.showMessageBox(BrowserWindow.getFocusedWindow(),
                                {
                                    title: 'Time to Leave',
                                    message: 'Clear Database',
                                    type: 'info',
                                    icon: iconpath,
                                    detail: '\nAll cleared!'
                                });
                        }
                    }
                },
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CommandOrControl+R',
                    click() {
                        BrowserWindow.getFocusedWindow().reload();
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: macOS ? 'Command+Alt+I' : 'Control+Shift+I',
                    click() {
                        BrowserWindow.getFocusedWindow().toggleDevTools();
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'TTL GitHub',
                    click() {
                        shell.openExternal('https://github.com/thamara/time-to-leave');
                    }
                },
                {
                    label: 'Check for updates',
                    click() {
                        checkForUpdates(/*showUpToDateDialog=*/true);
                    }
                },
                {
                    label: 'Send feedback',
                    click() {
                        shell.openExternal('https://github.com/thamara/time-to-leave/issues/new');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'About',
                    click() {
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
                                icon: iconpath,
                                detail: `\n${detail}`
                            });
                    }
                }
            ]
        }
    ]);

    win = new BrowserWindow({
        width: 1000,
        height: 1000,
        useContentSize: true,
        zoomToPageWidth: true, //MacOS only
        icon: iconpath,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });


    Menu.setApplicationMenu(menu);

    const dockMenu = Menu.buildFromTemplate([
        {
            label: 'Punch time', click: function() {
                var now = new Date();

                win.webContents.executeJavaScript('punchDate()');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                notify(`Punched time ${now.toTimeString().slice(0,5)}`);
            }
        }
    ]);

    if (macOS) {
        // Use the macOS dock if we've got it
        app.dock.setMenu(dockMenu);
        win.maximize();
    } else {
        win.setMenu(menu);
    }
    // Prevents flickering from maximize
    win.show();

    // and load the index.html of the app.
    win.loadFile(path.join(__dirname, 'index.html'));

    tray = new Tray(trayIcon);
    var contextMenuTemplate = [
        {
            label: 'Punch time', click: function() {
                var now = new Date();

                win.webContents.executeJavaScript('punchDate()');
                // Slice keeps "HH:MM" part of "HH:MM:SS GMT+HHMM (GMT+HH:MM)" time string
                notify(`Punched time ${now.toTimeString().slice(0,5)}`);
            }
        },
        {
            label: 'Show App', click: function() {
                win.show();
            }
        },
        {
            label: 'Quit', click: function() {
                app.isQuitting = true;
                win = null;
                app.quit();
            }
        }
    ];

    ipcMain.on('TOGGLE_TRAY_PUNCH_TIME', function(_event, arg) {
        contextMenuTemplate[0].enabled = arg;
        contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
    });

    tray.on('click', function handleCliked() {
        win.show();
    });

    tray.on('right-click', function handleCliked() {
        tray.popUpContextMenu(contextMenu);
    });

    // Open the DevTools.
    //win.webContents.openDevTools();

    win.on('minimize',function(event) {
        event.preventDefault();
        win.hide();
    });

    // Emitted when the window is closed.
    win.on('close', function(event) {
        savedPreferences = getUserPreferences();
        if (!app.isQuitting && savedPreferences['close-to-tray']) {
            event.preventDefault();
            win.hide();
        }
    });

    if (shouldcheckForUpdates()) {
        checkForUpdates(/*showUpToDateDialog=*/false);
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
    // Check first to see if the app is aleady running,
    // fail out gracefully if so.
if (!app.requestSingleInstanceLock()) {
    app.exit(0);
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (win) {
            if (win.isMinimized()) {
                win.restore();
            }
            win.focus();
        } });
}

app.on('ready', () => {
    createWindow();
    setInterval(refreshOnDayChange, 60 * 60 * 1000);
    const { powerMonitor } = require('electron');
    powerMonitor.on('unlock-screen', () => { checkIdleAndNotify(); });
    powerMonitor.on('resume', () => { checkIdleAndNotify(); });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.isQuitting = true;
    app.quit();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    } else {
        win.show();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
try {
    require('electron-reloader')(module);
} catch (_) {
    // eslint-disable-next-line no-empty
    // We don't need to do anything in this block.
}
