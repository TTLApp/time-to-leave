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
    return JSON.parse(preferences || '{}');
}

function getWaiverStoreContents()
{
    return ipcRenderer.invoke(IpcConstants.GetWaiverStoreContents);
}

function notifyWindowReadyToShow()
{
    ipcRenderer.send(IpcConstants.WindowReadyToShow);
}

function showDialog(dialogOptions)
{
    return ipcRenderer.invoke(IpcConstants.ShowDialog, dialogOptions);
}

function sendLeaveBy(leaveByValue)
{
    return ipcRenderer.send(IpcConstants.ReceiveLeaveBy, leaveByValue);
}

const rendererApi = {
    getLanguageDataPromise,
    getOriginalUserPreferences,
    getWaiverStoreContents,
    notifyWindowReadyToShow,
    showDay,
    showDialog,
    sendLeaveBy
};

export {
    rendererApi
};
