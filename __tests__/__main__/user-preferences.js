/* eslint-disable no-undef */
'use strict';

const { defaultPreferences, getDefaultWidthHeight, getPreferencesFilePath, getUserPreferences, savePreferences, showDay, switchCalendarView, notificationIsEnabled, getUserLanguage, getNotificationsInterval, repetitionIsEnabled, getUserPreferencesPromise, resetPreferences } = require('../../js/user-preferences');
const fs = require('fs');

function setNewPreference(preference, value)
{
    const preferences = getUserPreferences();
    preferences[preference] = value;
    savePreferences(preferences);
}

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

        test('Saving valid number', () =>
        {
            setNewPreference('notifications-interval','6');
            expect(getUserPreferences()['notifications-interval']).toBe('6');
            expect(getNotificationsInterval()).toBe('6');
        });

        test('Saving invalid number', () =>
        {
            setNewPreference('notifications-interval','0');
            expect(getUserPreferences()['notifications-interval']).toBe('5');
            expect(getNotificationsInterval()).toBe('5');
        });

        test('Saving invalid text', () =>
        {
            setNewPreference('notifications-interval','ab');
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

        test('Saving invalid language', () =>
        {
            setNewPreference('language', 5);
            expect(getUserPreferences()['language']).toBe('en');
            expect(getUserLanguage()).toBe('en');
        });

        test('Saving invalid language', () =>
        {
            setNewPreference('language', 'es-AR');
            expect(getUserPreferences()['language']).toBe('en');
            expect(getUserLanguage()).toBe('en');
        });

    });

    describe('notificationIsEnabled()', () =>
    {
        test('Saving invalid notification preference', () =>
        {
            setNewPreference('notification', 'true');
            expect(getUserPreferences()['notification']).toBe(true);
            expect(notificationIsEnabled()).toBe(true);
        });
        test('Saving invalid notification preference', () =>
        {
            setNewPreference('notification', 8);
            expect(getUserPreferences()['notification']).toBe(true);
            expect(notificationIsEnabled()).toBe(true);
        });
        test('Saving valid notification preference', () =>
        {
            setNewPreference('notification', false);
            expect(getUserPreferences()['notification']).toBe(false);
            expect(notificationIsEnabled()).toBe(false);
        });
    });
    describe('repetitionIsEnabled()', () =>
    {
        test('Saving invalid repetition preference', () =>
        {
            setNewPreference('repetition', 'true');
            expect(getUserPreferences()['repetition']).toBe(true);
            expect(repetitionIsEnabled()).toBe(true);
        });
        test('Saving invalid repetition preference', () =>
        {
            setNewPreference('repetition', 15);
            expect(getUserPreferences()['repetition']).toBe(true);
            expect(repetitionIsEnabled()).toBe(true);
        });
        test('Saving valid repetition preference', () =>
        {
            setNewPreference('repetition', false);
            expect(getUserPreferences()['repetition']).toBe(false);
            expect(repetitionIsEnabled()).toBe(false);
        });
    });

    describe('Remaining boolean preferences', () =>
    {
        beforeEach(() =>
        {
            savePreferences(defaultPreferences);
        });
        const booleanPreferences = [
            'count-today',
            'close-to-tray',
            'minimize-to-tray',
            'hide-non-working-days',
            'enable-prefill-break-time',
            'notification',
            'repetition',
            'start-at-login',
            'working-days-monday',
            'working-days-tuesday',
            'working-days-wednesday',
            'working-days-thursday',
            'working-days-friday',
            'working-days-saturday',
            'working-days-sunday',
        ];

        for (const pref of booleanPreferences)
        {
            test(`Saving invalid ${pref} preference`, () =>
            {
                setNewPreference(pref, 'true');
                expect(getUserPreferences()[pref]).toBe(defaultPreferences[pref]);
            });
            test(`Saving invalid ${pref} preference`, () =>
            {
                setNewPreference(pref, 20);
                expect(getUserPreferences()[pref]).toBe(defaultPreferences[pref]);
            });
            test(`Saving valid ${pref} preference`, () =>
            {
                setNewPreference(pref, false);
                expect(getUserPreferences()[pref]).toBe(false);
            });
            test(`Saving valid ${pref} preference`, () =>
            {
                setNewPreference(pref, true);
                expect(getUserPreferences()[pref]).toBe(true);
            });
        }
    });
    describe('Theme preference', () =>
    {
        const validThemes = ['system-default', 'light', 'dark', 'cadent-star'];
        for (const theme of validThemes)
        {
            test(`Saving valid theme ${theme}`, () =>
            {
                setNewPreference('theme', theme);
                expect(getUserPreferences()['theme']).toBe(theme);
            });
        }

        test('Saving invalid theme', () =>
        {
            setNewPreference('theme', 'DARKKKK');
            expect(getUserPreferences()['theme']).toBe(defaultPreferences.theme);
        });
        test('Saving invalid theme', () =>
        {
            setNewPreference('theme', 5);
            expect(getUserPreferences()['theme']).toBe(defaultPreferences.theme);
        });
    });
    describe('Hours Per Day', () =>
    {
        test('Saving invalid hours per day', () =>
        {
            setNewPreference('hours-per-day', 1223);
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });
        test('Saving invalid hours per day', () =>
        {
            setNewPreference('hours-per-day', '30:00');
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });
        test('Saving invalid hours per day', () =>
        {
            setNewPreference('hours-per-day', '20:99');
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });
        test('Saving invalid hours per day', () =>
        {
            setNewPreference('hours-per-day', true);
            expect(getUserPreferences()['hours-per-day']).toBe(defaultPreferences['hours-per-day']);
        });
        test('Saving invalid hours per day', () =>
        {
            setNewPreference('hours-per-day', '06:00');
            expect(getUserPreferences()['hours-per-day']).toBe('06:00');
        });
        test('Saving invalid hours per day', () =>
        {
            setNewPreference('hours-per-day', '01:30');
            expect(getUserPreferences()['hours-per-day']).toBe('01:30');
        });
    });
    describe('Break Time Interval', () =>
    {
        test('Saving invalid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', 1223);
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });
        test('Saving invalid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '30:00');
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });
        test('Saving invalid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '20:99');
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });
        test('Saving invalid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', true);
            expect(getUserPreferences()['break-time-interval']).toBe(defaultPreferences['break-time-interval']);
        });
        test('Saving invalid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:30');
            expect(getUserPreferences()['break-time-interval']).toBe('00:30');
        });
        test('Saving invalid break-time-interval', () =>
        {
            setNewPreference('break-time-interval', '00:15');
            expect(getUserPreferences()['break-time-interval']).toBe('00:15');
        });
    });
    describe('Overall balance start date', () =>
    {
        const key ='overall-balance-start-date';
        test('Saving invalid date', () =>
        {
            setNewPreference( key, '2022-13-01');
            expect(getUserPreferences()[key]).toBe(defaultPreferences[key]);
        });
        test('Saving invalid date', () =>
        {
            setNewPreference( key, '2022-10-32');
            expect(getUserPreferences()[key]).toBe(defaultPreferences[key]);
        });
        test('Saving valid date', () =>
        {
            setNewPreference( key, '2022-10-02');
            expect(getUserPreferences()[key]).toBe('2022-10-02');
        });
    });
    describe('Update remind me after', () =>
    {
        const key ='update-remind-me-after';
        test('Saving invalid date', () =>
        {
            setNewPreference( key, new Date('2022-13-01').getTime());
            expect(getUserPreferences()[key]).toBe(defaultPreferences[key]);
        });
        test('Saving invalid date', () =>
        {
            setNewPreference( key, '2022-13-01');
            expect(getUserPreferences()[key]).toBe(defaultPreferences[key]);
        });
        test('Saving invalid date', () =>
        {
            setNewPreference( key, '2022-10-32');
            expect(getUserPreferences()[key]).toBe(defaultPreferences[key]);
        });
        test('Saving valid date', () =>
        {
            setNewPreference( key, '2022-10-02');
            expect(getUserPreferences()[key]).toBe('2022-10-02');
        });
    });
    describe('getUserPreferencesPromise()', () =>
    {
        test('Should resolve promise', async() =>
        {
            expect(getUserPreferencesPromise()).toBeInstanceOf(Promise);
            const prefs = await getUserPreferencesPromise();
            expect(prefs).resolves.toStrictEqual(defaultPreferences);
        });
    });
    describe('savePreferences()', () =>
    {
        test('Save to wrong path', () =>
        {
            expect(savePreferences(defaultPreferences, './not/exisiting/folder')).toBeInstanceOf(Error);
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
});

