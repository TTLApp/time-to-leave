/* eslint-disable no-undef */
'use strict';

import assert from 'assert';
import { app } from 'electron';
import { stub } from 'sinon';

import { createNotification, createLeaveNotification, updateDismiss, getDismiss } from '../../js/notification.mjs';
import { getUserPreferences, savePreferences, resetPreferences } from '../../js/user-preferences.mjs';
import { getDateStr } from '../../js/date-aux.mjs';

function buildTimeString(now)
{
    return `0${now.getHours()}`.slice(-2) + ':' + `0${now.getMinutes()}`.slice(-2);
}

describe('Notifications', function()
{
    describe('notify', () =>
    {
        it('displays a notification in test', (done) =>
        {
            const notification = createNotification('test');
            // On Win32 the notification uses a different specification, with toastXml
            if (process.platform === 'win32')
            {
                assert.match(notification.toastXml, RegExp('<text>test</text>'));
                assert.match(notification.toastXml, RegExp('<text>Time to Leave</text>'));
            }
            else
            {
                assert.strictEqual(notification.body, 'test');
                assert.strictEqual(notification.title, 'Time to Leave');
            }
            notification.on('show', (event) =>
            {
                assert.notStrictEqual(event, undefined);
                // In Electron 25 the definition of Event changed and we can no longer
                // check information about the event sender
                notification.close();
                done();
            });
            if (process.env.CI && (process.platform === 'linux' || process.platform === 'darwin'))
            {
                // Linux/macos window notifications are not shown on CI
                // so this is a way to emit the same event that actually happens.
                // Timeout error is visible here https://github.com/TTLApp/time-to-leave/actions/runs/3488950409/jobs/5838419982
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

        it('displays a notification in production', (done) =>
        {
            process.env.NODE_ENV = 'production';
            const notification = createNotification('production');
            // On Win32 the notification uses a different specification, with toastXml
            if (process.platform === 'win32')
            {
                assert.match(notification.toastXml, RegExp('<text>production</text>'));
                assert.match(notification.toastXml, RegExp('<text>Time to Leave</text>'));
            }
            else
            {
                assert.strictEqual(notification.body, 'production');
                assert.strictEqual(notification.title, 'Time to Leave');
            }
            notification.on('show', (event) =>
            {
                assert.notStrictEqual(event, undefined);
                // In Electron 25 the definition of Event changed and we can no longer
                // check information about the event sender
                notification.close();
                done();
            });
            if (process.env.CI && (process.platform === 'linux' || process.platform === 'darwin'))
            {
                // Linux/macos window notifications are not shown on CI
                // so this is a way to emit the same event that actually happens.
                // Timeout error is visible here https://github.com/TTLApp/time-to-leave/actions/runs/3488950409/jobs/5838419982
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
            process.env.NODE_ENV = undefined; // restore value
        });

    });

    describe('createLeaveNotification', () =>
    {
        it('Should fail when notifications are disabled', () =>
        {
            const preferences = getUserPreferences();
            preferences['notification'] = false;
            savePreferences(preferences);
            const notify = createLeaveNotification(true);
            assert.strictEqual(notify, false);
        });

        it('Should fail when leaveByElement is not found', () =>
        {
            const notify = createLeaveNotification(undefined);
            assert.strictEqual(notify, false);
        });

        it('Should fail when notifications have been dismissed', () =>
        {
            const now = new Date();
            const dateToday = getDateStr(now);
            updateDismiss(dateToday);
            const notify = createLeaveNotification(true);
            assert.strictEqual(notify, false);
        });

        it('Should fail when time is not valid', () =>
        {
            const notify = createLeaveNotification('33:90');
            assert.strictEqual(notify, false);
        });

        it('Should fail when time is in the future', () =>
        {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 1);
            const notify = createLeaveNotification(buildTimeString(now));
            assert.strictEqual(notify, false);
        });

        it('Should fail when time is in the past', () =>
        {
            const now = new Date();
            now.setMinutes(now.getMinutes() - 9);
            const notify = createLeaveNotification(buildTimeString(now));
            assert.strictEqual(notify, false);
        });

        it('Should fail when repetition is disabled', () =>
        {
            const preferences = getUserPreferences();
            preferences['repetition'] = false;
            savePreferences(preferences);
            const now = new Date();
            now.setHours(now.getHours() - 1);
            const notify = createLeaveNotification(buildTimeString(now));
            assert.strictEqual(notify, false);
        });

        it('Should pass when time is correct and dismiss action is pressed', () =>
        {
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            assert.notStrictEqual(notify, undefined);
            assert.strictEqual(getDismiss(), null);
            assert.strictEqual(notify.listenerCount('action'), 1);
            assert.strictEqual(notify.listenerCount('close'), 1);
            assert.strictEqual(notify.listenerCount('click'), 1);
            notify.emit('action', 'dismiss');
            assert.strictEqual(getDismiss(), getDateStr(now));
        });

        it('Should pass when time is correct and other action is pressed', () =>
        {
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            assert.notStrictEqual(notify, undefined);
            assert.strictEqual(getDismiss(), null);
            assert.strictEqual(notify.listenerCount('action'), 1);
            assert.strictEqual(notify.listenerCount('close'), 1);
            assert.strictEqual(notify.listenerCount('click'), 1);
            notify.emit('action', '');
            assert.strictEqual(getDismiss(), null);
        });

        it('Should pass when time is correct and close is pressed', () =>
        {
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            assert.notStrictEqual(notify, undefined);
            assert.strictEqual(getDismiss(), null);
            assert.strictEqual(notify.listenerCount('action'), 1);
            assert.strictEqual(notify.listenerCount('close'), 1);
            assert.strictEqual(notify.listenerCount('click'), 1);
            notify.emit('close');
            assert.strictEqual(getDismiss(), getDateStr(now));
        });

        it('Should pass when time is correct and close is pressed', (done) =>
        {
            const appStub = stub(app, 'emit').callsFake((key) =>
            {
                assert.strictEqual(key, 'activate');
                appStub.restore();
                done();
            });
            const now = new Date();
            const notify = createLeaveNotification(buildTimeString(now));
            assert.notStrictEqual(notify, undefined);
            assert.strictEqual(notify.listenerCount('action'), 1);
            assert.strictEqual(notify.listenerCount('close'), 1);
            assert.strictEqual(notify.listenerCount('click'), 1);
            notify.emit('click', 'Clicked on notification');
        });
    });

    afterEach(() =>
    {
        resetPreferences();
        updateDismiss(null);
    });
});
