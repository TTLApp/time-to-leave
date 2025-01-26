'use strict';

import { ipcRenderer } from 'electron';

function getLanguageDataPromise()
{
    return ipcRenderer.invoke('GET_LANGUAGE_DATA');
}

function getOriginalUserPreferences()
{
    const preferences = process.argv.filter((arg) => arg.startsWith('--preferences='))[0]?.split('=')?.[1];
    console.log(preferences);
    return JSON.parse(preferences || '{}');
}

function showDialogSync(dialogOptions)
{
    return ipcRenderer.invoke('SHOW_DIALOG', dialogOptions);
}

const rendererApi = {
    getLanguageDataPromise,
    getOriginalUserPreferences,
    showDialogSync,
};

export {
    rendererApi
};
