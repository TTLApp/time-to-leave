'use strict';
const i18n = require('../src/configs/i18next.config');


const { app, ipcMain } = require('electron');

let savedPreferences = null;
let alreadyAskedForFlexibleDbMigration = false;

function getSavedPreferences()
{
    return savedPreferences;
}

// Sets if TTL already asked for migration. True means it did.
function setAlreadyAskedForFlexibleDbMigration(opt)
{
    alreadyAskedForFlexibleDbMigration = opt;
}

function getAlreadyAskedForFlexibleDbMigration()
{
    return alreadyAskedForFlexibleDbMigration;
}

ipcMain.on('PREFERENCE_SAVE_DATA_NEEDED', (event, preferences) =>
{
    savedPreferences = preferences;
    app.setLoginItemSettings({
        openAtLogin: preferences['start-at-login']
    });
    i18n.changeLanguage(preferences.language, (err) =>
    {
        if (err) return console.log('something went wrong loading', err);
    });
});

module.exports = {
    getSavedPreferences,
    setAlreadyAskedForFlexibleDbMigration,
    getAlreadyAskedForFlexibleDbMigration
};