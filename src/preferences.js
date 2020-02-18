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

    $('input[type="time"], input[type="number"]').change(function() {
        preferences[this.name] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('#theme').change(function() {
        preferences['theme'] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
        applyTheme(this.value);
    });

    $('#notification').change(function() {
        $('#repetition, #notifications-interval').prop('disabled', !$('#notification').is(':checked'));    
        $('#repetition').prop('checked', $('#notification').is(':checked') && usersStyles['repetition']);
        $('#repetitions-number').prop('disabled', !$('#repetition').is(':checked'));
    });

    $('#repetition').change(function() {
        $('#repetitions-number').prop('disabled', !$('#repetition').is(':checked'));
    });

    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];
        if (inputs[i].type === 'checkbox') {
            if (input.name in usersStyles) {
                input.checked = usersStyles[input.name];
            }
            preferences[input.name] = input.checked;
        } else if (inputs[i].type === 'time' || inputs[i].type === 'number') {
            if (input.name in usersStyles) {
                input.value = usersStyles[input.name];
            }
            preferences[input.name] = input.value;
        }
    }

    $(document).ready(function() {
        $('#repetition, #notifications-interval').prop('disabled', !$('#notification').is(':checked'));    
        $('#repetition').prop('checked', $('#notification').is(':checked') && usersStyles['repetition']);
        $('#repetitions-number').prop('disabled', !$('#repetition').is(':checked'));
    });
});
