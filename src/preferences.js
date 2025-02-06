'use strict';

import { applyTheme } from '../renderer/themes.js';
import i18nTranslator from '../renderer/i18n-translator.js';

// Global values for preferences page
let preferences;

function populateLanguages()
{
    const languageOpts = $('#language');
    languageOpts.empty();
    $.each(window.preferencesApi.getLanguageMap(), (key, value) =>
    {
        languageOpts.append(
            $('<option />')
                .val(key)
                .text(value)
        );
    });
    // Select current display language
    /* istanbul ignore else */
    if ('language' in preferences)
    {
        $('#language').val(preferences['language']);
    }
}

function listenerLanguage()
{
    $('#language').on('change', function()
    {
        preferences['language'] = this.value;
        window.preferencesApi.changeLanguagePromise(this.value).then((languageData) =>
        {
            i18nTranslator.translatePage(this.value, languageData, 'Preferences');
            window.preferencesApi.notifyNewPreferences(preferences);
        });
    });
}

function setupLanguages()
{
    populateLanguages();
    listenerLanguage();
    window.rendererApi.getLanguageDataPromise().then(languageData =>
    {
        i18nTranslator.translatePage(preferences['language'], languageData.data, 'Preferences');
    });
}

function resetContent()
{
    preferences = window.preferencesApi.getDefaultPreferences();
    renderPreferencesWindow();
    window.preferencesApi.notifyNewPreferences(preferences);
}

function changeValue(type, newVal)
{
    preferences[type] = newVal;
    window.preferencesApi.notifyNewPreferences(preferences);
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
    if (theme in preferences)
    {
        $('#' + theme).val(preferences[theme]);
    }
    const selectedThemeOption = $('#' + theme)
        .children('option:selected')
        .val();
    preferences[theme] = selectedThemeOption;
    applyTheme(selectedThemeOption);

    /* istanbul ignore else */
    if ('view' in preferences)
    {
        $('#view').val(preferences['view']);
    }

    $('input').each(function()
    {
        const input = $(this);
        const name = input.attr('name');
        /* istanbul ignore else */
        if (input.attr('type') === 'checkbox')
        {
            /* istanbul ignore else */
            if (name in preferences)
            {
                input.prop('checked', preferences[name]);
            }
            preferences[name] = input.prop('checked');
        }
        else if (
            ['text', 'number', 'date'].indexOf(input.attr('type')) > -1
        )
        {
            /* istanbul ignore else */
            if (name in preferences)
            {
                input.val(preferences[name]);
            }
            preferences[name] = input.val();
        }
    });

    const prefillBreak = $('#enable-prefill-break-time');
    const breakInterval = $('#break-time-interval');

    breakInterval.prop('disabled', !prefillBreak.is(':checked'));

    const notification = $('#notification');
    const repetition = $('#repetition');
    const notificationsInterval = $('#notifications-interval');

    repetition.prop('disabled', !notification.is(':checked'));
    repetition.prop(
        'checked',
        notification.is(':checked') && preferences['repetition']
    );
    notificationsInterval.prop('disabled', !repetition.is(':checked'));
}

function setupListeners()
{
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

    $('#reset-button').on('click', function()
    {
        window.rendererApi.getLanguageDataPromise().then(languageData =>
        {
            const options = {
                type: 'question',
                buttons: [i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.yes-please'), i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.no-thanks')],
                defaultId: 1,
                cancelId: 1,
                message: i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.reset-preferences'),
                detail: i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.confirm-reset-preferences'),
            };
            window.rendererApi.showDialog(options).then((result) =>
            {
                if (result.response === 0 /*Yes*/)
                {
                    resetContent();
                    const optionsReset = {
                        type: 'info',
                        message: i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.reset-preferences'),
                        detail: i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.reset-success'),
                    };
                    window.rendererApi.showDialog(optionsReset);
                }
            });
        });
    });

    const prefillBreak = $('#enable-prefill-break-time');
    const breakInterval = $('#break-time-interval');

    prefillBreak.on('change', function()
    {
        breakInterval.prop('disabled', !prefillBreak.is(':checked'));
    });

    const notification = $('#notification');
    const repetition = $('#repetition');
    const notificationsInterval = $('#notifications-interval');

    notification.on('change', function()
    {
        repetition.prop('disabled', !notification.is(':checked'));
        repetition.prop(
            'checked',
            notification.is(':checked') && preferences['repetition']
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
    preferences = window.rendererApi.getOriginalUserPreferences();
    renderPreferencesWindow();
    setupListeners();
    setupLanguages();
});

export {
    convertTimeFormat,
    resetContent,
    populateLanguages,
    listenerLanguage,
    setupListeners,
    renderPreferencesWindow,
};
