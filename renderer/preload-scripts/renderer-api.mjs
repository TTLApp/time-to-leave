'use strict';

import { ipcRenderer } from 'electron';

import IpcConstants from '../../js/ipc-constants.mjs';
import { showDay } from '../../js/user-preferences.mjs';

function getLanguageDataPromise()
{
    return ipcRenderer.invoke(IpcConstants.GetLanguageData);
}

function getOriginalUserPreferences()
{
    const preferences = process.argv.filter((arg) => arg.startsWith('--preferences='))[0]?.split('=')?.[1];
    console.log(preferences);
    return JSON.parse(preferences || '{}');
}

function getWaiverStoreContents()
{
    return ipcRenderer.invoke(IpcConstants.GetWaiverStoreContents);
}

function showDialog(dialogOptions)
{
    return ipcRenderer.invoke(IpcConstants.ShowDialog, dialogOptions);
}

const rendererApi = {
    getLanguageDataPromise,
    getOriginalUserPreferences,
    getWaiverStoreContents,
    showDay,
    showDialog,
};

export {
    rendererApi
};
