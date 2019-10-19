const { app, BrowserWindow, Menu, dialog, ipcMain, Tray } = require('electron');
const path = require('path');
const Store = require('electron-store');

const { savePreferences } = require('./js/UserPreferences.js');

let savedPreferences = null;
ipcMain.on('PREFERENCE_SAVE_DATA_NEEDED', (event, preferences) => {
    savedPreferences = preferences;
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let tray;
const store = new Store();
const macOS = process.platform === 'darwin';
var iconpath = path.join(__dirname, macOS ? 'assets/timer.png' : 'assets/timer.ico');
var trayIcon = path.join(__dirname, macOS ? 'assets/timer-16.png' : 'assets/timer.ico');

function createWindow () {
  // Create the browser window.
    var menu = Menu.buildFromTemplate([
        {
            label: 'Menu',
            submenu: [
                {
                    label: 'Preferences',
                    accelerator: macOS ? 'Command+,' : 'Control+,',
                    click () {
                        const htmlPath = path.join('file://', __dirname, 'src/preferences.html');
                        let prefWindow = new BrowserWindow({ width: 600, 
                            height: 450, 
                            parent: win,
                            resizable: false,
                            icon: iconpath,
                            webPreferences: {
                                nodeIntegration: true
                            } });
                        prefWindow.setMenu(null);
                        prefWindow.loadURL(htmlPath);
                        prefWindow.show();
                        //prefWindow.webContents.openDevTools()
                        prefWindow.on('close', function () {
                            prefWindow = null; 
                            savePreferences(savedPreferences);
                            win.webContents.send('PREFERENCE_SAVED', savedPreferences);
                        });
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
                  
                        dialog.showMessageBox(null, options, (response) => {
                            if (response == 1) {
                                store.clear();
                                win.reload();
                            }
                        });
                    } 
                },
                {type:'separator'}, 
                {
                    label:'Exit', 
                    accelerator: macOS ? 'CommandOrControl+Q' : 'Control+Q',
                    click() { 
                        app.isQuiting = true;
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
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CommandOrControl+R',
                    click () {
                        BrowserWindow.getFocusedWindow().reload();
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: macOS ? 'Command+Alt+I' : 'Control+Shift+I',
                    click () {
                        BrowserWindow.getFocusedWindow().toggleDevTools();
                    }
                }
            ]
        }
    ]);

    win = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: iconpath,
        webPreferences: {
            nodeIntegration: true
        }
    });

    if (macOS) {
        Menu.setApplicationMenu(menu);
    } else {
        win.setMenu(menu);
    }
    
    // and load the index.html of the app.
    win.loadFile(path.join(__dirname, 'index.html'));

    tray = new Tray(trayIcon);
    var contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App', click: function () {
                win.show();
            }
        },
        {
            label: 'Quit', click: function () {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.on('click', function handleCliked() {       
        win.show();
    });   

    tray.on('right-click', function handleCliked() {       
        tray.popUpContextMenu(contextMenu);
    });   

    // Open the DevTools.
    //win.webContents.openDevTools();

    win.on('minimize',function(event){
        event.preventDefault();
        win.hide();
    });

    // Emitted when the window is closed.
    win.on('closed', function (event) {
        if(app.isQuiting != undefined && !app.isQuiting){
            event.preventDefault();
            win.hide();
        } 
  
        return false;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.isQuiting = true;
    app.quit();
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.