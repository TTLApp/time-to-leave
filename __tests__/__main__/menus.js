'use strict';

const assert = require('assert');
const { getContextMenuTemplate, getDockMenuTemplate, getEditMenuTemplate, getHelpMenuTemplate, getMainMenuTemplate, getViewMenuTemplate} = require('../../js/menus.js');

jest.mock('../../src/configs/i18next.config.js', () => ({
    getCurrentTranslation: jest.fn().mockImplementation((key) => key)
}));

jest.mock('../../js/windows', () => ({
    openWaiverManagerWindow: jest.fn(),
    prefWindow: jest.fn(),
    getDialogCoordinates: jest.fn()
}));

jest.mock('electron', () =>
{
    const originalModule = jest.requireActual('electron');
    return {
        __esModule: true,
        ...originalModule,
        ipcRenderer: {
            ...originalModule.ipcRenderer,
            invoke: jest.fn().mockResolvedValueOnce('./').mockResolvedValue('./dummy_file.txt'),
        },
        app: {
            ...originalModule.app,
            quit: jest.fn()
        },
        BrowserWindow: {
            ...originalModule.BrowserWindow,
            getFocusedWindow: () =>
            {
                return {
                    reload: jest.fn()
                };
            }
        },
        shell: {
            ...originalModule.shell,
            openExternal: jest.fn()
        },
        dialog: {
            ...originalModule.dialog,
            showSaveDialogSync: jest.fn(),
            showMessageBox: jest.fn(),
            showMessageBoxSync: jest.fn(),
            showOpenDialogSync: jest.fn()
        },
        clipboard: {
            ...originalModule.clipboard,
            writeText: jest.fn()
        }
    };
});

jest.mock('../../js/notification', () => ({
    createNotification: jest.fn().mockImplementation(() => ({
        show: jest.fn()
    }))
}));

jest.mock('../../js/update-manager', () => ({
    checkForUpdates: jest.fn()
}));

jest.mock('../../js/import-export', () => ({
    exportDatabaseToFile: jest.fn(),
    importDatabaseFromFile: jest.fn()
}));

jest.mock('electron-store', () =>
{
    class Store
    {
        constructor() { }
        clear() { }
    }
    return Store;
});

const updateManager = require('../../js/update-manager');
const notification = require('../../js/notification');
const windows = require('../../js/windows');
const importExport = require('../../js/import-export.js');
const {app, BrowserWindow, shell, dialog, clipboard} = require('electron');
const ElectronStore = require('electron-store');
describe('menus.js', () =>
{
    const mocks = {};

    describe('getMainMenuTemplate', () =>
    {
        test('Should have 3 options', () =>
        {
            assert.strictEqual(getMainMenuTemplate().length, 3);
        });

        getMainMenuTemplate().forEach((menu) =>
        {
            test('Should be a separator or valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                if ('type' in menu)
                {
                    assert.strictEqual(menu.type, 'separator');
                }
                else
                {
                    for (const t of tests)
                    {
                        assert.notStrictEqual(menu[t.field], undefined);
                        assert.strictEqual(typeof menu[t.field], t.type);
                    }
                    if ('id' in menu)
                    {
                        assert.strictEqual(typeof menu.id, 'string');
                    }
                    if ('accelerator' in menu)
                    {
                        assert.strictEqual(typeof menu.accelerator, 'string');
                    }
                }
            });
        });

        test('Should open waiver window', (done) =>
        {
            mocks.waiver = jest.spyOn(windows, 'openWaiverManagerWindow').mockImplementationOnce( () =>
            {
                done();
            });
            getMainMenuTemplate()[0].click();
        });

        test('Should close app', (done) =>
        {
            mocks.quit = jest.spyOn(app, 'quit').mockImplementationOnce(() =>
            {
                done();
            });
            getMainMenuTemplate()[2].click();
        });
    });

    describe('getContextMenuTemplate', () =>
    {
        test('Should have 3 options', () =>
        {
            assert.strictEqual(getContextMenuTemplate().length, 3);
        });

        getContextMenuTemplate().forEach((menu) =>
        {
            test('Should be a valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                for (const t of tests)
                {
                    assert.notStrictEqual(menu[t.field], undefined);
                    assert.strictEqual(typeof menu[t.field], t.type);
                }
            });

        });

        test('Should quit on click', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'PUNCH_DATE');
                    }
                }
            };
            mocks.createNotificationSpy = jest.spyOn(notification, 'createNotification');
            getContextMenuTemplate(mainWindow)[0].click();
            expect(mocks.createNotificationSpy).toBeCalledTimes(1);
        });

        test('Should create notification on click', (done) =>
        {
            const mainWindow = {
                show: done
            };
            getContextMenuTemplate(mainWindow)[1].click();
        });

        test('Should show window on click', (done) =>
        {
            mocks.quit = jest.spyOn(app, 'quit').mockImplementationOnce(() =>
            {
                done();
            });
            getContextMenuTemplate({})[2].click();
            expect(mocks.quit).toBeCalledTimes(1);
        });
    });

    describe('getDockMenuTemplate', () =>
    {
        test('Should have 1 option', () =>
        {
            assert.strictEqual(getDockMenuTemplate().length, 1);
        });

        getDockMenuTemplate().forEach((menu) =>
        {
            test('Should be a valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                for (const t of tests)
                {
                    assert.notStrictEqual(menu[t.field], undefined);
                    assert.strictEqual(typeof menu[t.field], t.type);
                }
            });
        });

        test('Should create notification on click', (done) =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'PUNCH_DATE');
                    }
                }
            };
            mocks.createNotificationSpy = jest.spyOn(notification, 'createNotification').mockImplementation(() => ({
                show: done
            }));
            getDockMenuTemplate(mainWindow)[0].click();
            expect(mocks.createNotificationSpy).toBeCalledTimes(1);
        });
    });

    describe('getViewMenuTemplate', () =>
    {
        test('Should have 2 option', () =>
        {
            assert.strictEqual(getViewMenuTemplate().length, 2);
        });

        getViewMenuTemplate().forEach((menu) =>
        {
            test('Should be a valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                for (const t of tests)
                {
                    assert.notStrictEqual(menu[t.field], undefined);
                    assert.strictEqual(typeof menu[t.field], t.type);
                }
            });
        });

        test('Should reload window', (done) =>
        {
            mocks.window = jest.spyOn(BrowserWindow, 'getFocusedWindow').mockImplementation(() =>
            {
                return {
                    reload: () => done()
                };
            });

            getViewMenuTemplate()[0].click();
            expect(mocks.window).toBeCalledTimes(1);
        });

        test('Should toggle devtools', (done) =>
        {
            mocks.window = jest.spyOn(BrowserWindow, 'getFocusedWindow').mockImplementation(() =>
            {
                return {
                    toggleDevTools: () => done()
                };
            });

            getViewMenuTemplate()[1].click();
            expect(mocks.window).toBeCalledTimes(1);
        });
    });

    describe('getHelpMenuTemplate', () =>
    {
        test('Should have 5 option', () =>
        {
            assert.strictEqual(getHelpMenuTemplate().length, 5);
        });

        getHelpMenuTemplate().forEach((menu) =>
        {
            test('Should be a valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                if ('type' in menu)
                {
                    assert.strictEqual(menu.type, 'separator');
                }
                else
                {
                    for (const t of tests)
                    {
                        assert.notStrictEqual(menu[t.field], undefined);
                        assert.strictEqual(typeof menu[t.field], t.type);
                    }
                }
            });
        });

        test('Should open github', (done) =>
        {
            mocks.window = jest.spyOn(shell, 'openExternal').mockImplementation((key) =>
            {
                assert.strictEqual(key, 'https://github.com/thamara/time-to-leave');
                done();
            });
            getHelpMenuTemplate()[0].click();
        });

        test('Should open github', (done) =>
        {
            mocks.window = jest.spyOn(updateManager, 'checkForUpdates').mockImplementation((key) =>
            {
                assert.strictEqual(key, true);
                done();
            });
            getHelpMenuTemplate()[1].click();
        });

        test('Should open feedback', (done) =>
        {
            mocks.window = jest.spyOn(shell, 'openExternal').mockImplementation((key) =>
            {
                assert.strictEqual(key, 'https://github.com/thamara/time-to-leave/issues/new');
                done();
            });
            getHelpMenuTemplate()[2].click();
        });

        test('Should show about message box and writ to clipboard', () =>
        {
            mocks.writeText = jest.spyOn(clipboard, 'writeText').mockImplementation(() => {});
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockResolvedValue({response: 0});
            getHelpMenuTemplate({})[4].click();
            setTimeout(() =>
            {
                expect(mocks.showMessageBox).toHaveBeenCalledTimes(1);
                expect(mocks.writeText).toHaveBeenCalledTimes(1);
            }, 1000);
        });
        test('Should show about message box', () =>
        {
            mocks.writeText = jest.spyOn(clipboard, 'writeText').mockImplementation(() => {});
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockResolvedValue({response: 1});
            getHelpMenuTemplate({})[4].click();
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(1);
            expect(mocks.writeText).toHaveBeenCalledTimes(0);
        });
        test('Should show about message box', (done) =>
        {
            mocks.consoleLog = jest.spyOn(console, 'log').mockImplementation();
            mocks.writeText = jest.spyOn(clipboard, 'writeText').mockImplementation(() => {});
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockRejectedValue({response: 1});
            getHelpMenuTemplate({})[4].click();
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(1);
            expect(mocks.writeText).toHaveBeenCalledTimes(0);

            // When the rejection happens, we call console.log with the response
            setTimeout(() =>
            {
                expect(mocks.consoleLog).toHaveBeenCalledWith({response: 1});
                done();
            }, 500);
        });
    });

    describe('getEditMenuTemplate', () =>
    {
        test('Should have 10 options', () =>
        {
            assert.strictEqual(getEditMenuTemplate().length, 10);
        });

        getEditMenuTemplate().forEach((menu) =>
        {
            test('Should be a separator or valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                ];
                if ('type' in menu)
                {
                    assert.strictEqual(menu.type, 'separator');
                }
                else
                {
                    for (const t of tests)
                    {
                        assert.notStrictEqual(menu[t.field], undefined);
                        assert.strictEqual(typeof menu[t.field], t.type);
                    }
                    if ('id' in menu)
                    {
                        assert.strictEqual(typeof menu.id, 'string');
                    }
                    if ('accelerator' in menu)
                    {
                        assert.strictEqual(typeof menu.accelerator, 'string');
                    }
                    if ('selector' in menu)
                    {
                        assert.strictEqual(typeof menu.selector, 'string');
                    }
                    if ('click' in menu)
                    {
                        assert.strictEqual(typeof menu.click, 'function');
                    }
                }
            });
        });

        test('Should show dialog for exporting db', () =>
        {
            mocks.showSaveDialogSync = jest.spyOn(dialog, 'showSaveDialogSync').mockImplementation(() => true);
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.export = jest.spyOn(importExport, 'exportDatabaseToFile').mockImplementation(() =>{ });
            getEditMenuTemplate()[7].click();
            expect(mocks.showSaveDialogSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(1);
            expect(mocks.export).toHaveBeenCalledTimes(1);
        });

        test('Should not show dialog for exporting db', () =>
        {
            mocks.showSaveDialogSync = jest.spyOn(dialog, 'showSaveDialogSync').mockImplementation(() => false);
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.export = jest.spyOn(importExport, 'exportDatabaseToFile').mockImplementation(() =>{ });
            getEditMenuTemplate()[7].click();
            expect(mocks.showSaveDialogSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(0);
            expect(mocks.export).toHaveBeenCalledTimes(0);
        });

        test('Should show dialog for importing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            mocks.showOpenDialogSync = jest.spyOn(dialog, 'showOpenDialogSync').mockImplementation(() => true);
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.showMessageBoxSync = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => 0);
            mocks.export = jest.spyOn(importExport, 'importDatabaseFromFile').mockImplementation(() => ({
                result: true,
                failed: 0
            }));
            getEditMenuTemplate(mainWindow)[8].click();
            expect(mocks.showOpenDialogSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBoxSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(1);
            expect(mocks.export).toHaveBeenCalledTimes(1);
        });

        test('Should show fail dialog for importing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            mocks.showOpenDialogSync = jest.spyOn(dialog, 'showOpenDialogSync').mockImplementation(() => true);
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.showMessageBoxSync = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => 0);
            mocks.export = jest.spyOn(importExport, 'importDatabaseFromFile').mockImplementation(() => ({
                result: false,
                failed: 1
            }));
            getEditMenuTemplate(mainWindow)[8].click();
            expect(mocks.showOpenDialogSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBoxSync).toHaveBeenCalledTimes(2);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(0);
            expect(mocks.export).toHaveBeenCalledTimes(1);
        });

        test('Should show fail dialog for importing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            mocks.showOpenDialogSync = jest.spyOn(dialog, 'showOpenDialogSync').mockImplementation(() => true);
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.showMessageBoxSync = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => 0);
            mocks.export = jest.spyOn(importExport, 'importDatabaseFromFile').mockImplementation(() => ({
                result: false,
                failed: 0
            }));
            getEditMenuTemplate(mainWindow)[8].click();
            expect(mocks.showOpenDialogSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBoxSync).toHaveBeenCalledTimes(2);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(0);
            expect(mocks.export).toHaveBeenCalledTimes(1);
        });

        test('Should not show dialog for importing db', () =>
        {
            mocks.showOpenDialogSync = jest.spyOn(dialog, 'showOpenDialogSync').mockImplementation(() => false);
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.showMessageBoxSync = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => 1);
            mocks.export = jest.spyOn(importExport, 'importDatabaseFromFile').mockImplementation(() =>{ });
            getEditMenuTemplate()[8].click();
            expect(mocks.showOpenDialogSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBoxSync).toHaveBeenCalledTimes(0);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(0);
            expect(mocks.export).toHaveBeenCalledTimes(0);
        });

        test('Should not show dialog for importing db', () =>
        {
            mocks.showOpenDialogSync = jest.spyOn(dialog, 'showOpenDialogSync').mockImplementation(() => true);
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.showMessageBoxSync = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => 1);
            mocks.export = jest.spyOn(importExport, 'importDatabaseFromFile').mockImplementation(() =>{ });
            getEditMenuTemplate()[8].click();
            expect(mocks.showOpenDialogSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBoxSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(0);
            expect(mocks.export).toHaveBeenCalledTimes(0);
        });

        test('Should not show dialog for clearing db', () =>
        {
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.showMessageBoxSync = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => 0);
            getEditMenuTemplate()[9].click();
            expect(mocks.showMessageBoxSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(0);
        });

        test('Should not show dialog for clearing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            mocks.store = jest.spyOn(ElectronStore.prototype, 'clear').mockImplementation(() => {});
            mocks.showMessageBox = jest.spyOn(dialog, 'showMessageBox').mockImplementation(() =>{ });
            mocks.showMessageBoxSync = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => 1);
            getEditMenuTemplate(mainWindow)[9].click();
            expect(mocks.showMessageBoxSync).toHaveBeenCalledTimes(1);
            expect(mocks.showMessageBox).toHaveBeenCalledTimes(1);
            expect(mocks.store).toHaveBeenCalledTimes(3);
        });
    });

    afterEach(() =>
    {
        for (const mock of Object.values(mocks))
        {
            mock.mockClear();
        }
    });

    afterAll(() =>
    {
        jest.restoreAllMocks();
    });

});