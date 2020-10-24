'use strict';

const electron = require('electron');
const path = require('path');
const fs = require('fs');
const { validateTime } = require('./time-math.js');
const { isValidTheme } = require('./themes.js');
const i18n = require('../src/configs/i18next.config');

function isValidLocale(locale)
{
    return i18n.languages.includes(locale);
}

const defaultPreferences = {
    'count-today': false,
    'close-to-tray': true,
    'minimize-to-tray': true,
    'hide-non-working-days': false,
    'hours-per-day': '08:00',
    'notification': true,
    'repetition': true,
    'notifications-interval': '5',
    'start-at-login': false,
    'theme': 'system-default',
    'overall-balance-start-date': '2019-01-01',
    'update-remind-me-after': '2019-01-01',
    'working-days-monday': true,
    'working-days-tuesday': true,
    'working-days-wednesday': true,
    'working-days-thursday': true,
    'working-days-friday': true,
    'working-days-saturday': false,
    'working-days-sunday': false,
    'view': 'month',
    'number-of-entries': 'fixed',
    'language': 'en'
};

// Handle Boolean Inputs
const booleanInputs = [
    'count-today',
    'close-to-tray',
    'minimize-to-tray',
    'hide-non-working-days',
    'notification',
    'repetition',
    'start-at-login',
    'working-days-monday',
    'working-days-tuesday',
    'working-days-wednesday',
    'working-days-thursday',
    'working-days-friday',
    'working-days-saturday',
    'working-days-sunday',
];

const timeInputs = [
    'notifications-interval',
    'hours-per-day',
];

const isNotBoolean = (val) => typeof val !== 'boolean';
const isValidPreferenceTime = (val) => validateTime(val) || Number.isNaN(Number(val)) || val < 1 || val > 30;

/*
 * Returns the preference file path, considering the userData path
 */
function getPreferencesFilePath()
{
    let userDataPath = (electron.app || electron.remote.app).getPath('userData');
    return path.join(userDataPath, 'preferences.json');
}

/*
 * Saves preferences to file, returns an error on failure.
 */
function savePreferences(preferencesOptions)
{
    try
    {
        fs.writeFileSync(getPreferencesFilePath(), JSON.stringify(preferencesOptions));
    }
    catch (err)
    {
        return new Error(err);
    }
    return true;
}

/**
 * Loads preference from file.
 * @return {Object}
 */
function readPreferences()
{
    let preferences;
    try
    {
        preferences = JSON.parse(fs.readFileSync(getPreferencesFilePath()));
    }
    catch (err)
    {
        preferences = {};
    }
    return preferences ? preferences : {};
}

function getDerivedPrefsFromLoadedPrefs(loadedPreferences)
{
    let derivedPreferences = {};
    Object.keys(defaultPreferences).forEach(function(key)
    {
        derivedPreferences[key] = (typeof loadedPreferences[key] !== 'undefined') ? loadedPreferences[key] : defaultPreferences[key];
    });

    return derivedPreferences;
}

/*
 * initializes users preferences if it is not already exists
 * or any keys of existing preferences is invalid
 */
function initPreferencesFileIfNotExistsOrInvalid()
{
    if (!fs.existsSync(getPreferencesFilePath()))
    {
        savePreferences(defaultPreferences);
        return;
    }

    let shouldSaveDerivedPrefs = false,
        loadedPrefs = readPreferences(),
        derivedPrefs = getDerivedPrefsFromLoadedPrefs(loadedPrefs),
        loadedPref = Object.keys(loadedPrefs).sort(),
        derivedPrefsKeys = Object.keys(derivedPrefs).sort();

    // Validate keys
    if (JSON.stringify(loadedPref) !== JSON.stringify(derivedPrefsKeys))
    {
        shouldSaveDerivedPrefs = true;
    }

    // Validate the values
    for (const key of derivedPrefsKeys)
    {
        let value = derivedPrefs[key];

        if (isNotBoolean(value) && booleanInputs.includes(key))
        {
            derivedPrefs[key] = defaultPreferences[key];
            shouldSaveDerivedPrefs = true;
        }

        if (timeInputs.includes(key) && isValidPreferenceTime(value))
        {
            derivedPrefs[key] = defaultPreferences[key];
            shouldSaveDerivedPrefs = true;
        }

        const inputEnum = {
            'theme': () => shouldSaveDerivedPrefs |= !isValidTheme,
            'number-of-entries': () => shouldSaveDerivedPrefs |= !(value === 'fixed' || value === 'flexible'),
            'view': () => shouldSaveDerivedPrefs |= !(value === 'month' || value === 'day'),
            'language': () => shouldSaveDerivedPrefs |= isValidLocale
        };
        if (key in inputEnum) inputEnum[key]();
    }

    if (shouldSaveDerivedPrefs)
    {
        savePreferences(derivedPrefs);
    }

}

/**
 * Returns the user preferences.
 * @return {{string: any}} Associative array of user settings
 */
function getLoadedOrDerivedUserPreferences()
{
    initPreferencesFileIfNotExistsOrInvalid();
    return readPreferences();
}

/*
 * Returns true if the notification is enabled in preferences.
 */
function notificationIsEnabled()
{
    let preferences = getLoadedOrDerivedUserPreferences();
    return preferences['notification'];
}

/*
 * Returns true if we should display week day.
 */
function showWeekDay(weekDay, preferences = undefined)
{
    if (preferences === undefined)
    {
        preferences = getLoadedOrDerivedUserPreferences();
    }
    switch (weekDay)
    {
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
function showDay(year, month, day, preferences = undefined)
{
    let currentDay = new Date(year, month, day), weekDay = currentDay.getDay();
    return showWeekDay(weekDay, preferences);
}

function switchCalendarView()
{
    let preferences = getLoadedOrDerivedUserPreferences();
    if (preferences['view'] === 'month')
    {
        preferences['view'] = 'day';
    }
    else
    {
        preferences['view'] = 'month';
    }
    savePreferences(preferences);

    return preferences;
}

function getDefaultWidthHeight()
{
    let preferences = getLoadedOrDerivedUserPreferences();
    if (preferences['view'] === 'month')
    {
        return { width: 1010, height: 800 };
    }
    else
    {
        return { width: 500, height: 500 };
    }
}


/*
 * Returns the value of language in preferences.
 */
function getUserLanguage()
{
    let preferences = getLoadedOrDerivedUserPreferences();
    return preferences['language'];
}

/*
 * Returns the value of notification-interval in preferences.
 */
function getNotificationsInterval()
{
    let preferences = getLoadedOrDerivedUserPreferences();
    return preferences['notifications-interval'];
}

/*
 * Returns true if repetition is enabled in preferences.
 */
function repetitionIsEnabled()
{
    let preferences = getLoadedOrDerivedUserPreferences();
    return preferences['repetition'];
}

module.exports = {
    defaultPreferences,
    getDefaultWidthHeight,
    getUserPreferences: getLoadedOrDerivedUserPreferences,
    getUserLanguage,
    getNotificationsInterval,
    getPreferencesFilePath,
    savePreferences,
    showDay,
    switchCalendarView,
    isNotBoolean,
    isValidPreferenceTime,
    notificationIsEnabled,
    repetitionIsEnabled
};
