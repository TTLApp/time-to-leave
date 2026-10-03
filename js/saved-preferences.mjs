'use strict';

import { app, ipcMain } from 'electron';
import { createRequire } from 'module';

import i18NextConfig from '../src/configs/i18next.config.mjs';
import IpcConstants from './ipc-constants.mjs';
import { savePreferences } from './user-preferences.mjs';

const require = createRequire(import.meta.url);
const WindowAux = require('./window-aux.cjs');

let savedPreferences = null;
let languageRestartDialogOpen = false;

function getSavedPreferences()
{
    return savedPreferences;
}

// Build a clean relaunch command while preserving the currently open windows.
function getRelaunchArguments(language)
{
    const args = process.argv.slice(1).filter((arg) =>
        !arg.startsWith('--lang=') &&
        arg !== '--reopen-preferences' &&
        arg !== '--reopen-waiver'
    );
    if (global.prefWindow !== null)
    {
        args.push('--reopen-preferences');
    }
    if (global.waiverWindow !== null)
    {
        args.push('--reopen-waiver');
    }
    return [...args, `--lang=${language}`];
}

// Ask whether the process should restart so Chromium picks up the new locale.
function confirmLanguageRestart()
{
    return WindowAux.showDialog({
        type: 'question',
        buttons: [
            i18NextConfig.getCurrentTranslation('$Menu.yes'),
            i18NextConfig.getCurrentTranslation('$Menu.no')
        ],
        defaultId: 0,
        cancelId: 1,
        title: i18NextConfig.getCurrentTranslation('$Preferences.language-change-title'),
        message: i18NextConfig.getCurrentTranslation('$Preferences.language-change-restart')
    }).then((result) => result.response === 0);
}

// Persist the selected language and restart while restoring open auxiliary windows.
function restartWithLanguage(preferences)
{
    savePreferences(preferences);
    app.relaunch({ args: getRelaunchArguments(preferences.language) });
    app.exit(0);
}

// Prevent duplicate prompts while the asynchronous confirmation dialog is open.
function handleLanguageRestart(preferences)
{
    if (preferences.language === app.commandLine.getSwitchValue('lang') || languageRestartDialogOpen)
    {
        return;
    }

    languageRestartDialogOpen = true;
    confirmLanguageRestart()
        .then((shouldRestart) =>
        {
            if (shouldRestart)
            {
                restartWithLanguage(preferences);
            }
        })
        .finally(() =>
        {
            languageRestartDialogOpen = false;
        });
}

ipcMain.on(IpcConstants.PreferenceSaveDataNeeded, (event, preferences) =>
{
    savedPreferences = preferences;
    app.setLoginItemSettings({
        openAtLogin: preferences['start-at-login']
    });
    i18NextConfig.changeLanguage(preferences.language).catch((err) =>
    {
        if (err) return console.log('something went wrong loading', err);
    });

    handleLanguageRestart(preferences);
});

export {
    confirmLanguageRestart,
    getRelaunchArguments,
    getSavedPreferences,
    handleLanguageRestart,
    restartWithLanguage,
};
