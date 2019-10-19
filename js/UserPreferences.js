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

var derivedPreferences;

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
 * Returns true if something is missing or invalid in preferences file
 */
function shouldSaveDerivedPreferencesFile() {
    if (!fs.existsSync(getPreferencesFilePath())) {
        return true;
    }

    var shouldSaveDerivedPref = false;

    // Validate keys
    var prefs = readPreferences();
    derivedPreferences = Object.assign(defaultPreferences, prefs);
    var loadedPref = Object.keys(prefs).sort();
    var derivedPrefKeys = Object.keys(derivedPreferences).sort();
    if (JSON.stringify(loadedPref) != JSON.stringify(derivedPrefKeys)) {
        shouldSaveDerivedPref = true;
    }
    // Validate the values
    for(var key of derivedPrefKeys) {
        var value = derivedPreferences[key];
        switch (key) {
        case 'hours-per-day': {
            if (!validateTime(value)) {
                derivedPreferences[key] = defaultPreferences[key];
                shouldSaveDerivedPref = true;
            }
            break;
        }
        case 'notification': {
            if (value != 'enabled' && value != 'disabled') {
                derivedPreferences[key] = defaultPreferences[key];
                shouldSaveDerivedPref = true;
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
                derivedPreferences[key] = defaultPreferences[key];
                shouldSaveDerivedPref = true;
            }
            break;
        }
        case 'hide-non-working-days': {
            if (value != true && value != false) {
                derivedPreferences[key] = defaultPreferences[key];
                shouldSaveDerivedPref = true;
            }
            break;
        }
        }
    } 
    return shouldSaveDerivedPref;
}

/*
 * Returns the user preferences.
 */
function getUserPreferences() {
    // Initialize preferences file if it doesn't exists or is invalid
    if (shouldSaveDerivedPreferencesFile()) {
        savePreferences(derivedPreferences || defaultPreferences);
    }
    return readPreferences();
}

module.exports = {
    getUserPreferences,
    savePreferences
};