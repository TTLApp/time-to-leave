const _ = require('lodash');
const { BrowserWindow } = require('electron');
const debug = require('debug')('*');

module.exports = (options = {}) => {
    debug('creating main browser window');

    _.defaultsDeep(options, {
        width: 500,
        height: 500,
        webPreferences: {
            // needs opener window to have nodeIntegrationInSubFrames: true
            nodeIntegration: true
        }
    });

    let win = new BrowserWindow(options);

    // Emitted when the window is closed.
    win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
        debug('window on closed');
        win = null;
    });

    win.webContents.on('did-finish-load', () => {
        debug('webcontents finished loading, frame %o', win.frameName);
    // win.webContents.send('url', 'child.html')
    });

    return win;
};
