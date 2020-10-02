'use strict';

const { ipcRenderer } = require('electron');

const { getUserPreferences } = require('../js/user-preferences.js');
const { applyTheme } = require('../js/themes.js');
const { bindDevToolsShortcut } = require('../js/window-aux.js');

// Global values for preferences page
let usersStyles = getUserPreferences();
let preferences = usersStyles;

function limitCalendarViews(preferences) {
    const isFlexibleCalendar = preferences['number-of-entries'] === 'flexible';
    $('#view option[value="day"]').prop('disabled', isFlexibleCalendar);
    if (isFlexibleCalendar) {
        $('#view').val('month');
        preferences['view'] = 'month';
    }
}

$(() => {
    // Theme-handling should be towards the top. Applies theme early so it's more natural.
    let theme = 'theme';
    if (theme in usersStyles) {
        $('#' + theme).val(usersStyles[theme]);
    }
    let selectedThemeOption = $('#' + theme).children('option:selected').val();
    preferences[theme] = selectedThemeOption;
    $('html').attr('data-theme', selectedThemeOption);

    if ('view' in usersStyles) {
        $('#view').val(usersStyles['view']);
    }

    if ('number-of-entries' in usersStyles) {
        $('#number-of-entries').val(usersStyles['number-of-entries']);
    }

    $('input[type="checkbox"]').change(function() {
        preferences[this.name] = this.checked;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('#hours-per-day').change(function() {
        if (this.checkValidity() === true) {
            preferences[this.name] = this.value;
            ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
        }
    });

    $('input[type="number"], input[type="date"]').change(function() {
        preferences[this.name] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('#theme').change(function() {
        preferences['theme'] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
        applyTheme(this.value);
    });

    $('#view').change(function() {
        preferences['view'] = this.value;
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('#number-of-entries').change(function() {
        preferences['number-of-entries'] = this.value;
        limitCalendarViews(preferences);
        ipcRenderer.send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });

    $('input').each(function() {
        let input = $(this);
        let name = input.attr('name');
        if (input.attr('type') === 'checkbox') {
            if (name in usersStyles) {
                input.prop('checked', usersStyles[name]);
            }
            preferences[name] = input.prop('checked');
        } else if (['text', 'number', 'date'].indexOf(input.attr('type')) > -1) {
            if (name in usersStyles) {
                input.val(usersStyles[name]);
            }
            preferences[name] = input.val();
        }
    });

    limitCalendarViews(preferences);

    const notification = $('#notification');
    const repetition = $('#repetition');
    const notificationsInterval = $('#notifications-interval');

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

    bindDevToolsShortcut(window);
});
