const { ipcRenderer } = require('electron');
const { getUserPreferences } = require('../js/UserPreferences.js');
const { applyTheme } = require('../js/Themes.js');

// Global values for preferences page
let usersStyles =  getUserPreferences();
let preferences = {};

$(() => {
    // Theme-handling should be towards the top. Applies theme early so it's more natural.
    let theme = 'theme';
    if (theme in usersStyles) {
        $('#' + theme).val(usersStyles[theme]);
    }
    let selectedThemeOption = $('#' + theme).children('option:selected').val();
    preferences[theme] = selectedThemeOption;
    document.querySelector('html').setAttribute('data-theme', selectedThemeOption);

    var inputs = document.getElementsByTagName('input');

    $('input[type="checkbox"]').change(function() {
        preferences[this.name] = this.checked;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('input[type="time"]').change(function() {
        preferences[this.name] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('#notification').change(function() {
        preferences['notification'] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('#theme').change(function() {
        preferences['theme'] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
        applyTheme(this.value);
    });

    for(var i = 0 ; i < inputs.length; i++) {
        let input = inputs[i];
        if (inputs[i].type == 'checkbox') {
            if (input.name in usersStyles) {
                input.checked = usersStyles[input.name];
            }
            preferences[input.name] = input.checked;
        } else if (inputs[i].type == 'time') {
            if (input.name in usersStyles) {
                input.value = usersStyles[input.name];
            }
            preferences[input.name] = input.value;
        }
    }

    let notification = 'notification';
    if (notification in usersStyles) {
        $('#' + notification).val(usersStyles[notification]);
    }
    preferences[notification] = $('#' + notification).children('option:selected').val();
});