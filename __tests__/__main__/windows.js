const { BrowserWindow } = require('electron');
const { getDateStr } = require('../../js/date-aux.js');
const windows = require('../../js/windows.js');
const {getWaiverWindow, tray, contextMenu, prefWindow, resetWindowsElements, openWaiverManagerWindow, getDialogCoordinates} = require('../../js/windows.js');

describe('windows.js', () =>
{
    let showSpy;
    let loadSpy;
    beforeEach(() =>
    {
        // Avoid window being shown
        loadSpy = jest.spyOn(BrowserWindow.prototype, 'loadURL').mockImplementation(() => {});
        showSpy = jest.spyOn(BrowserWindow.prototype, 'show').mockImplementation(() => {});
        jest.spyOn(windows, 'getDialogCoordinates').mockImplementation(() => ({x:0, y:0}));
    });

    test('Elements should be null on starting', () =>
    {
        expect(getWaiverWindow()).toBe(null);
        expect(tray).toBe(null);
        expect(contextMenu).toBe(null);
        expect(prefWindow).toBe(null);
    });

    test('Should create waiver window', (done) =>
    {
        const mainWindow = new BrowserWindow({
            show: false
        });
        openWaiverManagerWindow(mainWindow);
        expect(getWaiverWindow()).not.toBe(null);
        expect(getWaiverWindow()).toBeInstanceOf(BrowserWindow);
        expect(getWaiverWindow().getSize()).toEqual([600, 500]);
        done();
    });

    test('Should show waiver window it has been created', (done) =>
    {
        const mainWindow = new BrowserWindow({
            show: false
        });
        openWaiverManagerWindow(mainWindow);
        openWaiverManagerWindow(mainWindow);
        expect(getWaiverWindow()).not.toBe(null);
        // It should only load once the URL because it already exists
        expect(showSpy).toHaveBeenCalledTimes(2);
        expect(loadSpy).toHaveBeenCalledTimes(1);
        done();
    });

    test('Should set global waiverDay when event is sent', (done) =>
    {
        const mainWindow = new BrowserWindow({
            show: false
        });
        openWaiverManagerWindow(mainWindow, true);
        expect(getWaiverWindow()).not.toBe(null);
        expect(global.waiverDay).toBe(getDateStr(new Date()));
        done();
    });

    test('Should reset waiverWindow on close', () =>
    {
        const mainWindow = new BrowserWindow({
            show: false
        });
        openWaiverManagerWindow(mainWindow, true);
        getWaiverWindow().emit('close');
        expect(getWaiverWindow()).toBe(null);
    });

    test('Should get dialog coordinates', () =>
    {
        const coordinates = getDialogCoordinates(500, 250, {
            getBounds: () => ({
                x: 200,
                y: 300,
                width: 400,
                height: 600
            })
        });
        expect(coordinates).toEqual({
            x: 150,
            y: 475
        });
    });

    afterEach(() =>
    {
        jest.restoreAllMocks();
        resetWindowsElements();
    });
});