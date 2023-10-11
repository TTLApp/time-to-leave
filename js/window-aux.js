'use strict';

const electron = require('electron');
const BrowserWindow = (electron || electron.remote).BrowserWindow;
const dialog = (electron || electron.remote).dialog;

/**
 * Opens an electron dialog, based on the options, and returns the promise.
 * @param {Object.<string, any>} options
 * @return {Promise}
 */
function showDialogSync(options)
{
    options['title'] = options['title'] || 'Time to Leave';
    return dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options);
}

/**
 * Opens an electron dialog just like a JS alert().
 * @param {string} message
 */
function showAlert(message)
{
    const options = {
        'title': 'Time to Leave',
        'message': message
    };
    dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
}

export {
    showAlert,
    showDialogSync
};
