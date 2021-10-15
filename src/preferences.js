'use strict';

const { getUserPreferences } = require('../js/user-preferences.js');
const { applyTheme } = require('../js/themes.js');
const { bindDevToolsShortcut } = require('../js/window-aux.js');
const i18n = require('../src/configs/i18next.config');
const config = require('../src/configs/app.config');

const $ = require('jquery');
const jqueryI18next = require('jquery-i18next');

// Lazy loaded modules
let ipcRenderer = null;
function getIpcRenderer()
{
    if (ipcRenderer === null)
    {
        ipcRenderer = require('electron').ipcRenderer;
    }
    return ipcRenderer;
}

// Global values for preferences page
let usersStyles = getUserPreferences();
const preferences = usersStyles;

function translatePage(language)
{
    $('html').attr('lang', language);
    $('body').localize();
    $('title').localize();
    $('label').localize();
    $('div').localize();
}

function populateLanguages(i18n)
{
    const languageOpts = $('#language');
    languageOpts.empty();
    $.each(config.getLanguagesCodes(), function()
    {
        languageOpts.append(
            $('<option />')
                .val(this)
                .text(config.getLanguageName(this))
        );
    });
    // Select current display language
    /* istanbul ignore else */
    if ('language' in usersStyles)
    {
        $('#language').val(usersStyles['language']);
    }
    $('#language').on('change', function()
    {
        preferences['language'] = this.value;
        i18n.changeLanguage(this.value);
        translatePage(this.value);
        getIpcRenderer().send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });
}

function listenerLanguage()
{
    $('#language').on('change', function()
    {
        console.log('PREFERENCE_SAVE_DATA_NEEDED');
        preferences['language'] = this.value;
        i18n.changeLanguage(this.value);
        translatePage(this.value);
        populateLanguages(i18n);
        getIpcRenderer().send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
    });
}

i18n.on('loaded', () =>
{
    i18n.changeLanguage(usersStyles['language']);
    populateLanguages(i18n);
    listenerLanguage();
    i18n.off('loadded');
    i18n.off('languageChanged');

    jqueryI18next.init(i18n, $);
    translatePage(i18n.language);
});

function refreshContent()
{
    usersStyles = getUserPreferences();
}

function updateUserPreferences()
{
    getIpcRenderer().send('PREFERENCE_SAVE_DATA_NEEDED', preferences);
}

function changeValue(type, newVal)
{
    preferences[type] = newVal;
    updateUserPreferences();
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

    bindDevToolsShortcut(window);
}
/* istanbul ignore next */
$(() =>
{
    renderPreferencesWindow();
});

module.exports = {
    refreshContent,
    populateLanguages,
    listenerLanguage,
    renderPreferencesWindow,
};
