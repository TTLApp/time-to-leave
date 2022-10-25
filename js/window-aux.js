'use strict';

const electron = require('electron');
const BrowserWindow = (electron || electron.remote).BrowserWindow;
const dialog = (electron || electron.remote).dialog;

/**
 * Opens an electron dialog, based on the options, and performs the successCallback after promise is resolved.
 * @param {Object.<string, any>} options
 * @param {function} successCallback
 */
function showDialog(options, successCallback)
{
    options['title'] = options['title'] || 'Time to Leave';
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options)
        .then(successCallback)
        .catch(err =>
        {
            console.log(err);
        });
}

/**
 * Opens an electron dialog, based on the options, and returns the promise.
 * @param {Object.<string, any>} options
 * @return {Promise}
 */
function showDialogSync(options)
{
    options['title'] = options['title'] || 'Time to Leave';
    return dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options)
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
    showDialog,
    showDialogSync
};
