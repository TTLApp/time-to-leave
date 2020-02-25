const { ipcRenderer } = require('electron');
const { getUserPreferences } = require('../js/user-preferences.js');
const { applyTheme } = require('../js/themes.js');

// Global values for preferences page
let usersStyles =  getUserPreferences();
let preferences = usersStyles;

$(() => {
    // Theme-handling should be towards the top. Applies theme early so it's more natural.
    let theme = 'theme';
    if (theme in usersStyles) {
        $('#' + theme).val(usersStyles[theme]);
    }
    let selectedThemeOption = $('#' + theme).children('option:selected').val();
    preferences[theme] = selectedThemeOption;
    document.querySelector('html').setAttribute('data-theme', selectedThemeOption);

    let inputs = document.getElementsByTagName('input');

    $('input[type="checkbox"]').change(function() {
        preferences[this.name] = this.checked;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('input[type="time"]').change(function() {
        preferences[this.name] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('#theme').change(function() {
        preferences['theme'] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
        applyTheme(this.value);
    });


    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];
        if (inputs[i].type === 'checkbox') {
            if (input.name in usersStyles) {
                input.checked = usersStyles[input.name];
            }
            preferences[input.name] = input.checked;
        } else if (inputs[i].type === 'time') {
            if (input.name in usersStyles) {
                input.value = usersStyles[input.name];
            }
            preferences[input.name] = input.value;
        }
    }

    const notification = $(document.getElementById('notification'));
    const repetition = $(document.getElementById('repetition'));
    const notificationsInterval = $(document.getElementById('notifications-interval'));

    repetition.prop('disabled', !notification.is(':checked'));
    repetition.prop('checked', notification.is(':checked') && usersStyles['repetition']);
    notificationsInterval.prop('disabled', !repetition.is(':checked'));

    notification.change(function() {
        repetition.prop('disabled', !notification.is(':checked'));
        repetition.prop('checked', notification.is(':checked') && usersStyles['repetition']);
        notificationsInterval.prop('disabled', !repetition.is(':checked'));
    });

    repetition.change(function() {
        notificationsInterval.prop('disabled', !repetition.is(':checked'));
    });
});
