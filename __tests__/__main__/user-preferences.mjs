'use strict';

import assert from 'assert';
import fs from 'fs';

import {
    booleanInputs,
    getDefaultPreferences,
    getDefaultWidthHeight,
    getNotificationsInterval,
    getPreferencesFilePath,
    getUserLanguage,
    getUserPreferences,
    notificationIsEnabled,
    repetitionIsEnabled,
    resetPreferences,
    savePreferences,
    showDay,
    switchCalendarView,
} from '../../js/user-preferences.mjs';
import { themeOptions } from '../../renderer/themes.js';
import { getLanguageMap, getLanguagesCodes, getLanguageName } from '../../src/configs/app.config.mjs';

function setNewPreference(preference, value)
{
    const preferences = getUserPreferences();
    preferences[preference] = value;
    savePreferences(preferences);
}

describe('Preferences Main', () =>
{
    // Remove preferences file to guarantee equal execution of tests
    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath))
    {
        fs.unlinkSync(preferencesFilePath);
    }

    const days = getUserPreferences();

    it('showDay(year, month, day)', () =>
    {
        assert.strictEqual(showDay(2020, 1, 1), days['working-days-saturday']);
        assert.strictEqual(showDay(2020, 1, 2), days['working-days-sunday']);
        assert.strictEqual(showDay(2020, 1, 3), days['working-days-monday']);
        assert.strictEqual(showDay(2020, 1, 4), days['working-days-tuesday']);
        assert.strictEqual(showDay(2020, 1, 5), days['working-days-wednesday']);
        assert.strictEqual(showDay(2020, 1, 6), days['working-days-thursday']);
        assert.strictEqual(showDay(2020, 1, 7), days['working-days-friday']);
        assert.strictEqual(showDay(2020, 1, 7, getDefaultPreferences()), days['working-days-friday']);
    });

    describe('getDefaultWidthHeight()', () =>
    {
        it('Month view', function()
        {
            const preferences = structuredClone(getDefaultPreferences());
            assert.strictEqual(preferences['view'], 'month');
            assert.deepStrictEqual(getDefaultWidthHeight(preferences), { width: 1010, height: 800 });
        });

        it('Day view', () =>
        {
            const preferences = structuredClone(getDefaultPreferences());
            preferences['view'] = 'day';
            assert.deepStrictEqual(getDefaultWidthHeight(preferences), { width: 500, height: 500 });
        });
    });

    describe('switchCalendarView()', () =>
    {

        it('Month to Day', () =>
        {
            assert.strictEqual(getDefaultPreferences()['view'], 'month');
            savePreferences(getDefaultPreferences());

            assert.strictEqual(getUserPreferences()['view'], 'month');
            switchCalendarView();

            const preferences = getUserPreferences();
            assert.strictEqual(preferences['view'], 'day');
        });

        it('Day to Month', () =>
        {
            let preferences = structuredClone(getDefaultPreferences());

            preferences['view'] = 'day';
            savePreferences(preferences);

            assert.strictEqual(getUserPreferences()['view'], 'day');
            switchCalendarView();

            preferences = getUserPreferences();
            assert.strictEqual(preferences['view'], 'month');
        });
    });

    describe('Notification interval', () =>
    {
        beforeEach(() =>
        {
            assert.strictEqual(getDefaultPreferences()['notifications-interval'], '5');
            savePreferences(getDefaultPreferences());

            assert.strictEqual(getUserPreferences()['notifications-interval'], '5');
            assert.strictEqual(getNotificationsInterval(), '5');
        });

        it('Saving valid number as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', '6');
            assert.strictEqual(getUserPreferences()['notifications-interval'], '6');
            assert.strictEqual(getNotificationsInterval(), '6');
        });

        it('Saving invalid number as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', '0');
            assert.strictEqual(getUserPreferences()['notifications-interval'], '5');
            assert.strictEqual(getNotificationsInterval(), '5');
        });

        it('Saving invalid text as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', 'ab');
            assert.strictEqual(getUserPreferences()['notifications-interval'], '5');
            assert.strictEqual(getNotificationsInterval(), '5');
        });
    });

    describe('getUserLanguage()', () =>
    {
        it('Saving valid language', () =>
        {
            setNewPreference('language', 'es');
            assert.strictEqual(getUserPreferences()['language'], 'es');
            assert.strictEqual(getUserLanguage(), 'es');
        });

        it('Saving invalid number as language', () =>
        {
            setNewPreference('language', 5);
            assert.strictEqual(getUserPreferences()['language'], 'en');
            assert.strictEqual(getUserLanguage(), 'en');
        });

        it('Saving invalid string language', () =>
        {
            setNewPreference('language', 'es-AR');
            assert.strictEqual(getUserPreferences()['language'], 'en');
            assert.strictEqual(getUserLanguage(), 'en');
        });

    });

    describe('notificationIsEnabled()', () =>
    {
        it('Saving invalid string as notification preference', () =>
        {
            setNewPreference('notification', 'true');
            assert.strictEqual(notificationIsEnabled(), true);
        });

        it('Saving invalid number as notification preference', () =>
        {
            setNewPreference('notification', 8);
            assert.strictEqual(notificationIsEnabled(), true);
        });

        it('Saving valid boolean as notification preference', () =>
        {
            setNewPreference('notification', false);
            assert.strictEqual(notificationIsEnabled(), false);
        });
    });

    describe('repetitionIsEnabled()', () =>
    {
        it('Saving invalid string as repetition preference', () =>
        {
            setNewPreference('repetition', 'true');
            assert.strictEqual(repetitionIsEnabled(), true);
        });

        it('Saving invalid number as repetition preference', () =>
        {
            setNewPreference('repetition', 15);
            assert.strictEqual(repetitionIsEnabled(), true);
        });

        it('Saving valid boolean as repetition preference', () =>
        {
            setNewPreference('repetition', false);
            assert.strictEqual(repetitionIsEnabled(), false);
        });
    });

    describe('Remaining boolean preferences', () =>
    {
        beforeEach(() =>
        {
            savePreferences(getDefaultPreferences());
        });

        for (const pref of booleanInputs)
        {
            it(`Saving invalid string as ${pref} preference`, () =>
            {
                setNewPreference(pref, 'true');
                assert.strictEqual(getUserPreferences()[pref], getDefaultPreferences()[pref]);
            });

            it(`Saving invalid number as ${pref} preference`, () =>
            {
                setNewPreference(pref, 20);
                assert.strictEqual(getUserPreferences()[pref], getDefaultPreferences()[pref]);
            });

            it(`Saving valid boolean as ${pref} preference`, () =>
            {
                setNewPreference(pref, false);
                assert.strictEqual(getUserPreferences()[pref], false);
            });

            it(`Saving valid boolean as ${pref} preference`, () =>
            {
                setNewPreference(pref, true);
                assert.strictEqual(getUserPreferences()[pref], true);
            });
        }
    });

    describe('Theme preference', () =>
    {
        for (const theme of themeOptions)
        {
            it(`Saving valid theme ${theme}`, () =>
            {
                setNewPreference('theme', theme);
                assert.strictEqual(getUserPreferences()['theme'], theme);
            });
        }

        it('Saving invalid string as theme', () =>
        {
            setNewPreference('theme', 'DARKKKK');
            assert.strictEqual(getUserPreferences()['theme'], getDefaultPreferences().theme);
        });

        it('Saving invalid number as theme', () =>
        {
            setNewPreference('theme', 5);
            assert.strictEqual(getUserPreferences()['theme'], getDefaultPreferences().theme);
        });
    });

    describe('Hours Per Day', () =>
    {
        it('Saving invalid number as hours per day', () =>
        {
            setNewPreference('hours-per-day', 1223);
            assert.strictEqual(getUserPreferences()['hours-per-day'], getDefaultPreferences()['hours-per-day']);
        });

        it('Saving invalid amount of hours per day', () =>
        {
            setNewPreference('hours-per-day', '30:00');
            assert.strictEqual(getUserPreferences()['hours-per-day'], getDefaultPreferences()['hours-per-day']);
        });

        it('Saving invalid minutes in hours per day', () =>
        {
            setNewPreference('hours-per-day', '20:99');
            assert.strictEqual(getUserPreferences()['hours-per-day'], getDefaultPreferences()['hours-per-day']);
        });

        it('Saving invalid boolean as hours per day', () =>
        {
            setNewPreference('hours-per-day', true);
            assert.strictEqual(getUserPreferences()['hours-per-day'], getDefaultPreferences()['hours-per-day']);
        });

        it('Saving valid hours per day', () =>
        {
            setNewPreference('hours-per-day', '06:00');
            assert.strictEqual(getUserPreferences()['hours-per-day'], '06:00');
        });

        it('Saving valid hours per day', () =>
        {
            setNewPreference('hours-per-day', '01:30');
            assert.strictEqual(getUserPreferences()['hours-per-day'], '01:30');
        });
    });

    describe('Break Time Interval', () =>
    {
        it('Saving invalid number as break-time-interval', () =>
        {
            setNewPreference('break-time-interval', 1223);
            assert.strictEqual(getUserPreferences()['break-time-interval'], getDefaultPreferences()['break-time-interval']);
        });

        it('Saving invalid hours in break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '30:00');
            assert.strictEqual(getUserPreferences()['break-time-interval'], getDefaultPreferences()['break-time-interval']);
        });

        it('Saving invalid mintes in break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '20:99');
            assert.strictEqual(getUserPreferences()['break-time-interval'], getDefaultPreferences()['break-time-interval']);
        });

        it('Saving invalid boolean as break-time-interval', () =>
        {
            setNewPreference('break-time-interval', true);
            assert.strictEqual(getUserPreferences()['break-time-interval'], getDefaultPreferences()['break-time-interval']);
        });

        it('Saving valid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:30');
            assert.strictEqual(getUserPreferences()['break-time-interval'], '00:30');
        });

        it('Saving valid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:15');
            assert.strictEqual(getUserPreferences()['break-time-interval'], '00:15');
        });
    });

    describe('Overall balance start date', () =>
    {
        it('Saving invalid month in overall-balance-start-date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-13-01');
            assert.strictEqual(getUserPreferences()['overall-balance-start-date'], getDefaultPreferences()['overall-balance-start-date']);
        });

        it('Saving invalid day in overall-balance-start-date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-10-32');
            assert.strictEqual(getUserPreferences()['overall-balance-start-date'], getDefaultPreferences()['overall-balance-start-date']);
        });

        it('Saving valid date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-10-02');
            assert.strictEqual(getUserPreferences()['overall-balance-start-date'], '2022-10-02');
        });
    });

    describe('Update remind me after', () =>
    {
        it('Saving invalid numner as update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', new Date('2022-13-01').getTime());
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], getDefaultPreferences()['update-remind-me-after']);
        });

        it('Saving invalid month in update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-13-01');
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], getDefaultPreferences()['update-remind-me-after']);
        });

        it('Saving invalid date in update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-10-32');
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], getDefaultPreferences()['update-remind-me-after']);
        });

        it('Saving valid date', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-10-02');
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], '2022-10-02');
        });
    });

    describe('savePreferences()', () =>
    {
        it('Save to wrong path', () =>
        {
            assert.strictEqual(savePreferences(getDefaultPreferences(), './not/existing/folder') instanceof Error, true);
        });

        it('Save to default path', () =>
        {
            assert.strictEqual(savePreferences(getDefaultPreferences()), true);
        });
    });

    describe('resetPreferences()', () =>
    {
        afterEach(() =>
        {
            resetPreferences();
            assert.deepStrictEqual(getUserPreferences(), getDefaultPreferences());
        });
        {
            for (const key in getDefaultPreferences())
            {
                const value = getDefaultPreferences()[key];
                it('Should reset all preferences', () =>
                {
                    if (typeof value === 'boolean')
                    {
                        setNewPreference(key, !value);
                    }
                    if (typeof value === 'string')
                    {
                        setNewPreference(key, 'NOT A VALID VALUE');
                    }
                    if (typeof value === 'number')
                    {
                        setNewPreference(key, -1);
                    }
                });
            }
        }
    });

    describe('App config languages', () =>
    {
        it('getLanguageMap() should have language code keys', () =>
        {
            assert.strictEqual(Object.keys(getLanguageMap()).length > 0, true);
        });

        it('getLanguageMap() keys should be sorted', () =>
        {
            let lastLanguage = '';
            Object.keys(getLanguageMap()).forEach(language =>
            {
                if (lastLanguage === '') lastLanguage = language;
                else
                {
                    assert.strictEqual(language.localeCompare(lastLanguage) > 0, true);
                    lastLanguage = language;
                }
            });
            assert.notStrictEqual(lastLanguage, '');

        });

        it('getLanguagesCodes() should be keys of getLanguageMap()', () =>
        {
            assert.deepStrictEqual(Object.keys(getLanguageMap()), getLanguagesCodes());
        });

        it('getLanguageName() should return correct language', () =>
        {
            assert.strictEqual(getLanguageName('bn'), 'বাংলা');
            assert.strictEqual(getLanguageName('ca'), 'Catalàn');
            assert.strictEqual(getLanguageName('de-DE'), 'Deutsch');
            assert.strictEqual(getLanguageName('el'), 'Ελληνικά');
            assert.strictEqual(getLanguageName('en'), 'English');
            assert.strictEqual(getLanguageName('es'), 'Español');
            assert.strictEqual(getLanguageName('fr-FR'), 'Français - France');
            assert.strictEqual(getLanguageName('gu'), 'ગુજરાતી');
            assert.strictEqual(getLanguageName('he'), 'עברית');
            assert.strictEqual(getLanguageName('hi'), 'हिंदी');
            assert.strictEqual(getLanguageName('id'), 'Bahasa Indonesia');
            assert.strictEqual(getLanguageName('it'), 'Italiano');
            assert.strictEqual(getLanguageName('ja'), '日本語');
            assert.strictEqual(getLanguageName('ko'), '한국어');
            assert.strictEqual(getLanguageName('mr'), 'मराठी');
            assert.strictEqual(getLanguageName('nl'), 'Nederlands');
            assert.strictEqual(getLanguageName('pl'), 'Polski');
            assert.strictEqual(getLanguageName('pt-BR'), 'Português - Brasil');
            assert.strictEqual(getLanguageName('pt-MI'), 'Português - Minerês');
            assert.strictEqual(getLanguageName('pt-PT'), 'Português - Portugal');
            assert.strictEqual(getLanguageName('ru-RU'), 'Русский');
            assert.strictEqual(getLanguageName('sv-SE'), 'Svenska');
            assert.strictEqual(getLanguageName('ta'), 'தமிழ்');
            assert.strictEqual(getLanguageName('th-TH'), 'ไทย');
            assert.strictEqual(getLanguageName('tr-TR'), 'Türkçe');
            assert.strictEqual(getLanguageName('uk-UA'), 'Українська');
            assert.strictEqual(getLanguageName('zh-CN'), '简体中文');
            assert.strictEqual(getLanguageName('zh-TW'), '繁體中文');
        });
    });
});
