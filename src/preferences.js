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

    const days = [
        { id: 'sunday', label: 'sun' },
        { id: 'monday', label: 'mon' },
        { id: 'tuesday', label: 'tue' },
        { id: 'wednesday', label: 'wed' },
        { id: 'thursday', label: 'thu' },
        { id: 'friday', label: 'fri' },
        { id: 'saturday', label: 'sat' },
    ];

    const hoursContainer = $('#hours-container');

    function updateHoursInputs()
    {
        hoursContainer.empty();

        days.forEach(day =>
        {
            const isChecked = $(`#${day.id}`).is(':checked');
            if (isChecked)
            {
                const inputId = `hours-${day.id}`;
                const storedValue = usersStyles[inputId] || '08:00'; // Default or saved value

                const inputHTML = `
                <div class="flex-box">
                    <p data-i18n="$Preferences.${day.id}">${day.label}</p>
                    <input 
                        type="text" 
                        id="${inputId}" 
                        name="${inputId}" 
                        maxlength="5" 
                        pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$" 
                        value="${storedValue}" 
                        size="5" 
                        required 
                        style="text-align: right;" 
                    />
                </div>
            `;
                hoursContainer.append(inputHTML);

                $(`#${inputId}`).on('change', function()
                {
                    if (this.checkValidity())
                    {
                        changeValue(inputId, this.value);
                    }
                });
            }
        });
        window.mainApi.getLanguageDataPromise().then(languageData =>
        {
            translatePage(usersStyles.language, languageData.data, 'Preferences');
        });
    }

    days.forEach(day =>
    {
        const checkbox = $(`#${day.id}`);
        if (checkbox)
        {
            checkbox.prop('checked', usersStyles[`working-days-${day.id}`] || false);

            checkbox.on('change', function()
            {
                changeValue(`working-days-${day.id}`, this.checked);
                updateHoursInputs();
            });
        }
    });

    updateHoursInputs();

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
