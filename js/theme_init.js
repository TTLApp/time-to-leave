'use strict';

const { applyTheme } = require('./js/Themes.js');

ipcRenderer.on('PREFERENCE_SAVED', function (event, inputs) {
    preferences = inputs;
    applyTheme(preferences.theme);
});

// On page load, apply the user's theme
$(() => {
    let prefs = getUserPreferences();
    applyTheme(prefs.theme);
});