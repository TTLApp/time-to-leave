'use strict';

import { applyTheme } from '../renderer/themes.js';
import i18nTranslator from '../renderer/i18n-translator.js';
import TimeMath from '../js/time-math.mjs';

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

function renderWindowTheme()
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
}

function renderPreferencesWindow()
{
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

    $('#break-time-interval').on('input', function()
    {
        this.reportValidity();
    });

    $('#break-time-interval').on('blur', function()
    {
        this.value = this.checkValidity() ? this.value : '00:30';
    });

    $('#hours-per-day').on('input', function()
    {
        this.setCustomValidity('');
        this.reportValidity();
    });

    $('#hours-per-day').on('blur', function()
    {
        this.value = this.checkValidity() ? this.value : '08:00';
        this.setCustomValidity('');
    });

    $('#hours-per-day, #break-time-interval').on('change', function()
    {
        if (this.checkValidity() === true)
        {
            const entry = TimeMath.convertTimeFormat(this.value);
            this.value = entry;
            changeValue(this.name, entry);
        }
    });

    $('#notifications-interval').on('blur change', function()
    {
        this.value = this.checkValidity() ? this.value : 5;
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
                buttons: [i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.yes'), i18nTranslator.getTranslationInLanguageData(languageData.data, '$Preferences.no')],
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
    requestAnimationFrame(() =>
    {
        renderWindowTheme();
        requestAnimationFrame(() =>
        {
            setTimeout(() =>
            {
                window.rendererApi.notifyWindowReadyToShow();
            }, 100);
        });
    });
    renderPreferencesWindow();
    setupListeners();
    setupLanguages();
});

export {
    resetContent,
    populateLanguages,
    listenerLanguage,
    setupListeners,
    renderPreferencesWindow,
};
