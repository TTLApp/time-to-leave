const electron = require('electron');
const path = require('path');
const fs = require('fs');
const { validateTime } = require('../js/time_math.js');

const defaultPreferences = {
    'hide-non-working-days': false,
    'hours-per-day': '08:00',
    'notification': 'enabled',
    'working-days-monday': true,
    'working-days-tuesday': true,
    'working-days-wednesday': true,
    'working-days-thursday': true,
    'working-days-friday': true,
    'working-days-saturday': false,
    'working-days-sunday': false,
};

/*
 * Returns the preference file path, considering the userData path
 */
function getPreferencesFilePath() {
    let userDataPath = (electron.app || electron.remote.app).getPath('userData');
    return path.join(userDataPath, 'preferences.json');
}

/*
 * Saves preference to file.
 */
function savePreferences(preferencesOptions) {
    fs.writeFileSync(getPreferencesFilePath(), JSON.stringify(preferencesOptions));
}

/*
 * Loads preference from file.
 */
function readPreferences() {
    var preferences;
    try {
        preferences = JSON.parse(fs.readFileSync(getPreferencesFilePath()));
    } catch(err) {
        preferences = {};
    }
    return preferences ? preferences : {};
}

/*
 * Returns true if there's a valid preferences file.
 * Invalid files don't have all the settings listed.
 */
function hasValidPreferencesFile() {
    if (!fs.existsSync(getPreferencesFilePath())) {
        return false;
    }
    // Validate keys
    var prefs = readPreferences();
    var loadedPref = Object.keys(prefs).sort();
    var referencePref = Object.keys(defaultPreferences).sort();
    if (JSON.stringify(loadedPref) != JSON.stringify(referencePref)) {
        return false;
    }
    // Validate the values
    for(var key of Object.keys(prefs)) {
        var value = prefs[key];
        switch (key) {
        case 'hours-per-day': {
            if (!validateTime(value)) {
                return false;
            }
            break;
        }
        case 'notification': {
            if (value != 'enabled' && value != 'disabled') {
                return false;
            }
            break;
        }
        case 'working-days-monday': 
        case 'working-days-tuesday': 
        case 'working-days-wednesday': 
        case 'working-days-thursday': 
        case 'working-days-friday': 
        case 'working-days-saturday': 
        case 'working-days-sunday': {
            if (value != true && value != false) {
                return false;
            }
            break;
        }
        case 'hide-non-working-days': {
            if (value != true && value != false) {
                return false;
            }
            break;
        }
        }
    } 
    return true;
}

/*
 * Returns the user preferences.
 */
function getUserPreferences() {
    // Initialize preferences file if it doesn't exists or is invalid
    if (!hasValidPreferencesFile()) {
        savePreferences(defaultPreferences);
    }
    return readPreferences();
}

module.exports = {
    getUserPreferences,
    savePreferences
};