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
});

module.exports = {
    getSavedPreferences,
    setAlreadyAskedForFlexibleDbMigration,
    getAlreadyAskedForFlexibleDbMigration
};