/* eslint-disable no-undef */
'use strict';

const { booleanInputs, defaultPreferences, getDefaultWidthHeight, getPreferencesFilePath, getUserPreferences, savePreferences, showDay, switchCalendarView, notificationIsEnabled, getUserLanguage, getNotificationsInterval, repetitionIsEnabled, getUserPreferencesPromise, resetPreferences } = require('../../js/user-preferences');
const fs = require('fs');
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
        expect(showDay(2020, 1, 1)).toBe(days['working-days-saturday']);
        expect(showDay(2020, 1, 2)).toBe(days['working-days-sunday']);
        expect(showDay(2020, 1, 3)).toBe(days['working-days-monday']);
        expect(showDay(2020, 1, 4)).toBe(days['working-days-tuesday']);
        expect(showDay(2020, 1, 5)).toBe(days['working-days-wednesday']);
        expect(showDay(2020, 1, 6)).toBe(days['working-days-thursday']);
        expect(showDay(2020, 1, 7)).toBe(days['working-days-friday']);
        expect(showDay(2020, 1, 7, defaultPreferences)).toBe(days['working-days-friday']);
    });

    describe('getDefaultWidthHeight()', () =>
    {

        test('Month view', () =>
        {
            expect(defaultPreferences['view']).toBe('month');
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
            expect(defaultPreferences['view']).toBe('month');
            savePreferences(defaultPreferences);

            expect(getUserPreferences()['view']).toBe('month');
            switchCalendarView();

            const preferences = getUserPreferences();
            expect(preferences['view']).toBe('day');
        });

        test('Day to Month', () =>
        {
            let preferences = { defaultPreferences };

            preferences['view'] = 'day';
            savePreferences(preferences);

            expect(getUserPreferences()['view']).toBe('day');
            switchCalendarView();

            preferences = getUserPreferences();
            expect(preferences['view']).toBe('month');
        });
    });

    describe('Notification interval', () =>
    {
        beforeEach(() =>
        {
            expect(defaultPreferences['notifications-interval']).toBe('5');
            savePreferences(defaultPreferences);

            expect(getUserPreferences()['notifications-interval']).toBe('5');
            expect(getNotificationsInterval()).toBe('5');
        });

        test('Saving valid number as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', '6');
            expect(getUserPreferences()['notifications-interval']).toBe('6');
            expect(getNotificationsInterval()).toBe('6');
        });

        test('Saving invalid number as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', '0');
            expect(getUserPreferences()['notifications-interval']).toBe('5');
            expect(getNotificationsInterval()).toBe('5');
        });

        test('Saving invalid text as notifications-interval', () =>
        {
            setNewPreference('notifications-interval', 'ab');
            expect(getUserPreferences()['notifications-interval']).toBe('5');
            expect(getNotificationsInterval()).toBe('5');
        });
    });

    describe('getUserLanguage()', () =>
    {
        test('Saving valid language', () =>
        {
            setNewPreference('language', 'es');
            expect(getUserPreferences()['language']).toBe('es');
            expect(getUserLanguage()).toBe('es');
        });

        test('Saving invalid number as language', () =>
        {
            setNewPreference('language', 5);
            expect(getUserPreferences()['language']).toBe('en');
            expect(getUserLanguage()).toBe('en');
        });

        test('Saving invalid string language', () =>
        {
            setNewPreference('language', 'es-AR');
            expect(getUserPreferences()['language']).toBe('en');
            expect(getUserLanguage()).toBe('en');
        });

    });

    describe('notificationIsEnabled()', () =>
    {
        test('Saving invalid string as notification preference', () =>
        {
            setNewPreference('notification', 'true');
            expect(notificationIsEnabled()).toBe(true);
        });

        test('Saving invalid number as notification preference', () =>
        {
            setNewPreference('notification', 8);
            expect(notificationIsEnabled()).toBe(true);
        });

        test('Saving valid boolean as notification preference', () =>
        {
            setNewPreference('notification', false);
            expect(notificationIsEnabled()).toBe(false);
        });
    });

    describe('repetitionIsEnabled()', () =>
    {
        test('Saving invalid string as repetition preference', () =>
        {
            setNewPreference('repetition', 'true');
            expect(repetitionIsEnabled()).toBe(true);
        });

        test('Saving invalid number as repetition preference', () =>
        {
            setNewPreference('repetition', 15);
            expect(repetitionIsEnabled()).toBe(true);
        });

        test('Saving valid boolean as repetition preference', () =>
        {
            setNewPreference('repetition', false);
            expect(repetitionIsEnabled()).toBe(false);
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
                expect(getUserPreferences()[pref]).toBe(defaultPreferences[pref]);
            });

            test(`Saving invalid number as ${pref} preference`, () =>
            {
                setNewPreference(pref, 20);
                expect(getUserPreferences()[pref]).toBe(defaultPreferences[pref]);
            });

            test(`Saving valid boolean as ${pref} preference`, () =>
            {
                setNewPreference(pref, false);
                expect(getUserPreferences()[pref]).toBe(false);
            });

            test(`Saving valid boolean as ${pref} preference`, () =>
            {
                setNewPreference(pref, true);
                expect(getUserPreferences()[pref]).toBe(true);
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
                expect(getUserPreferences()['theme']).toBe(theme);
            });
        }

        test('Saving invalid string as theme', () =>
        {
            setNewPreference('theme', 'DARKKKK');
            expect(getUserPreferences()['theme']).toBe(defaultPreferences.theme);
        });

        test('Saving invalid number as theme', () =>
        {
            setNewPreference('theme', 5);
            expect(getUserPreferences()['theme']).toBe(defaultPreferences.theme);
        });
    });
    describe('Hours Per Day', () =>
    {
        test('Saving invalid number as hours per day', () =>
        {
            setNewPreference('hours-per-day', 1223);
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });

        test('Saving invalid amount of hours per day', () =>
        {
            setNewPreference('hours-per-day', '30:00');
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });

        test('Saving invalid minutes in hours per day', () =>
        {
            setNewPreference('hours-per-day', '20:99');
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });

        test('Saving invalid boolean as hours per day', () =>
        {
            setNewPreference('hours-per-day', true);
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });

        test('Saving valid hours per day', () =>
        {
            setNewPreference('hours-per-day', '06:00');
            expect(getUserPreferences()['hours-per-day']).toBe('06:00');
        });

        test('Saving valid hours per day', () =>
        {
            setNewPreference('hours-per-day', '01:30');
            expect(getUserPreferences()['hours-per-day']).toBe('01:30');
        });
    });
    describe('Break Time Interval', () =>
    {
        test('Saving invalid number as break-time-interval', () =>
        {
            setNewPreference('break-time-interval', 1223);
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });

        test('Saving invalid hours in break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '30:00');
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });

        test('Saving invalid mintes in break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '20:99');
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });

        test('Saving invalid boolean as break-time-interval', () =>
        {
            setNewPreference('break-time-interval', true);
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });

        test('Saving valid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:30');
            expect(getUserPreferences()['break-time-interval']).toBe('00:30');
        });

        test('Saving valid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:15');
            expect(getUserPreferences()['break-time-interval']).toBe('00:15');
        });
    });
    describe('Overall balance start date', () =>
    {
        test('Saving invalid month in overall-balance-start-date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-13-01');
            expect(getUserPreferences()['overall-balance-start-date']).toBe(defaultPreferences['overall-balance-start-date']);
        });

        test('Saving invalid day in overall-balance-start-date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-10-32');
            expect(getUserPreferences()['overall-balance-start-date']).toBe(defaultPreferences['overall-balance-start-date']);
        });

        test('Saving valid date', () =>
        {
            setNewPreference( 'overall-balance-start-date', '2022-10-02');
            expect(getUserPreferences()['overall-balance-start-date']).toBe('2022-10-02');
        });
    });
    describe('Update remind me after', () =>
    {
        test('Saving invalid numner as update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', new Date('2022-13-01').getTime());
            expect(getUserPreferences()['update-remind-me-after']).toBe(defaultPreferences['update-remind-me-after']);
        });

        test('Saving invalid month in update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-13-01');
            expect(getUserPreferences()['update-remind-me-after']).toBe(defaultPreferences['update-remind-me-after']);
        });

        test('Saving invalid date in update-remind-me-after', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-10-32');
            expect(getUserPreferences()['update-remind-me-after']).toBe(defaultPreferences['update-remind-me-after']);
        });

        test('Saving valid date', () =>
        {
            setNewPreference( 'update-remind-me-after', '2022-10-02');
            expect(getUserPreferences()['update-remind-me-after']).toBe('2022-10-02');
        });
    });
    describe('savePreferences()', () =>
    {
        test('Save to wrong path', () =>
        {
            expect(savePreferences(defaultPreferences, './not/existing/folder')).toBeInstanceOf(Error);
        });

        test('Save to default path', () =>
        {
            expect(savePreferences(defaultPreferences)).toBe(true);
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
            expect(getUserPreferencesPromise()).toBeInstanceOf(Promise);
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
            expect(Object.keys(getLanguageMap()).length).toBeGreaterThan(0);
        });

        test('getLanguageMap() keys should be sorted', () =>
        {
            let lastLanguage = '';
            Object.keys(getLanguageMap()).forEach(language =>
            {
                if (lastLanguage === '') lastLanguage = language;
                else
                {
                    expect(language.localeCompare(lastLanguage)).toBeGreaterThan(0);
                    lastLanguage = language;
                }
            });
            expect(lastLanguage).not.toBe('');

        });

        test('getLanguagesCodes() should be keys of getLanguageMap()', () =>
        {
            expect(Object.keys(getLanguageMap())).toEqual(getLanguagesCodes());
        });

        test('getLanguageName() should return correct language', () =>
        {
            expect(getLanguageName('bn')).toBe('বাংলা');
            expect(getLanguageName('ca-CA')).toBe('Catalàn');
            expect(getLanguageName('de-DE')).toBe('Deutsch');
            expect(getLanguageName('en')).toBe('English');
            expect(getLanguageName('es')).toBe('Español');
            expect(getLanguageName('fr-FR')).toBe('Français - France');
            expect(getLanguageName('gu')).toBe('ગુજરાતી');
            expect(getLanguageName('he')).toBe('עברית');
            expect(getLanguageName('hi')).toBe('हिंदी');
            expect(getLanguageName('id')).toBe('Bahasa Indonesia');
            expect(getLanguageName('it')).toBe('Italiano');
            expect(getLanguageName('ja')).toBe('日本語');
            expect(getLanguageName('ko')).toBe('한국어');
            expect(getLanguageName('mr')).toBe('मराठी');
            expect(getLanguageName('nl')).toBe('Nederlands');
            expect(getLanguageName('pl')).toBe('Polski');
            expect(getLanguageName('pt-BR')).toBe('Português - Brasil');
            expect(getLanguageName('pt-MI')).toBe('Português - Minerês');
            expect(getLanguageName('pt-PT')).toBe('Português - Portugal');
            expect(getLanguageName('ru-RU')).toBe('Русский');
            expect(getLanguageName('sv-SE')).toBe('Svenska');
            expect(getLanguageName('ta')).toBe('தமிழ்');
            expect(getLanguageName('th-TH')).toBe('ไทย');
            expect(getLanguageName('tr-TR')).toBe('Türkçe');
            expect(getLanguageName('zh-TW')).toBe('繁體中文');
        });
    });

    afterAll(() =>
    {
        jest.resetAllMocks();
    });
});

