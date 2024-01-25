'use strict';

const assert = require('assert');
import { BrowserWindow } from 'electron';
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
        assert.strictEqual(getWaiverWindow(), null);
        assert.strictEqual(tray, null);
        assert.strictEqual(contextMenu, null);
        assert.strictEqual(prefWindow, null);
    });

    test('Should create waiver window', (done) =>
    {
        const mainWindow = new BrowserWindow({
            show: false
        });
        openWaiverManagerWindow(mainWindow);
        assert.notStrictEqual(getWaiverWindow(), null);
        assert.strictEqual(getWaiverWindow() instanceof BrowserWindow, true);
        assert.deepEqual(getWaiverWindow().getSize(), [600, 500]);
        done();
    });

    test('Should show waiver window it has been created', (done) =>
    {
        const mainWindow = new BrowserWindow({
            show: false
        });
        openWaiverManagerWindow(mainWindow);
        openWaiverManagerWindow(mainWindow);
        assert.notStrictEqual(getWaiverWindow(), null);
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
        assert.notStrictEqual(getWaiverWindow(), null);
        assert.strictEqual(global.waiverDay, getDateStr(new Date()));
        done();
    });

    test('Should reset waiverWindow on close', () =>
    {
        const mainWindow = new BrowserWindow({
            show: false
        });
        openWaiverManagerWindow(mainWindow, true);
        getWaiverWindow().emit('close');
        assert.strictEqual(getWaiverWindow(), null);
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
        assert.deepStrictEqual(coordinates, {
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