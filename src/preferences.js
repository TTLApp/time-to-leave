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

function convertTimeFormat(entry)
{
    const colonIdx = entry.indexOf(':');
    const containsColon = colonIdx !== -1;
    const periodIdx = entry.indexOf('.');
    const containsPeriod = periodIdx !== -1;
    const singleStartDigit = (containsColon && colonIdx <= 1) || (containsPeriod && periodIdx <= 1);
    if (containsColon)
    {
        /* istanbul ignore else */
        if (singleStartDigit)
        {
            entry = '0'.concat(entry);
        }
    }
    else if (containsPeriod)
    {
        let minutes = parseFloat('0'.concat(entry.substring(periodIdx)));
        minutes *= 60;
        minutes = Math.floor(minutes).toString();
        minutes = minutes.length < 2 ? '0'.concat(minutes) : minutes.substring(0, 2);
        entry = entry.substring(0, periodIdx).concat(':').concat(minutes);
        /* istanbul ignore else */
        if (singleStartDigit)
        {
            entry = '0'.concat(entry);
        }
    }
    else
    {
        /* istanbul ignore else */
        if (entry.length < 2)
        {
            entry = '0'.concat(entry);
        }
        entry = entry.concat(':00');
    }
    return entry;
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
            const entry = convertTimeFormat(this.value);
            this.value = entry;
            changeValue(this.name, entry);
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
    convertTimeFormat,
    refreshContent,
    populateLanguages,
    listenerLanguage,
    renderPreferencesWindow,
};
