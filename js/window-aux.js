'use strict';

const { remote } = require('electron');
const { BrowserWindow, dialog } = remote;

/**
 * Binds to the JS "window" the shortcut CTRL+SHIFT+I to toggle Chrome Dev Tools.
 * @param {Window} window
 */
function bindDevToolsShortcut(window) {
    window.addEventListener('keyup', (event) => {
        if (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 105)) { // 'i' or 'I'
            BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
            event.preventDefault();
            return false;
        }
    }, true);
}

/**
 * Opens an electron dialog, based on the options, and performs the successCallback after promise is resolved.
 * @param {Object.<string, any>} options
 * @param {function} successCallback
 */
function showDialog(options, successCallback) {
    options['title'] = options['title'] || 'Time to Leave';
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options).then(successCallback);
}

/**
 * Opens an electron dialog just like a JS alert().
 * @param {string} message
 */
function showAlert(message) {
    let options = {
        'title': 'Time to Leave',
        'message': message
    };
    dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
}

module.exports = {
    bindDevToolsShortcut,
    showAlert,
    showDialog
};