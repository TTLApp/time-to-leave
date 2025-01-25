'use strict';

import assert from 'assert';
import { app, BrowserWindow, ipcMain } from 'electron';
import { match, spy, stub, useFakeTimers } from 'sinon';

import Notification from '../../js/notification.mjs';
import { savePreferences, getDefaultPreferences, resetPreferences } from '../../js/user-preferences.mjs';

import {
    createWindow,
    getLeaveByInterval,
    getMainWindow,
    resetMainWindow,
    triggerStartupDialogs
} from '../../js/main-window.mjs';

import UpdateManager from '../../js/update-manager.mjs';

// Mocking USER_DATA_PATH for tests below
ipcMain.handle('USER_DATA_PATH', () =>
{
    return new Promise((resolve) =>
    {
        resolve(app.getPath('userData'));
    });
});

ipcMain.removeHandler('GET_LANGUAGE_DATA');
ipcMain.handle('GET_LANGUAGE_DATA', () => ({
    'language': 'en',
    'data': {}
}));

describe('main-window.mjs', () =>
{
    let showSpy;
    before(() =>
    {
        // Avoid showing the window
        showSpy = stub(BrowserWindow.prototype, 'show');
    });

    beforeEach(() =>
    {
        showSpy.resetHistory();
    });

    describe('getMainWindow', () =>
    {
        it('Should be null if it has not been started', () =>
        {
            assert.strictEqual(global.tray, null);
            assert.strictEqual(getMainWindow(), null);
            assert.strictEqual(getLeaveByInterval(), null);
        });

        it('Should get window', () =>
        {
            createWindow();
            assert.strictEqual(showSpy.calledOnce, true);
            assert.strictEqual(getMainWindow() instanceof BrowserWindow, true);
        });
    });

    describe('createWindow()', () =>
    {
        it('Should create and get window default behaviour', () =>
        {
            const loadFileSpy = spy(BrowserWindow.prototype, 'loadFile');
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            assert.strictEqual(mainWindow instanceof BrowserWindow, true);
            assert.strictEqual(ipcMain.listenerCount('TOGGLE_TRAY_PUNCH_TIME'), 1);
            assert.strictEqual(ipcMain.listenerCount('RESIZE_MAIN_WINDOW'), 1);
            assert.strictEqual(ipcMain.listenerCount('SWITCH_VIEW'), 1);
            assert.strictEqual(ipcMain.listenerCount('RECEIVE_LEAVE_BY'), 1);
            assert.strictEqual(mainWindow.listenerCount('minimize'), 2);
            assert.strictEqual(mainWindow.listenerCount('close'), 2);
            assert.strictEqual(loadFileSpy.calledOnce, true);
            assert.strictEqual(showSpy.calledOnce, true);
            assert.notStrictEqual(getLeaveByInterval(), null);
            assert.strictEqual(getLeaveByInterval()._idleNext.expiry > 0, true);
        });
    });

    describe('emit RESIZE_MAIN_WINDOW', function()
    {
        it('It should resize window', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', async() =>
            {
                // Wait a bit for values to accomodate
                await new Promise(res => setTimeout(res, 500));

                assert.strictEqual(ipcMain.emit('RESIZE_MAIN_WINDOW'), true);
                const windowSize = mainWindow.getSize();
                assert.strictEqual(windowSize.length, 2);

                // Width and height are within 5 pixels of the expected values
                assert.strictEqual(Math.abs(windowSize[0] - 1010) < 5, true, `Value was ${windowSize[0]}`);
                assert.strictEqual(Math.abs(windowSize[1] - 800) < 5, true, `Value was ${windowSize[1]}`);
                done();
            });
        });
        it('It should not resize window if values are smaller than minimum', (done) =>
        {
            assert.strictEqual(savePreferences({
                ...getDefaultPreferences(),
                ['view']: 'day'
            }), true);
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', async() =>
            {
                // Wait a bit for values to accomodate
                await new Promise(res => setTimeout(res, 500));

                assert.strictEqual(ipcMain.emit('RESIZE_MAIN_WINDOW'), true);
                const windowSize = mainWindow.getSize();
                assert.strictEqual(windowSize.length, 2);

                // Width and height are within 5 pixels of the expected values
                assert.strictEqual(Math.abs(windowSize[0] - 500) < 5, true, `Value was ${windowSize[0]}`);
                assert.strictEqual(Math.abs(windowSize[1] - 500) < 5, true, `Value was ${windowSize[1]}`);
                done();
            });
        });
    });

    describe('emit SWITCH_VIEW', () =>
    {
        it('It should send new event to ipcRenderer', (done) =>
        {
            assert.strictEqual(savePreferences({
                ...getDefaultPreferences(),
                ['view']: 'month'
            }), true);
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', async() =>
            {
                // Wait a bit for values to accomodate
                await new Promise(res => setTimeout(res, 500));

                const windowStub = stub(mainWindow.webContents, 'send').callsFake((event, savedPreferences) =>
                {
                    ipcMain.emit('FINISH_TEST', event, savedPreferences);
                });
                ipcMain.on('FINISH_TEST', (event, savedPreferences) =>
                {
                    assert.strictEqual(windowStub.calledOnce, true);
                    assert.strictEqual(savedPreferences['view'], 'day');
                    done();
                });
                ipcMain.emit('SWITCH_VIEW');
                windowStub.restore();
            });
        });
    });

    describe('emit RECEIVE_LEAVE_BY', () =>
    {
        it('Should not show notification when notifications is not sent', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                stub(Notification, 'createLeaveNotification').callsFake(() =>
                {
                    return false;
                });
                ipcMain.emit('RECEIVE_LEAVE_BY', {}, undefined);
                assert.strictEqual(Notification.createLeaveNotification.calledOnce, true);
                Notification.createLeaveNotification.restore();
                done();
            });
        });

        it('Should show notification', (done) =>
        {
            stub(Notification, 'createLeaveNotification').callsFake(() =>
            {
                return {
                    show: () =>
                    {
                        Notification.createLeaveNotification.restore();
                        done();
                    }
                };
            });
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                const now = new Date();
                ipcMain.emit(
                    'RECEIVE_LEAVE_BY',
                    {},
                    `0${now.getHours()}`.slice(-2) + ':' + `0${now.getMinutes()}`.slice(-2)
                );
            });
        });
    });

    describe('tray', () =>
    {
        describe('emit click', () =>
        {
            it('It should show window on click', (done) =>
            {
                createWindow();
                /**
                 * @type {BrowserWindow}
                 */
                const mainWindow = getMainWindow();
                mainWindow.on('ready-to-show', () =>
                {
                    showSpy.callsFake(() =>
                    {
                        ipcMain.emit('FINISH_TEST');
                    });
                    ipcMain.on('FINISH_TEST', () =>
                    {
                        assert.strictEqual(showSpy.calledTwice, true);
                        showSpy.resetBehavior();
                        done();
                    });
                    global.tray.emit('click');
                });
            });
        });

        describe('emit right-click', () =>
        {
            it('It should show menu on right-click', (done) =>
            {
                createWindow();
                /**
                 * @type {BrowserWindow}
                 */
                const mainWindow = getMainWindow();
                mainWindow.on('ready-to-show', () =>
                {
                    const trayStub = stub(global.tray, 'popUpContextMenu').callsFake(() =>
                    {
                        ipcMain.emit('FINISH_TEST');
                    });
                    ipcMain.on('FINISH_TEST', () =>
                    {
                        assert.strictEqual(trayStub.calledOnce, true);
                        trayStub.restore();
                        done();
                    });
                    global.tray.emit('right-click');
                });
            });
        });
    });

    describe('emit minimize', () =>
    {
        it('Should get hidden if minimize-to-tray is true', (done) =>
        {
            savePreferences({
                ...getDefaultPreferences(),
                ['minimize-to-tray']: true
            });
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                mainWindow.emit('minimize', {
                    preventDefault: () => {}
                });
                assert.strictEqual(mainWindow.isVisible(), false);
                done();
            });
        });

        it('Should minimize if minimize-to-tray is false', (done) =>
        {
            savePreferences({
                ...getDefaultPreferences(),
                ['minimize-to-tray']: false
            });

            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            const minimizeSpy = spy(mainWindow, 'minimize');
            mainWindow.on('ready-to-show', () =>
            {
                mainWindow.emit('minimize', {});
                assert.strictEqual(minimizeSpy.called, true);
                minimizeSpy.restore();
                done();
            });
        });
    });

    describe('emit close', () =>
    {
        it('Should get hidden if close-to-tray is true', (done) =>
        {
            savePreferences({
                ...getDefaultPreferences(),
                ['close-to-tray']: true
            });
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                mainWindow.emit('close', {
                    preventDefault: () => {}
                });
                assert.strictEqual(mainWindow.isDestroyed(), false);
                assert.strictEqual(mainWindow.isVisible(), false);
                done();
            });
        });

        it('Should close if close-to-tray is false', (done) =>
        {
            savePreferences({
                ...getDefaultPreferences(),
                ['close-to-tray']: false,
                ['minimize-to-tray']: false
            });
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                // Force the exit
                mainWindow.on('close', () =>
                {
                    mainWindow.destroy();
                });
                mainWindow.emit('close', {
                    preventDefault: () => {}
                });
                assert.strictEqual(mainWindow.isDestroyed(), true);
                done();
            });
        });
    });

    describe('triggerStartupDialogs', () =>
    {
        it('Should check for updates and try to migrate', () =>
        {
            stub(UpdateManager, 'shouldCheckForUpdates').returns(true);
            stub(UpdateManager, 'checkForUpdates');

            triggerStartupDialogs();
            assert.strictEqual(UpdateManager.shouldCheckForUpdates.calledOnce, true);
            assert.strictEqual(UpdateManager.checkForUpdates.calledOnce, true);

            UpdateManager.shouldCheckForUpdates.restore();
            UpdateManager.checkForUpdates.restore();
        });

        it('Should not check for updates when shouldCheck returns falseZ', () =>
        {
            stub(UpdateManager, 'shouldCheckForUpdates').returns(false);
            stub(UpdateManager, 'checkForUpdates');

            triggerStartupDialogs();
            assert.strictEqual(UpdateManager.shouldCheckForUpdates.calledOnce, true);
            assert.strictEqual(UpdateManager.checkForUpdates.calledOnce, false);

            UpdateManager.shouldCheckForUpdates.restore();
            UpdateManager.checkForUpdates.restore();
        });
    });

    describe('GET_LEAVE_BY interval', () =>
    {
        it('Should create interval', (done) =>
        {
            const intervalSpy = spy(global, 'setInterval');
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                mainWindow.emit('close', {
                    preventDefault: () => {}
                });
                assert.strictEqual(intervalSpy.calledOnceWithExactly(match.func, 60 * 1000), true);
                intervalSpy.restore();
                done();
            });
        });

        it('Should run interval', (done) =>
        {
            const clock = useFakeTimers();
            const intervalSpy = spy(global, 'setInterval');
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            const windowStub = stub(mainWindow.webContents, 'send').callsFake(() =>
            {
                windowStub.restore();
                clock.restore();
                done();
            });
            mainWindow.on('ready-to-show', () =>
            {
                mainWindow.emit('close', {
                    preventDefault: () => {}
                });
                assert.strictEqual(intervalSpy.calledOnceWithExactly(match.func, 60 * 1000), true);
                clock.next();
                intervalSpy.restore();
            });
        });
    });

    afterEach(() =>
    {
        resetMainWindow();
        resetPreferences();
    });

    after(() =>
    {
        showSpy.restore();
    });
});
