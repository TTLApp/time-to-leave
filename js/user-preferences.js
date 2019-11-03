const electron = require('electron');
const path = require('path');
const fs = require('fs');
const { validateTime } = require('./time-math.js');
const { isValidTheme } = require('./themes.js');

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
    'theme': 'light',
    'update-remind-me-after' : '2019-01-01',
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

/**
 * Loads preference from file.
 * @return {Object}
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

function getDerivedPrefsFromLoadedPrefs(loadedPreferences){
    var derivedPreferences = {};
    Object.keys(defaultPreferences).forEach(function(key){
        derivedPreferences[key] = loadedPreferences[key] || defaultPreferences[key];
    });

    return defaultPreferences;
}

/*
 * initializes users preferences if it is not already exists
 * or any keys of existing preferences is invalid
 */
function initPreferencesFileIfNotExistsOrInvalid() {
    if (!fs.existsSync(getPreferencesFilePath())) {
        savePreferences(defaultPreferences);
        return;
    }

    var shouldSaveDerivedPrefs = false,
        loadedPrefs = readPreferences(),
        derivedPrefs = getDerivedPrefsFromLoadedPrefs(loadedPrefs),
        loadedPref = Object.keys(loadedPrefs).sort(),
        derivedPrefsKeys = Object.keys(derivedPrefs).sort();

    // Validate keys
    if (JSON.stringify(loadedPref) !== JSON.stringify(derivedPrefsKeys)) {
        shouldSaveDerivedPrefs = true;
    }

    // Validate the values
    for(var key of derivedPrefsKeys) {
        var value = derivedPrefs[key];
        switch (key) {
        case 'hours-per-day': {
            if (!validateTime(value)) {
                derivedPrefs[key] = defaultPreferences[key];
                shouldSaveDerivedPrefs = true;
            }
            break;
        }
        case 'notification': {
            if (value !== 'enabled' && value !== 'disabled') {
                derivedPrefs[key] = defaultPreferences[key];
                shouldSaveDerivedPrefs = true;
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
            if (value !== true && value !== false) {
                derivedPrefs[key] = defaultPreferences[key];
                shouldSaveDerivedPrefs = true;
            }
            break;
        }
        case 'hide-non-working-days': {
            if (value !== true && value !== false) {
                derivedPrefs[key] = defaultPreferences[key];
                shouldSaveDerivedPrefs = true;
            }
            break;
        }
        case 'theme' : {
            shouldSaveDerivedPrefs |= !isValidTheme(value);
        }
        }
    }

    if(shouldSaveDerivedPrefs) {
        savePreferences(derivedPrefs);
    }
}

/**
 * Returns the user preferences.
 * @return {{string: any}} Associative array of user settings
 */
function getLoadedOrDerivedUserPreferences() {
    initPreferencesFileIfNotExistsOrInvalid();
    return readPreferences();
}

/*
 * Returns true if we should display week day.
 */
function showWeekDay(weekDay) {
    var preferences = getLoadedOrDerivedUserPreferences();
    switch (weekDay) {
    case 0: return preferences['working-days-sunday'];
    case 1: return preferences['working-days-monday'];
    case 2: return preferences['working-days-tuesday'];
    case 3: return preferences['working-days-wednesday'];
    case 4: return preferences['working-days-thursday'];
    case 5: return preferences['working-days-friday'];
    case 6: return preferences['working-days-saturday'];
    }
}

/*
 * Returns true if we should display day.
 */
function showDay(year, month, day)  {
    var currentDay = new Date(year, month, day), weekDay = currentDay.getDay();
    return showWeekDay(weekDay);
}

module.exports = {
    getUserPreferences: getLoadedOrDerivedUserPreferences,
    savePreferences,
    showDay
};
