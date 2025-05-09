'use strict';

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;

/**
 * Opens an electron dialog based on the options, and returns a promise that resolves with the response.
 * @param {Object.<string, any>} options
 * @return {Promise}
 */
function showDialog(options)
{
    const focusedWindow = BrowserWindow.getFocusedWindow();
    options['title'] = options['title'] || 'Time to Leave';
    // Avoid Windows trying to guess how to best show buttons and show a mix of them
    options['noLink'] = true;
    return dialog.showMessageBox(focusedWindow || null, options);
}

/**
 * Opens an electron dialog based on the options, and blocks execution until closed.
 * @param {Object.<string, any>} options
 * @return {Integer}
 */
function showDialogSync(options)
{
    options['title'] = options['title'] || 'Time to Leave';
    // Avoid Windows trying to guess how to best show buttons and show a mix of them
    options['noLink'] = true;
    return dialog.showMessageBoxSync(BrowserWindow.getFocusedWindow(), options);
}

module.exports = {
    showDialogSync,
    showDialog,
};
