'use strict';

const assert = require('assert');
const notification = require('../../js/notification.js');
const userPreferences = require('../../js/user-preferences.js');
const { savePreferences, defaultPreferences, resetPreferences } = userPreferences;
import { app, BrowserWindow, ipcMain } from 'electron';

jest.mock('../../js/update-manager', () => ({
    checkForUpdates: jest.fn(),
    shouldCheckForUpdates: jest.fn()
}));

const mainWindowModule = require('../../js/main-window.js');
const { getMainWindow, createWindow, resetMainWindow, getLeaveByInterval, getWindowTray, triggerStartupDialogs } = mainWindowModule;
const updateManager = require('../../js/update-manager.js');

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

describe('main-window.js', () =>
{
    let showSpy;
    beforeEach(() =>
    {
        // Avoid showing the window
        showSpy = jest.spyOn(BrowserWindow.prototype, 'show').mockImplementationOnce(() => {});
    });

    describe('getMainWindow', () =>
    {
        test('Should be null if it has not been started', () =>
        {
            assert.strictEqual(getWindowTray(), null);
            assert.strictEqual(getMainWindow(), null);
            assert.strictEqual(getLeaveByInterval(), null);
        });

        test('Should get window', () =>
        {
            createWindow();
            expect(showSpy).toHaveBeenCalledTimes(1);
            assert.strictEqual(getMainWindow() instanceof BrowserWindow, true);
        });
    });

    describe('createWindow()', () =>
    {
        test('Should create and get window default behaviour', () =>
        {
            const loadFileSpy = jest.spyOn(BrowserWindow.prototype, 'loadFile');
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
            assert.strictEqual(mainWindow.listenerCount('close'), 1);
            expect(loadFileSpy).toHaveBeenCalledTimes(1);
            expect(showSpy).toHaveBeenCalledTimes(1);
            assert.notStrictEqual(getLeaveByInterval(), null);
            assert.strictEqual(getLeaveByInterval()._idleNext.expiry > 0, true);
        });
    });

    describe('emit RESIZE_MAIN_WINDOW', () =>
    {
        test('It should resize window', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                ipcMain.emit('RESIZE_MAIN_WINDOW');
                expect(mainWindow.getSize()).toEqual([1010, 800]);
                done();
            });
        });
        test('It should not resize window if values are smaller than minimum', (done) =>
        {
            savePreferences({
                ...defaultPreferences,
                ['view']: 'day'
            });
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                ipcMain.emit('RESIZE_MAIN_WINDOW');
                expect(mainWindow.getSize()).toEqual([500, 500]);
                done();
            });
        });
    });

    describe('emit SWITCH_VIEW', () =>
    {
        test('It should send new event to ipcRenderer', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                const windowSpy = jest.spyOn(mainWindow.webContents, 'send').mockImplementation((event, savedPreferences) =>
                {
                    ipcMain.emit('FINISH_TEST', event, savedPreferences);
                });
                ipcMain.on('FINISH_TEST', (event, savedPreferences) =>
                {
                    expect(windowSpy).toBeCalledTimes(1);
                    expect(savedPreferences['view']).toEqual('day');
                    done();
                });
                ipcMain.emit('SWITCH_VIEW');
                windowSpy.mockRestore();
            });
        });
    });

    describe('emit RECEIVE_LEAVE_BY', () =>
    {
        test('Should not show notification when notifications is not sent', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                const windowSpy = jest.spyOn(notification, 'createLeaveNotification').mockImplementation(() =>
                {
                    return false;
                });
                ipcMain.emit('RECEIVE_LEAVE_BY', {}, undefined);
                expect(windowSpy).toBeCalledTimes(1);
                windowSpy.mockRestore();
                done();
            });
        });

        test('Should show notification', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                const windowSpy = jest.spyOn(notification, 'createLeaveNotification').mockImplementation(() =>
                {
                    return {
                        show: () =>
                        {
                            windowSpy.mockRestore();
                            done();
                        }
                    };
                });
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
            test('It should show window on click', (done) =>
            {
                createWindow();
                /**
                 * @type {BrowserWindow}
                 */
                const mainWindow = getMainWindow();
                mainWindow.on('ready-to-show', () =>
                {
                    const showSpy = jest.spyOn(mainWindow, 'show').mockImplementation(() =>
                    {
                        ipcMain.emit('FINISH_TEST');
                    });
                    ipcMain.on('FINISH_TEST', () =>
                    {
                        expect(showSpy).toHaveBeenCalledTimes(2);
                        done();
                    });
                    getWindowTray().emit('click');
                });
            });
        });

        describe('emit right-click', () =>
        {
            test('It should show menu on right-click', (done) =>
            {
                createWindow();
                /**
                 * @type {BrowserWindow}
                 */
                const mainWindow = getMainWindow();
                mainWindow.on('ready-to-show', () =>
                {
                    const showSpy = jest.spyOn(getWindowTray(), 'popUpContextMenu').mockImplementation(() =>
                    {
                        ipcMain.emit('FINISH_TEST');
                    });
                    ipcMain.on('FINISH_TEST', () =>
                    {
                        expect(showSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
                    getWindowTray().emit('right-click');
                });
            });
        });
    });

    describe('emit minimize', () =>
    {
        test('Should get hidden if minimize-to-tray is true', (done) =>
        {
            savePreferences({
                ...defaultPreferences,
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

        test('Should minimize if minimize-to-tray is false', (done) =>
        {
            savePreferences({
                ...defaultPreferences,
                ['minimize-to-tray']: false
            });

            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            const minimizeSpy = jest.spyOn(mainWindow, 'minimize');
            mainWindow.on('ready-to-show', () =>
            {
                mainWindow.emit('minimize', {});
                expect(minimizeSpy).toBeCalled();
                done();
            });
        });
    });

    describe('emit close', () =>
    {
        test('Should get hidden if close-to-tray is true', (done) =>
        {
            savePreferences({
                ...defaultPreferences,
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

        test('Should close if close-to-tray is false', (done) =>
        {
            savePreferences({
                ...defaultPreferences,
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
        test('Should check for updates and try to migrate', () =>
        {
            const shouldCheckUpdate = jest.spyOn(updateManager, 'shouldCheckForUpdates').mockImplementationOnce(() => true);
            const checkUpdate = jest.spyOn(updateManager, 'checkForUpdates').mockImplementationOnce(() => {});

            triggerStartupDialogs();
            expect(shouldCheckUpdate).toHaveBeenCalledTimes(1);
            expect(checkUpdate).toHaveBeenCalledTimes(1);
        });

        test('Should check for updates and try to migrate', () =>
        {
            const shouldCheckUpdate = jest.spyOn(updateManager, 'shouldCheckForUpdates').mockImplementationOnce(() => false);
            const checkUpdate = jest.spyOn(updateManager, 'checkForUpdates').mockImplementationOnce(() => {});

            triggerStartupDialogs();
            expect(shouldCheckUpdate).toHaveBeenCalledTimes(2);
            expect(checkUpdate).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET_LEAVE_BY interval', () =>
    {
        test('Should create interval', (done) =>
        {
            jest.useFakeTimers();
            jest.spyOn(global, 'setInterval');

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
                expect(setInterval).toHaveBeenCalledTimes(1);
                expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 60 * 1000);
                done();
            });
        });

        test('Should run interval', (done) =>
        {
            jest.useFakeTimers();
            jest.spyOn(global, 'setInterval');
            jest.clearAllTimers();
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            jest.spyOn(mainWindow.webContents, 'send').mockImplementationOnce(() =>
            {
                done();
            });
            mainWindow.on('ready-to-show', () =>
            {
                mainWindow.emit('close', {
                    preventDefault: () => {}
                });
                expect(setInterval).toHaveBeenCalledTimes(1);
                expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 60 * 1000);
                jest.runOnlyPendingTimers();
            });
        });
    });

    afterEach(() =>
    {
        jest.restoreAllMocks();
        resetMainWindow();
        resetPreferences();
    });

});