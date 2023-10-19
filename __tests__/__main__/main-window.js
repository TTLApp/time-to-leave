const notification = require('../../js/notification.js');
const userPreferences = require('../../js/user-preferences.js');
const { savePreferences, defaultPreferences, resetPreferences } = userPreferences;
const { BrowserWindow, ipcMain } = require('electron');

jest.mock('../../js/update-manager', () => ({
    checkForUpdates: jest.fn(),
    shouldCheckForUpdates: jest.fn()
}));

const mainWindowModule = require('../../js/main-window.js');
const { getMainWindow, createWindow, resetMainWindow, getLeaveByInterval, getWindowTray, triggerStartupDialogs } = mainWindowModule;
const updateManager = require('../../js/update-manager.js');

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
            expect(getWindowTray()).toBe(null);
            expect(getMainWindow()).toBe(null);
            expect(getLeaveByInterval()).toBe(null);
        });

        test('Should get window', () =>
        {
            createWindow();
            expect(showSpy).toHaveBeenCalledTimes(1);
            expect(getMainWindow()).toBeInstanceOf(BrowserWindow);
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
            expect(mainWindow).toBeInstanceOf(BrowserWindow);
            expect(ipcMain.listenerCount('TOGGLE_TRAY_PUNCH_TIME')).toBe(1);
            expect(ipcMain.listenerCount('RESIZE_MAIN_WINDOW')).toBe(1);
            expect(ipcMain.listenerCount('VIEW_CHANGED')).toBe(1);
            expect(ipcMain.listenerCount('RECEIVE_LEAVE_BY')).toBe(1);
            expect(mainWindow.listenerCount('minimize')).toBe(2);
            expect(mainWindow.listenerCount('close')).toBe(1);
            expect(loadFileSpy).toHaveBeenCalledTimes(1);
            expect(showSpy).toHaveBeenCalledTimes(1);
            expect(getLeaveByInterval()).not.toBe(null);
            expect(getLeaveByInterval()._idleNext.expiry).toBeGreaterThan(0);
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
                ipcMain.emit('RESIZE_MAIN_WINDOW', {}, 500, 600);
                expect(mainWindow.getSize()).toEqual([500, 600]);
                done();
            });
        });
        test('It should not resize window if values are smaller than minimum', (done) =>
        {
            createWindow();
            /**
             * @type {BrowserWindow}
             */
            const mainWindow = getMainWindow();
            mainWindow.on('ready-to-show', () =>
            {
                ipcMain.emit('RESIZE_MAIN_WINDOW', {}, 100, 100);
                expect(mainWindow.getSize()).toEqual([450, 450]);
                done();
            });
        });
    });

    describe('emit VIEW_CHANGED', () =>
    {
        test('It should send new event to ipcRendered', (done) =>
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
                ipcMain.removeHandler('GET_LANGUAGE_DATA');
                ipcMain.handle('GET_LANGUAGE_DATA', () => ({
                    'language': 'en',
                    'data': {}
                }));
                ipcMain.on('FINISH_TEST', (event, savedPreferences) =>
                {
                    expect(windowSpy).toBeCalledTimes(1);
                    expect(savedPreferences).toEqual({ new: 'prefrences' });
                    done();
                });
                ipcMain.emit('VIEW_CHANGED', {}, { new: 'prefrences' });
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
                expect(mainWindow.isVisible()).toBe(false);
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
                expect(mainWindow.isDestroyed()).toBe(false);
                expect(mainWindow.isVisible()).toBe(false);
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
                expect(mainWindow.isDestroyed()).toBe(true);
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