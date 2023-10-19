/* eslint-disable no-undef */
'use strict';

const { createNotification, createLeaveNotification, updateDismiss, getDismiss } = require('../../js/notification.js');
const { getUserPreferences, savePreferences, resetPreferences } = require('../../js/user-preferences.js');
const { getDateStr } = require('../../js/date-aux.js');
const { app } = require('electron');

function buildTimeString(now)
{
    return `0${now.getHours()}`.slice(-2) + ':' + `0${now.getMinutes()}`.slice(-2);
}

describe('Notifications', function()
{
    describe('notify', () =>
    {
        beforeEach(() =>
        {
            // displays a notification in test fails if mocks are not restored
            jest.restoreAllMocks();
        });

        test('displays a notification in test', (done) =>
        {
            process.env.NODE_ENV = 'test';
            const notification = createNotification('test');
            expect(notification.body).toBe('test');
            expect(notification.title).toBe('Time to Leave');
            notification.on('show', (event) =>
            {
                expect(event).toBeTruthy();
                expect(event.sender.title).toBe('Time to Leave');
                notification.close();
                done();
            });
            if (process.env.CI && (process.platform === 'linux' || process.platform === 'darwin'))
            {
                // Linux/macos window notifications are not shown on CI
                // so this is a way to emit the same event that actually happens.
                // Timeout error is visible here https://github.com/thamara/time-to-leave/actions/runs/3488950409/jobs/5838419982
                notification.emit('show', {
                    sender: {
                        title: 'Time to Leave'
                    }
                });
            }
            else
            {
                notification.show();
            }
        });

        test('displays a notification in production', (done) =>
        {
            process.env.NODE_ENV = 'production';
            const notification = createNotification('production');
            expect(notification.body).toBe('production');
            expect(notification.title).toBe('Time to Leave');
            notification.on('show', (event) =>
            {
                expect(event).toBeTruthy();
                expect(event.sender.title).toBe('Time to Leave');
                notification.close();
                done();
            });
            if (process.env.CI && (process.platform === 'linux' || process.platform === 'darwin'))
            {
                // Linux/macos window notifications are not shown on CI
                // so this is a way to emit the same event that actually happens.
                // Timeout error is visible here https://github.com/thamara/time-to-leave/actions/runs/3488950409/jobs/5838419982
                notification.emit('show', {
                    sender: {
                        title: 'Time to Leave'
                    }
                });
            }
            else
            {
                notification.show();
            }
        });

    });

    describe('createLeaveNotification', () =>
    {
        test('Should fail when notifications are disabled', () =>
        {
            const preferences = getUserPreferences();
            preferences['notification'] = false;
            savePreferences(preferences);
            const notify = createLeaveNotification(true);
            expect(notify).toBe(false);
        });

        test('Should fail when leaveByElement is not found', () =>
        {
            const notify = createLeaveNotification(undefined);
            expect(notify).toBe(false);
        });

        test('Should fail when notifications have been dismissed', () =>
        {
            const now = new Date();
            const dateToday = getDateStr(now);
            updateDismiss(dateToday);
            const notify = createLeaveNotification(true);
            expect(notify).toBe(false);
        });

        test('Should fail when time is not valid', () =>
        {
            const notify = createLeaveNotification('33:90');
            expect(notify).toBe(false);
        });

        test('Should fail when time is in the future', () =>
        {
            jest.restoreAllMocks();
            const now = new Date();
            now.setMinutes(now.getMinutes() + 1);
            const notify = createLeaveNotification(buildTimeString(now));
            expect(notify).toBe(false);
        });

        test('Should fail when time is in the past', () =>
        {
            const now = new Date();
            now.setMinutes(now.getMinutes() - 9);
            const notify = createLeaveNotification(buildTimeString(now));
            expect(notify).toBe(false);
        });

        test('Should fail when repetition is disabled', () =>
        {
            const preferences = getUserPreferences();
            preferences['repetition'] = false;
            savePreferences(preferences);
            const now = new Date();
            now.setHours(now.getHours() - 1);
            const notify = createLeaveNotification(buildTimeString(now));
            expect(notify).toBe(false);
        });

        test('Should pass when time is correct and dismiss action is pressed', () =>
        {
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            expect(notify).toBeTruthy();
            expect(getDismiss()).toBe(null);
            expect(notify.listenerCount('action')).toBe(1);
            expect(notify.listenerCount('close')).toBe(1);
            expect(notify.listenerCount('click')).toBe(1);
            notify.emit('action', 'dismiss');
            expect(getDismiss()).toBe(getDateStr(now));
        });

        test('Should pass when time is correct and other action is pressed', () =>
        {
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            expect(notify).toBeTruthy();
            expect(getDismiss()).toBe(null);
            expect(notify.listenerCount('action')).toBe(1);
            expect(notify.listenerCount('close')).toBe(1);
            expect(notify.listenerCount('click')).toBe(1);
            notify.emit('action', '');
            expect(getDismiss()).toBe(null);
        });

        test('Should pass when time is correct and close is pressed', () =>
        {
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            expect(notify).toBeTruthy();
            expect(getDismiss()).toBe(null);
            expect(notify.listenerCount('action')).toBe(1);
            expect(notify.listenerCount('close')).toBe(1);
            expect(notify.listenerCount('click')).toBe(1);
            notify.emit('close');
            expect(getDismiss()).toBe(getDateStr(now));
        });

        test('Should pass when time is correct and close is pressed', (done) =>
        {
            jest.spyOn(app, 'emit').mockImplementation((key) =>
            {
                expect(key).toBe('activate');
                done();
            });
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            expect(notify).toBeTruthy();
            expect(notify.listenerCount('action')).toBe(1);
            expect(notify.listenerCount('close')).toBe(1);
            expect(notify.listenerCount('click')).toBe(1);
            notify.emit('click', 'Clicked on notification');
        });
    });

    afterEach(() =>
    {
        resetPreferences();
        updateDismiss(null);
    });
});

