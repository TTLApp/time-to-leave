'use strict';

import assert from 'assert';
import { BrowserWindow, ipcMain } from 'electron';
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
import IpcConstants from '../../js/ipc-constants.mjs';

ipcMain.removeHandler(IpcConstants.GetLanguageData);
ipcMain.handle(IpcConstants.GetLanguageData, () => ({
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

        it('Should get window', (done) =>
        {
            createWindow();
            assert.strictEqual(getMainWindow() instanceof BrowserWindow, true);
            getMainWindow().webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
            {
                assert.strictEqual(showSpy.calledOnce, true);
                done();
            });
        });
    });

    describe('createWindow()', () =>
    {
        it('Should create and get window default behaviour', (done) =>
        {
            const loadFileSpy = spy(BrowserWindow.prototype, 'loadFile');
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            assert.strictEqual(mainWindow instanceof BrowserWindow, true);
            assert.strictEqual(ipcMain.listenerCount(IpcConstants.ToggleTrayPunchTime), 1);
            assert.strictEqual(ipcMain.listenerCount(IpcConstants.SwitchView), 1);
            assert.strictEqual(ipcMain.listenerCount(IpcConstants.ReceiveLeaveBy), 1);
            assert.strictEqual(mainWindow.listenerCount('minimize'), 2);
            assert.strictEqual(mainWindow.listenerCount('close'), 2);
            assert.strictEqual(loadFileSpy.calledOnce, true);
            assert.notStrictEqual(getLeaveByInterval(), null);
            assert.strictEqual(getLeaveByInterval()._idleNext.expiry > 0, true);
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
            {
                assert.strictEqual(showSpy.calledOnce, true);
                done();
            });
        });
    });

    describe('emit IpcConstants.SwitchView', () =>
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, async() =>
            {
                // Wait a bit for values to accomodate
                await new Promise(res => setTimeout(res, 500));

                const windowSize = mainWindow.getSize();
                assert.strictEqual(windowSize.length, 2);

                // First within the month view sizes
                // Width and height are within 5 pixels of the expected values
                assert.strictEqual(Math.abs(windowSize[0] - 1010) < 5, true, `Value was ${windowSize[0]}`);
                assert.strictEqual(Math.abs(windowSize[1] - 800) < 5, true, `Value was ${windowSize[1]}`);

                const windowStub = stub(mainWindow.webContents, 'send').callsFake((event, savedPreferences) =>
                {
                    assert.strictEqual(windowStub.calledOnce, true);
                    assert.strictEqual(savedPreferences['view'], 'day');
                    done();
                });
                ipcMain.emit(IpcConstants.SwitchView);

                // Wait a bit for values to accomodate
                await new Promise(res => setTimeout(res, 500));

                // Now in day view sizes
                assert.strictEqual(Math.abs(windowSize[0] - 500) < 5, true, `Value was ${windowSize[0]}`);
                assert.strictEqual(Math.abs(windowSize[1] - 500) < 5, true, `Value was ${windowSize[1]}`);

                windowStub.restore();
            });
        });
    });

    describe('emit IpcConstants.ReceiveLeaveBy', () =>
    {
        it('Should not show notification when notifications is not sent', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
            {
                stub(Notification, 'createLeaveNotification').callsFake(() =>
                {
                    return false;
                });
                ipcMain.emit(IpcConstants.ReceiveLeaveBy, {}, undefined);
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
            {
                const now = new Date();
                ipcMain.emit(
                    IpcConstants.ReceiveLeaveBy,
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
                mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
                {
                    showSpy.callsFake(() =>
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
                mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
                {
                    const trayStub = stub(global.tray, 'popUpContextMenu').callsFake(() =>
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
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
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
            {
                mainWindow.emit('close', {
                    preventDefault: () => {}
                });
                assert.strictEqual(intervalSpy.calledOnceWithExactly(match.func, 60 * 1000), true);
                clock.nextAsync();
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
