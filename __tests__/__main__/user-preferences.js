/* eslint-disable no-undef */
'use strict';

const assert = require('assert');
const { booleanInputs, defaultPreferences, getDefaultWidthHeight, getPreferencesFilePath, getUserPreferences, savePreferences, showDay, switchCalendarView, notificationIsEnabled, getUserLanguage, getNotificationsInterval, repetitionIsEnabled, getUserPreferencesPromise, resetPreferences } = require('../../js/user-preferences');
import fs from 'fs';
const { themeOptions } = require('../../renderer/themes');
const { getLanguageMap, getLanguagesCodes, getLanguageName } = require('../../src/configs/app.config');

function setNewPreference(preference, value)
{
    const preferences = getUserPreferences();
    preferences[preference] = value;
    savePreferences(preferences);
}

// Mocking electron needs to be defined here and not in __mocks__
// because it's not directly required from this file as it is *fs*.
jest.mock('electron', () =>
{
    const originalModule = jest.requireActual('electron');
    return {
        __esModule: true,
        ...originalModule,
        ipcRenderer: {
            ...originalModule.ipcRenderer,
            invoke: jest.fn().mockResolvedValueOnce('./').mockResolvedValue('./dummy_file.txt'),
        }
    };
});

describe('Preferences Main', () =>
{
    process.env.NODE_ENV = 'test';

    // Remove preferences file to guarantee equal execution of tests
    const preferencesFilePath = getPreferencesFilePath();
    if (fs.existsSync(preferencesFilePath))
        fs.unlinkSync(preferencesFilePath);

    const days = getUserPreferences();

    test('showDay(year, month, day)', () =>
    {
        assert.strictEqual(showDay(2020, 1, 1), days['working-days-saturday']);
        assert.strictEqual(showDay(2020, 1, 2), days['working-days-sunday']);
        assert.strictEqual(showDay(2020, 1, 3), days['working-days-monday']);
        assert.strictEqual(showDay(2020, 1, 4), days['working-days-tuesday']);
        assert.strictEqual(showDay(2020, 1, 5), days['working-days-wednesday']);
        assert.strictEqual(showDay(2020, 1, 6), days['working-days-thursday']);
        assert.strictEqual(showDay(2020, 1, 7), days['working-days-friday']);
        assert.strictEqual(showDay(2020, 1, 7, defaultPreferences), days['working-days-friday']);
    });

    describe('getDefaultWidthHeight()', () =>
    {

        test('Month view', () =>
        {
            assert.strictEqual(defaultPreferences['view'], 'month');
            savePreferences(defaultPreferences);

            expect(getDefaultWidthHeight()).toStrictEqual({ width: 1010, height: 800 });
        });

        test('Day view', () =>
        {
            const preferences = { defaultPreferences };

            preferences['view'] = 'day';
            savePreferences(preferences);

            expect(getDefaultWidthHeight()).toStrictEqual({ width: 500, height: 500 });
        });
    });

    describe('switchCalendarView()', () =>
    {

        test('Month to Day', () =>
        {
            assert.strictEqual(defaultPreferences['view'], 'month');
            savePreferences(defaultPreferences);

            assert.strictEqual(getUserPreferences()['view'], 'month');
            switchCalendarView();

            const preferences = getUserPreferences();
            assert.strictEqual(preferences['view'], 'day');
        });

        test('Day to Month', () =>
        {
            let preferences = { defaultPreferences };

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
            assert.strictEqual(defaultPreferences['notifications-interval'], '5');
            savePreferences(defaultPreferences);

            assert.strictEqual(getUserPreferences()['notifications-interval'], '5');
            assert.strictEqual(getNotificationsInterval(), '5');
        });

        test('Saving valid number as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', '6');
            assert.strictEqual(getUserPreferences()['notifications-interval'], '6');
            assert.strictEqual(getNotificationsInterval(), '6');
        });

        test('Saving invalid number as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', '0');
            assert.strictEqual(getUserPreferences()['notifications-interval'], '5');
            assert.strictEqual(getNotificationsInterval(), '5');
        });

        test('Saving invalid text as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', 'ab');
            assert.strictEqual(getUserPreferences()['notifications-interval'], '5');
            assert.strictEqual(getNotificationsInterval(), '5');
        });
    });

    describe('getUserLanguage()', () =>
    {
        test('Saving valid language', () =>
        {
            setNewPreference('language', 'es');
            assert.strictEqual(getUserPreferences()['language'], 'es');
            assert.strictEqual(getUserLanguage(), 'es');
        });

        test('Saving invalid number as language', () =>
        {
            setNewPreference('language', 5);
            assert.strictEqual(getUserPreferences()['language'], 'en');
            assert.strictEqual(getUserLanguage(), 'en');
        });

        test('Saving invalid string language', () =>
        {
            setNewPreference('language', 'es-AR');
            assert.strictEqual(getUserPreferences()['language'], 'en');
            assert.strictEqual(getUserLanguage(), 'en');
        });

    });

    describe('notificationIsEnabled()', () =>
    {
        test('Saving invalid string as notification preference', () =>
        {
            setNewPreference('notification', 'true');
            assert.strictEqual(notificationIsEnabled(), true);
        });

        test('Saving invalid number as notification preference', () =>
        {
            setNewPreference('notification', 8);
            assert.strictEqual(notificationIsEnabled(), true);
        });

        test('Saving valid boolean as notification preference', () =>
        {
            setNewPreference('notification', false);
            assert.strictEqual(notificationIsEnabled(), false);
        });
    });

    describe('repetitionIsEnabled()', () =>
    {
        test('Saving invalid string as repetition preference', () =>
        {
            setNewPreference('repetition', 'true');
            assert.strictEqual(repetitionIsEnabled(), true);
        });

        test('Saving invalid number as repetition preference', () =>
        {
            setNewPreference('repetition', 15);
            assert.strictEqual(repetitionIsEnabled(), true);
        });

        test('Saving valid boolean as repetition preference', () =>
        {
            setNewPreference('repetition', false);
            assert.strictEqual(repetitionIsEnabled(), false);
        });
    });

    describe('Remaining boolean preferences', () =>
    {
        beforeEach(() =>
        {
            savePreferences(defaultPreferences);
        });

        for (const pref of booleanInputs)
        {
            test(`Saving invalid string as ${pref} preference`, () =>
            {
                setNewPreference(pref, 'true');
                assert.strictEqual(getUserPreferences()[pref], defaultPreferences[pref]);
            });

            test(`Saving invalid number as ${pref} preference`, () =>
            {
                setNewPreference(pref, 20);
                assert.strictEqual(getUserPreferences()[pref], defaultPreferences[pref]);
            });

            test(`Saving valid boolean as ${pref} preference`, () =>
            {
                setNewPreference(pref, false);
                assert.strictEqual(getUserPreferences()[pref], false);
            });

            test(`Saving valid boolean as ${pref} preference`, () =>
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
            test(`Saving valid theme ${theme}`, () =>
            {
                setNewPreference('theme', theme);
                assert.strictEqual(getUserPreferences()['theme'], theme);
            });
        }

        test('Saving invalid string as theme', () =>
        {
            setNewPreference('theme', 'DARKKKK');
            assert.strictEqual(getUserPreferences()['theme'], defaultPreferences.theme);
        });

        test('Saving invalid number as theme', () =>
        {
            setNewPreference('theme', 5);
            assert.strictEqual(getUserPreferences()['theme'], defaultPreferences.theme);
        });
    });
    describe('Hours Per Day', () =>
    {
        test('Saving invalid number as hours per day', () =>
        {
            setNewPreference('hours-per-day', 1223);
            assert.strictEqual(getUserPreferences()['hours-per-day'], defaultPreferences['hours-per-day']);
        });

        test('Saving invalid amount of hours per day', () =>
        {
            setNewPreference('hours-per-day', '30:00');
            assert.strictEqual(getUserPreferences()['hours-per-day'], defaultPreferences['hours-per-day']);
        });

        test('Saving invalid minutes in hours per day', () =>
        {
            setNewPreference('hours-per-day', '20:99');
            assert.strictEqual(getUserPreferences()['hours-per-day'], defaultPreferences['hours-per-day']);
        });

        test('Saving invalid boolean as hours per day', () =>
        {
            setNewPreference('hours-per-day', true);
            assert.strictEqual(getUserPreferences()['hours-per-day'], defaultPreferences['hours-per-day']);
        });

        test('Saving valid hours per day', () =>
        {
            setNewPreference('hours-per-day', '06:00');
            assert.strictEqual(getUserPreferences()['hours-per-day'], '06:00');
        });

        test('Saving valid hours per day', () =>
        {
            setNewPreference('hours-per-day', '01:30');
            assert.strictEqual(getUserPreferences()['hours-per-day'], '01:30');
        });
    });
    describe('Break Time Interval', () =>
    {
        test('Saving invalid number as break-time-interval', () =>
        {
            setNewPreference('break-time-interval', 1223);
            assert.strictEqual(getUserPreferences()['break-time-interval'], defaultPreferences['break-time-interval']);
        });

        test('Saving invalid hours in break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '30:00');
            assert.strictEqual(getUserPreferences()['break-time-interval'], defaultPreferences['break-time-interval']);
        });

        test('Saving invalid mintes in break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '20:99');
            assert.strictEqual(getUserPreferences()['break-time-interval'], defaultPreferences['break-time-interval']);
        });

        test('Saving invalid boolean as break-time-interval', () =>
        {
            setNewPreference('break-time-interval', true);
            assert.strictEqual(getUserPreferences()['break-time-interval'], defaultPreferences['break-time-interval']);
        });

        test('Saving valid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:30');
            assert.strictEqual(getUserPreferences()['break-time-interval'], '00:30');
        });

        test('Saving valid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:15');
            assert.strictEqual(getUserPreferences()['break-time-interval'], '00:15');
        });
    });
    describe('Overall balance start date', () =>
    {
        test('Saving invalid month in overall-balance-start-date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-13-01');
            assert.strictEqual(getUserPreferences()['overall-balance-start-date'], defaultPreferences['overall-balance-start-date']);
        });

        test('Saving invalid day in overall-balance-start-date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-10-32');
            assert.strictEqual(getUserPreferences()['overall-balance-start-date'], defaultPreferences['overall-balance-start-date']);
        });

        test('Saving valid date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-10-02');
            assert.strictEqual(getUserPreferences()['overall-balance-start-date'], '2022-10-02');
        });
    });
    describe('Update remind me after', () =>
    {
        test('Saving invalid numner as update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', new Date('2022-13-01').getTime());
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], defaultPreferences['update-remind-me-after']);
        });

        test('Saving invalid month in update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-13-01');
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], defaultPreferences['update-remind-me-after']);
        });

        test('Saving invalid date in update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-10-32');
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], defaultPreferences['update-remind-me-after']);
        });

        test('Saving valid date', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-10-02');
            assert.strictEqual(getUserPreferences()['update-remind-me-after'], '2022-10-02');
        });
    });
    describe('savePreferences()', () =>
    {
        test('Save to wrong path', () =>
        {
            assert.strictEqual(savePreferences(defaultPreferences, './not/existing/folder') instanceof Error, true);
        });

        test('Save to default path', () =>
        {
            assert.strictEqual(savePreferences(defaultPreferences), true);
        });
    });
    describe('resetPreferences()', () =>
    {
        afterEach(() =>
        {
            resetPreferences();
            expect(getUserPreferences()).toStrictEqual(defaultPreferences);
        });
        {
            for (const key in defaultPreferences)
            {
                const value = defaultPreferences[key];
                test('Should reset all preferences', () =>
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
    describe('getUserPreferencesPromise()', () =>
    {
        beforeAll(() =>
        {
            fs.writeFileSync('./dummy_file.txt', 'This should be tried to be parsed and fail');
        });

        test('Should return a promise', () =>
        {
            assert.strictEqual(getUserPreferencesPromise() instanceof Promise, true);
        });

        test('Should resolve promise', async() =>
        {
            await expect(getUserPreferencesPromise()).resolves.toStrictEqual({});
        });

        afterAll(() =>
        {
            fs.unlinkSync('./dummy_file.txt', () => {});
        });
    });

    describe('App config languages', () =>
    {
        test('getLanguageMap() should have language code keys', () =>
        {
            assert.strictEqual(Object.keys(getLanguageMap()).length > 0, true);
        });

        test('getLanguageMap() keys should be sorted', () =>
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

        test('getLanguagesCodes() should be keys of getLanguageMap()', () =>
        {
            expect(Object.keys(getLanguageMap())).toEqual(getLanguagesCodes());
        });

        test('getLanguageName() should return correct language', () =>
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

    afterAll(() =>
    {
        jest.resetAllMocks();
    });
});

