const electron = require('electron');
const path = require('path');
const fs = require('fs');
const { validateTime } = require('./time-math.js');
const { isValidTheme } = require('./themes.js');

const defaultPreferences = {
    'count-today': false,
    'close-to-tray': true,
    'hide-non-working-days': false,
    'hours-per-day': '08:00',
    'notification': true,
    'repetition': true,
    'notifications-interval': '5',
    'start-at-login': false,
    'theme': 'light',
    'update-remind-me-after' : '2019-01-01',
    'working-days-monday': true,
    'working-days-tuesday': true,
    'working-days-wednesday': true,
    'working-days-thursday': true,
    'working-days-friday': true,
    'working-days-saturday': false,
    'working-days-sunday': false,
    'view': 'month'
};

/*
 * Returns the preference file path, considering the userData path
 */
function getPreferencesFilePath() {
    let userDataPath = (electron.app || electron.remote.app).getPath('userData');
    return path.join(userDataPath, 'preferences.json');
}

/*
 * Saves preferences to file, returns an error on failure.
 */
function savePreferences(preferencesOptions) {
    try {
        fs.writeFileSync(getPreferencesFilePath(), JSON.stringify(preferencesOptions));
    } catch (err) {
        return new Error(err);
    }
    return true;
}

/**
 * Loads preference from file.
 * @return {Object}
 */
function readPreferences() {
    var preferences;
    try {
        preferences = JSON.parse(fs.readFileSync(getPreferencesFilePath()));
    } catch (err) {
        preferences = {};
    }
    return preferences ? preferences : {};
}

function getDerivedPrefsFromLoadedPrefs(loadedPreferences) {
    var derivedPreferences = {};
    Object.keys(defaultPreferences).forEach(function(key) {
        derivedPreferences[key] = (typeof loadedPreferences[key] !== 'undefined') ? loadedPreferences[key] : defaultPreferences[key];
    });

    return derivedPreferences;
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
    for (var key of derivedPrefsKeys) {
        var value = derivedPrefs[key];
        switch (key) {
        // Handle Time Inputs
        case 'notifications-interval':
            if (isNaN(Number(value)) || value < 1 || value > 30) {
                derivedPrefs[key] = defaultPreferences[key];
                shouldSaveDerivedPrefs = true;
            }
            break;
        case 'hours-per-day': {
            if (!validateTime(value)) {
                derivedPrefs[key] = defaultPreferences[key];
                shouldSaveDerivedPrefs = true;
            }
            break;
        }
        // Handle Boolean Inputs
        case 'count-today':
        case 'close-to-tray':
        case 'hide-non-working-days':
        case 'notification':
        case 'repetition':
        case 'start-at-login':
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
        // Handle Enum Inputs
        case 'theme':
            shouldSaveDerivedPrefs |= !isValidTheme(value);
            break;
        case 'view':
            shouldSaveDerivedPrefs |= !(value === 'month' || value === 'day');
            break;
        }
    }

    if (shouldSaveDerivedPrefs) {
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
function showWeekDay(weekDay, preferences = undefined) {
    if (preferences === undefined) {
        preferences = getLoadedOrDerivedUserPreferences();
    }
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
 * @note: The month should be 0-based (i.e.: 0 is Jan, 11 is Dec).
 */
function showDay(year, month, day, preferences = undefined)  {
    var currentDay = new Date(year, month, day), weekDay = currentDay.getDay();
    return showWeekDay(weekDay, preferences);
}

function switchCalendarView() {
    let preferences = getLoadedOrDerivedUserPreferences();
    if (preferences['view'] === 'month') {
        preferences['view'] = 'day';
    }
    else {
        preferences['view'] = 'month';
    }
    savePreferences(preferences);

    return preferences;
}

function getDefaultWidthHeight() {
    let preferences = getLoadedOrDerivedUserPreferences();
    if (preferences['view'] === 'month') {
        return { width: 1010, height: 800 };
    }
    else {
        return { width: 500, height: 500 };
    }
}

module.exports = {
    defaultPreferences,
    getDefaultWidthHeight,
    getUserPreferences: getLoadedOrDerivedUserPreferences,
    getPreferencesFilePath,
    savePreferences,
    showDay,
    switchCalendarView
};
