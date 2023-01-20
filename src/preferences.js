'use strict';

import { applyTheme } from '../renderer/themes.js';
import { translatePage } from '../renderer/i18n-translator.js';

// Global values for preferences page
let usersStyles;
let preferences;

function populateLanguages()
{
    const languageOpts = $('#language');
    languageOpts.empty();
    $.each(window.mainApi.getLanguageMap(), (key, value) =>
    {
        languageOpts.append(
            $('<option />')
                .val(key)
                .text(value)
        );
    });
    // Select current display language
    /* istanbul ignore else */
    if ('language' in usersStyles)
    {
        $('#language').val(usersStyles['language']);
    }
}

function listenerLanguage()
{
    $('#language').on('change', function()
    {
        preferences['language'] = this.value;
        window.mainApi.changeLanguagePromise(this.value).then((languageData) =>
        {
            translatePage(this.value, languageData, 'Preferences');
            window.mainApi.notifyNewPreferences(preferences);
        });
    });
}

function setupLanguages()
{
    populateLanguages();
    listenerLanguage();
    window.mainApi.getLanguageDataPromise().then(languageData =>
    {
        translatePage(usersStyles['language'], languageData.data, 'Preferences');
    });
}

function refreshContent()
{
    return new Promise((resolve) =>
    {
        window.mainApi.getUserPreferencesPromise().then(userPreferences =>
        {
            usersStyles = userPreferences;
            preferences = usersStyles;
            resolve();
        });
    });
}

function changeValue(type, newVal)
{
    preferences[type] = newVal;
    window.mainApi.notifyNewPreferences(preferences);
}

function renderPreferencesWindow()
{
    // Theme-handling should be towards the top. Applies theme early so it's more natural.
    const theme = 'theme';

    /* istanbul ignore else */
    if (theme in usersStyles)
    {
        $('#' + theme).val(usersStyles[theme]);
    }
    const selectedThemeOption = $('#' + theme)
        .children('option:selected')
        .val();
    preferences[theme] = selectedThemeOption;
    applyTheme(selectedThemeOption);

    /* istanbul ignore else */
    if ('view' in usersStyles)
    {
        $('#view').val(usersStyles['view']);
    }

    $('input[type="checkbox"]').on('change', function()
    {
        changeValue(this.name, this.checked);
    });

    $('#hours-per-day, #break-time-interval').on('change', function()
    {
        /* istanbul ignore else */
        if (this.checkValidity() === true)
        {
            changeValue(this.name, this.value);
        }
    });

    $('input[type="number"], input[type="date"]').on('change', function()
    {
        changeValue(this.name, this.value);
    });

    $('#theme').on('change', function()
    {
        changeValue('theme', this.value);
        applyTheme(this.value);
    });

    $('#view').on('change', function()
    {
        changeValue('view', this.value);
    });

    $('input').each(function()
    {
        const input = $(this);
        const name = input.attr('name');
        /* istanbul ignore else */
        if (input.attr('type') === 'checkbox')
        {
            /* istanbul ignore else */
            if (name in usersStyles)
            {
                input.prop('checked', usersStyles[name]);
            }
            preferences[name] = input.prop('checked');
        }
        else if (
            ['text', 'number', 'date'].indexOf(input.attr('type')) > -1
        )
        {
            /* istanbul ignore else */
            if (name in usersStyles)
            {
                input.val(usersStyles[name]);
            }
            preferences[name] = input.val();
        }
    });

    const prefillBreak = $('#enable-prefill-break-time');
    const breakInterval = $('#break-time-interval');

    breakInterval.prop('disabled', !prefillBreak.is(':checked'));
    prefillBreak.on('change', function()
    {
        breakInterval.prop('disabled', !prefillBreak.is(':checked'));
    });

    const notification = $('#notification');
    const repetition = $('#repetition');
    const notificationsInterval = $('#notifications-interval');

    repetition.prop('disabled', !notification.is(':checked'));
    repetition.prop(
        'checked',
        notification.is(':checked') && usersStyles['repetition']
    );
    notificationsInterval.prop('disabled', !repetition.is(':checked'));

    notification.on('change', function()
    {
        repetition.prop('disabled', !notification.is(':checked'));
        repetition.prop(
            'checked',
            notification.is(':checked') && usersStyles['repetition']
        );
        notificationsInterval.prop('disabled', !repetition.is(':checked'));
    });

    repetition.on('change', function()
    {
        notificationsInterval.prop('disabled', !repetition.is(':checked'));
    });
}
/* istanbul ignore next */
$(() =>
{
    window.mainApi.getUserPreferencesPromise().then((userPreferences) =>
    {
        usersStyles = userPreferences;
        preferences = usersStyles;
        renderPreferencesWindow();
        setupLanguages();
    });
});

export {
    refreshContent,
    populateLanguages,
    listenerLanguage,
    renderPreferencesWindow,
};
