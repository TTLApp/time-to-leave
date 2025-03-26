'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';
import { BrowserWindow, ipcMain } from 'electron';
import { stub } from 'sinon';

import { formatDayId, displayWaiverWindow } from '../../renderer/workday-waiver-aux.js';
import IpcConstants from '../../js/ipc-constants.mjs';
import Windows from '../../js/windows.mjs';

const window_backup = global.window;

describe('Workday Waiver Aux', function()
{
    let showStub;
    let parentWindow;
    before(() =>
    {
        showStub = stub(BrowserWindow.prototype, 'show');

        parentWindow = new BrowserWindow({
            show: false});

        // Mocking call
        // TODO: find a better way to mock this or even really test it, we're just copying the IPC implementation here
        global.window = {
            calendarApi: {
                displayWaiverWindow: (waiverDay) =>
                {
                    global.waiverDay = waiverDay;
                    Windows.openWaiverManagerWindow(parentWindow);
                }
            }
        };

        // Mocking for tests below
        ipcMain.handle(IpcConstants.GetWaiverDay, () =>
        {
            return new Promise((resolve) =>
            {
                resolve(global.waiverDay);
            });
        });
        ipcMain.removeHandler(IpcConstants.GetLanguageData);
        ipcMain.handle(IpcConstants.GetLanguageData, () => ({
            'language': 'en',
            'data': {
                'translation': {
                    '$WorkdayWaiver': {
                        'hideNonWorkingDay': ''
                    }
                }
            }
        }));
        ipcMain.handle(IpcConstants.GetWaiverStoreContents, () =>
        {
            return new Promise(resolve => resolve({}));
        });
        ipcMain.handle(IpcConstants.GetCountries, () =>
        {
            return new Promise(resolve => resolve([]));
        });
    });

    const validJSDay = '2020-03-10';
    const validJSDay2 = '2020-00-10';
    const garbageString = '..as';
    const incompleteDate = '---';

    describe('formatDayId(dayId)', function()
    {
        it('should be valid', () =>
        {
            assert.strictEqual(formatDayId(validJSDay), '2020-04-10');
            assert.strictEqual(formatDayId(validJSDay2), '2020-01-10');
        });

        it('should not be valid', () =>
        {
            assert.strictEqual(formatDayId(garbageString), NaN);
            assert.strictEqual(formatDayId(incompleteDate), NaN);
        });
    });

    describe('displayWaiverWindow(dayId)', function()
    {
        it('should do seamless call 1', (done) =>
        {
            displayWaiverWindow(validJSDay);
            Windows.getWaiverWindow().webContents.ipc.once(IpcConstants.WindowReadyToShow, () =>
            {
                Windows.getWaiverWindow().close();
                done();
            });
        });

        it('should do seamless call 2', (done) =>
        {
            displayWaiverWindow(validJSDay2);
            Windows.getWaiverWindow().webContents.ipc.once(IpcConstants.WindowReadyToShow, () =>
            {
                Windows.getWaiverWindow().close();
                done();
            });
        });

        it('should do seamless call 3', (done) =>
        {
            displayWaiverWindow(garbageString);
            Windows.getWaiverWindow().webContents.ipc.once(IpcConstants.WindowReadyToShow, () =>
            {
                Windows.getWaiverWindow().close();
                done();
            });
        });

        it('should do seamless call 4', (done) =>
        {
            displayWaiverWindow(incompleteDate);
            Windows.getWaiverWindow().webContents.ipc.once(IpcConstants.WindowReadyToShow, () =>
            {
                Windows.getWaiverWindow().close();
                done();
            });
        });
    });

    after(() =>
    {
        showStub.restore();
        global.window = window_backup;

        ipcMain.removeHandler(IpcConstants.GetWaiverDay);
        ipcMain.removeHandler(IpcConstants.GetLanguageData);
        ipcMain.removeHandler(IpcConstants.GetWaiverStoreContents);
        ipcMain.removeHandler(IpcConstants.GetCountries);
    });

    // TODO: Come up with a way to test displayWaiverWindow's opening of a window
});
