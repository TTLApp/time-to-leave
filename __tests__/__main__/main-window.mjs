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
    toggleMainWindowWait,
    triggerStartupDialogs
} from '../../js/main-window.mjs';

import UpdateManager from '../../js/update-manager.mjs';
import IpcConstants from '../../js/ipc-constants.mjs';

ipcMain.removeHandler(IpcConstants.GetLanguageData);
ipcMain.handle(IpcConstants.GetLanguageData, () => ({
    'language': 'en',
    'data': {
        'translation': {
            '$BaseCalendar': {
                'day-done-balance': '',
                'month-balance': '',
                'month-balance-title': '',
                'overall-balance': '',
                'overall-balance-title': '',
                'switch-view': ''
            },
            '$DateUtil': {
                'april': '',
                'august': '',
                'december': '',
                'february': '',
                'fri': '',
                'january': '',
                'july': '',
                'june': '',
                'march': '',
                'may': '',
                'mon': '',
                'november': '',
                'october': '',
                'sat': '',
                'september': '',
                'sun': '',
                'thu': '',
                'tue': '',
                'wed': ''
            },
            '$DayCalendar': {
                'add-entry': '',
                'current-day': '',
                'day-total': '',
                'entry': '',
                'entry-removal-confirmation': '',
                'leave-by': '',
                'next-day': '',
                'no': '',
                'not-a-working-day': '',
                'previous-day': '',
                'remove-entry': '',
                'waived-day': '',
                'yes': ''
            },
            '$Menu': {
                'punch-time': ''
            },
            '$MonthCalendar': {
                'add-entry': '',
                'add-waiver-day': '',
                'current-month': '',
                'day': '',
                'entry-removal-confirmation': '',
                'last-day-balance': '',
                'leave-by': '',
                'next-month': '',
                'no': '',
                'on': '',
                'previous-month': '',
                'remove-entry': '',
                'scroll-left-entry': '',
                'scroll-right-entry': '',
                'total': '',
                'waived-day': '',
                'working-days': '',
                'working-days-title': '',
                'yes': ''
            }
        }}
}));

describe('main-window.mjs', () =>
{
    let showSpy;
    before(() =>
    {
        // Avoid showing the window
        showSpy = stub(BrowserWindow.prototype, 'show');

        ipcMain.handle(IpcConstants.GetStoreContents, () => new Promise(resolve => resolve({})));
        ipcMain.handle(IpcConstants.GetWaiverStoreContents, () => new Promise(resolve => resolve({})));
        ipcMain.handle(IpcConstants.ComputeAllTimeBalanceUntil, () => new Promise(resolve => resolve({})));
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
        it('It should send new event to ipcRenderer', function(done)
        {
            this.timeout(5000);

            assert.strictEqual(savePreferences({
                ...getDefaultPreferences(),
                ['view']: 'month'
            }), true);
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();

            const windowSpy = spy(mainWindow.webContents, 'send');
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, () =>
            {
                const windowSize = mainWindow.getSize();
                assert.strictEqual(windowSize.length, 2);

                // First, check the month view sizes
                // For some reason the default height is changing on CI
                const possibleHeights = [800, 970, 728, 1025];
                assert.strictEqual(Math.abs(windowSize[0] - 1010) < 5, true, `Width was ${windowSize[0]}`);
                assert.strictEqual(possibleHeights.indexOf(windowSize[1]) !== -1, true, `Height was ${windowSize[1]}`);

                mainWindow.webContents.on('content-bounds-updated', () =>
                {
                    setTimeout(() =>
                    {
                        const windowSize = mainWindow.getSize();
                        assert.strictEqual(windowSize.length, 2);

                        // Now in day view sizes
                        assert.strictEqual(Math.abs(windowSize[0] - 500) < 5, true, `Width was ${windowSize[0]}`);
                        assert.strictEqual(Math.abs(windowSize[1] - 500) < 5, true, `Height was ${windowSize[1]}`);

                        assert.strictEqual(windowSpy.calledOnce, true);

                        const firstCall = windowSpy.firstCall;
                        assert.strictEqual(firstCall.args[0], IpcConstants.PreferencesSaved);
                        assert.strictEqual(firstCall.args[1]['view'], 'day');

                        windowSpy.restore();
                        done();
                    }, 300);
                });

                ipcMain.emit(IpcConstants.SwitchView);
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

    describe('toggleMainWindowWait()', () =>
    {
        it('Starts without wait class', (done) =>
        {
            createWindow();
            const mainWindow = getMainWindow();
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, async() =>
            {
                const hasClass = await mainWindow.webContents.executeJavaScript('$("html").hasClass("wait")');
                assert.strictEqual(hasClass, false, 'Starts without wait class');

                done();
            });
        });

        it('Toggling wait state for the window', (done) =>
        {
            createWindow();
            const mainWindow = getMainWindow();
            mainWindow.webContents.ipc.on(IpcConstants.WindowReadyToShow, async() =>
            {
                toggleMainWindowWait(true);
                await new Promise(r => setTimeout(r, 50));
                let hasClass = await mainWindow.webContents.executeJavaScript('$("html").hasClass("wait")');
                assert.strictEqual(hasClass, true, 'Now has wait class');

                toggleMainWindowWait(false);
                await new Promise(r => setTimeout(r, 50));
                hasClass = await mainWindow.webContents.executeJavaScript('$("html").hasClass("wait")');
                assert.strictEqual(hasClass, false, 'Back to not having wait class');

                done();
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

        ipcMain.removeHandler(IpcConstants.GetStoreContents);
        ipcMain.removeHandler(IpcConstants.GetWaiverStoreContents);
        ipcMain.removeHandler(IpcConstants.ComputeAllTimeBalanceUntil);
    });
});
