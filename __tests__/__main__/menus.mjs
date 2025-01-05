/* eslint-disable no-undef */
'use strict';

import assert from 'assert';
import { app, BrowserWindow, clipboard, dialog, shell } from 'electron';
import { stub } from 'sinon';

import {
    getContextMenuTemplate,
    getDockMenuTemplate,
    getEditMenuTemplate,
    getHelpMenuTemplate,
    getMainMenuTemplate,
    getViewMenuTemplate
} from '../../js/menus.mjs';

import { i18nMock } from '../../src/configs/i18next.config.mjs';
i18nMock.mock('getCurrentTranslation', stub().callsFake((code) => code));

import { windowsMock } from '../../js/windows.mjs';
import { notificationMock } from '../../js/notification.mjs';
import { updateManagerMock } from '../../js/update-manager.mjs';
import { importExportMock } from '../../js/import-export.mjs';

import Store from 'electron-store';
stub(Store, 'constructor');

describe('menus.js', () =>
{
    const mocks = {};

    describe('getMainMenuTemplate', () =>
    {
        it('Should have 3 options', () =>
        {
            assert.strictEqual(getMainMenuTemplate().length, 3);
        });

        getMainMenuTemplate().forEach((menu) =>
        {
            it('Should be a separator or valid field', () =>
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

        it('Should open waiver window', (done) =>
        {
            windowsMock.mock('openWaiverManagerWindow', stub().callsFake(() =>
            {
                done();
            }));
            getMainMenuTemplate()[0].click();
        });

        it('Should close app', (done) =>
        {
            const quitStub = stub(app, 'quit').callsFake(() =>
            {
                quitStub.restore();
                done();
            });
            getMainMenuTemplate()[2].click();
        });
    });

    describe('getContextMenuTemplate', () =>
    {
        it('Should have 3 options', () =>
        {
            assert.strictEqual(getContextMenuTemplate().length, 3);
        });

        getContextMenuTemplate().forEach((menu) =>
        {
            it('Should be a valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                for (const t of tests)
                {
                    assert.strictEqual(typeof menu[t.field], t.type);
                }
            });

        });

        it('Should quit on click', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'PUNCH_DATE');
                    }
                }
            };
            notificationMock.mock('createNotification', stub().callsFake(() => ({
                show: stub()
            })));
            getContextMenuTemplate(mainWindow)[0].click();
            assert.strictEqual(notificationMock.getMock('createNotification').calledOnce, true);
        });

        it('Should create notification on click', (done) =>
        {
            const mainWindow = {
                show: done
            };
            getContextMenuTemplate(mainWindow)[1].click();
        });

        it('Should show window on click', (done) =>
        {
            const quitStub = stub(app, 'quit').callsFake(() =>
            {
                quitStub.restore();
                done();
            });
            getContextMenuTemplate({})[2].click();
            expect(mocks.quit).toBeCalledTimes(1);
        });
    });

    describe('getDockMenuTemplate', () =>
    {
        it('Should have 1 option', () =>
        {
            assert.strictEqual(getDockMenuTemplate().length, 1);
        });

        getDockMenuTemplate().forEach((menu) =>
        {
            it('Should be a valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                for (const t of tests)
                {
                    assert.strictEqual(typeof menu[t.field], t.type);
                }
            });
        });

        it('Should create notification on click', (done) =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'PUNCH_DATE');
                    }
                }
            };
            notificationMock.mock('createNotification', stub().callsFake(() => ({
                show: done
            })));
            getDockMenuTemplate(mainWindow)[0].click();
            assert.strictEqual(notificationMock.getMock('createNotification').calledOnce, true);
        });
    });

    describe('getViewMenuTemplate', () =>
    {
        it('Should have 2 option', () =>
        {
            assert.strictEqual(getViewMenuTemplate().length, 2);
        });

        getViewMenuTemplate().forEach((menu) =>
        {
            it('Should be a valid field', () =>
            {
                const tests = [
                    {field : 'label', type: 'string'},
                    {field : 'click', type: 'function'},
                ];
                for (const t of tests)
                {
                    assert.strictEqual(typeof menu[t.field], t.type);
                }
            });
        });

        it('Should reload window', (done) =>
        {
            const windowStub = stub(BrowserWindow, 'getFocusedWindow').callsFake(() =>
            {
                return {
                    reload: () =>
                    {
                        windowStub.restore();
                        done();
                    }
                };
            });

            getViewMenuTemplate()[0].click();
            assert.strictEqual(windowStub.calledOnce, true);
        });

        it('Should toggle devtools', (done) =>
        {
            const windowStub = stub(BrowserWindow, 'getFocusedWindow').callsFake(() =>
            {
                return {
                    toggleDevTools: () =>
                    {
                        windowStub.restore();
                        done();
                    }
                };
            });

            getViewMenuTemplate()[1].click();
            assert.strictEqual(windowStub.calledOnce, true);
        });
    });

    describe('getHelpMenuTemplate', () =>
    {
        it('Should have 5 option', () =>
        {
            assert.strictEqual(getHelpMenuTemplate().length, 5);
        });

        getHelpMenuTemplate().forEach((menu) =>
        {
            it('Should be a valid field', () =>
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
                        assert.strictEqual(typeof menu[t.field], t.type);
                    }
                }
            });
        });

        it('Should open github', (done) =>
        {
            const shellStub = stub(shell, 'openExternal').callsFake((key) =>
            {
                assert.strictEqual(key, 'https://github.com/TTLApp/time-to-leave');
                shellStub.restore();
                done();
            });
            getHelpMenuTemplate()[0].click();
        });

        it('Should open github', (done) =>
        {
            updateManagerMock.mock('checkForUpdates', stub().callsFake((key) =>
            {
                assert.strictEqual(key, true);
                done();
            }));
            getHelpMenuTemplate()[1].click();
        });

        it('Should open feedback', (done) =>
        {
            const shellStub = stub(shell, 'openExternal').callsFake((key) =>
            {
                assert.strictEqual(key, 'https://github.com/TTLApp/time-to-leave/issues/new');
                shellStub.restore();
                done();
            });
            getHelpMenuTemplate()[2].click();
        });

        it('Should show about message box and write to clipboard', (done) =>
        {
            const writeTextStub = stub(clipboard, 'writeText');
            const showMessageBoxStub = stub(dialog, 'showMessageBox').resolves({response: 0});
            getHelpMenuTemplate({})[4].click();
            setTimeout(() =>
            {
                assert.strictEqual(showMessageBoxStub.calledOnce, true);
                assert.strictEqual(writeTextStub.calledOnce, true);
                showMessageBoxStub.restore();
                writeTextStub.restore();
                done();
            }, 1000);
        });
        it('Should show about message box', () =>
        {
            const writeTextStub = stub(clipboard, 'writeText');
            const showMessageBoxStub = stub(dialog, 'showMessageBox').resolves({response: 1});
            getHelpMenuTemplate({})[4].click();
            assert.strictEqual(showMessageBoxStub.calledOnce, true);
            assert.strictEqual(writeTextStub.notCalled, true);
            showMessageBoxStub.restore();
            writeTextStub.restore();
        });
        it('Should show about message box', (done) =>
        {
            const consoleSpy = stub(console, 'log');
            const writeTextStub = stub(clipboard, 'writeText');
            const showMessageBoxStub = stub(dialog, 'showMessageBox').rejects({response: 1});
            getHelpMenuTemplate({})[4].click();
            assert.strictEqual(showMessageBoxStub.calledOnce, true);
            assert.strictEqual(writeTextStub.notCalled, true);

            // When the rejection happens, we call console.log with the response
            setTimeout(() =>
            {
                assert.strictEqual(consoleSpy.calledWith({response: 1}), true);
                consoleSpy.restore();
                showMessageBoxStub.restore();
                writeTextStub.restore();
                done();
            }, 500);
        });
    });

    describe('getEditMenuTemplate', () =>
    {
        let showMessageBoxStub;
        before(() =>
        {
            showMessageBoxStub = stub(dialog, 'showMessageBox');
        });

        beforeEach(() =>
        {
            showMessageBoxStub.resetHistory();
        });

        it('Should have 10 options', () =>
        {
            assert.strictEqual(getEditMenuTemplate().length, 10);
        });

        getEditMenuTemplate().forEach((menu) =>
        {
            it('Should be a separator or valid field', () =>
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

        it('Should show dialog for exporting db', () =>
        {
            const showDialogSyncStub = stub(dialog, 'showSaveDialogSync').returns(true);
            importExportMock.mock('exportDatabaseToFile', stub());
            getEditMenuTemplate()[7].click();
            assert.strictEqual(showDialogSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxStub.calledOnce, true);
            assert.strictEqual(importExportMock.getMock('exportDatabaseToFile').calledOnce, true);
            showDialogSyncStub.restore();
        });

        it('Should not show dialog for exporting db', () =>
        {
            const showDialogSyncStub = stub(dialog, 'showSaveDialogSync').returns(false);
            importExportMock.mock('exportDatabaseToFile', stub());
            getEditMenuTemplate()[7].click();
            assert.strictEqual(showDialogSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxStub.notCalled, true);
            assert.strictEqual(importExportMock.getMock('exportDatabaseToFile').notCalled, true);
            showDialogSyncStub.restore();
        });

        it('Should show dialog for importing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            const showOpenDialogSyncStub = stub(dialog, 'showOpenDialogSync').returns(true);
            const showMessageBoxSyncStub = stub(dialog, 'showMessageBoxSync').returns(0);
            importExportMock.mock('importDatabaseFromFile', stub().returns({
                result: true,
                failed: 0
            }));
            getEditMenuTemplate(mainWindow)[8].click();
            assert.strictEqual(showOpenDialogSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxStub.calledOnce, true);
            assert.strictEqual(importExportMock.getMock('importDatabaseFromFile').calledOnce, true);
            showOpenDialogSyncStub.restore();
            showMessageBoxSyncStub.restore();
        });

        it('Should show fail dialog for importing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            const showOpenDialogSyncStub = stub(dialog, 'showOpenDialogSync').returns(true);
            const showMessageBoxSyncStub = stub(dialog, 'showMessageBoxSync').returns(0);
            importExportMock.mock('importDatabaseFromFile', stub().returns({
                result: false,
                failed: 1
            }));
            getEditMenuTemplate(mainWindow)[8].click();
            assert.strictEqual(showOpenDialogSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxSyncStub.calledTwice, true);
            assert.strictEqual(showMessageBoxStub.notCalled, true);
            assert.strictEqual(importExportMock.getMock('importDatabaseFromFile').calledOnce, true);
            showOpenDialogSyncStub.restore();
            showMessageBoxSyncStub.restore();
        });

        it('Should show fail dialog for importing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            const showOpenDialogSyncStub = stub(dialog, 'showOpenDialogSync').returns(true);
            const showMessageBoxSyncStub = stub(dialog, 'showMessageBoxSync').returns(0);
            importExportMock.mock('importDatabaseFromFile', stub().returns({
                result: false,
                failed: 0
            }));
            getEditMenuTemplate(mainWindow)[8].click();
            assert.strictEqual(showOpenDialogSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxSyncStub.calledTwice, true);
            assert.strictEqual(showMessageBoxStub.notCalled, true);
            assert.strictEqual(importExportMock.getMock('importDatabaseFromFile').calledOnce, true);
            showOpenDialogSyncStub.restore();
            showMessageBoxSyncStub.restore();
        });

        it('Should not show dialog for importing db', () =>
        {
            const showOpenDialogSyncStub = stub(dialog, 'showOpenDialogSync').returns(false);
            const showMessageBoxSyncStub = stub(dialog, 'showMessageBoxSync').returns(1);
            importExportMock.mock('importDatabaseFromFile', stub());
            getEditMenuTemplate()[8].click();
            assert.strictEqual(showOpenDialogSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxSyncStub.notCalled, true);
            assert.strictEqual(showMessageBoxStub.notCalled, true);
            assert.strictEqual(importExportMock.getMock('importDatabaseFromFile').notCalled, true);
            showOpenDialogSyncStub.restore();
            showMessageBoxSyncStub.restore();
        });

        it('Should not show dialog for importing db', () =>
        {
            const showOpenDialogSyncStub = stub(dialog, 'showOpenDialogSync').returns(true);
            const showMessageBoxSyncStub = stub(dialog, 'showMessageBoxSync').returns(1);
            importExportMock.mock('importDatabaseFromFile', stub());
            getEditMenuTemplate()[8].click();
            assert.strictEqual(showOpenDialogSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxStub.notCalled, true);
            assert.strictEqual(importExportMock.getMock('importDatabaseFromFile').notCalled, true);
            showOpenDialogSyncStub.restore();
            showMessageBoxSyncStub.restore();
        });

        it('Should not show dialog for clearing db', () =>
        {
            const showMessageBoxSyncStub = stub(dialog, 'showMessageBoxSync').returns(0);
            getEditMenuTemplate()[9].click();
            assert.strictEqual(showMessageBoxSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxStub.notCalled, true);
            showMessageBoxSyncStub.restore();
        });

        it('Should not show dialog for clearing db', () =>
        {
            const mainWindow = {
                webContents: {
                    send: (key) =>
                    {
                        assert.strictEqual(key, 'RELOAD_CALENDAR');
                    }
                }
            };
            const clearStoreStub = stub(Store.prototype, 'clear');
            const showMessageBoxSyncStub = stub(dialog, 'showMessageBoxSync').returns(1);
            getEditMenuTemplate(mainWindow)[9].click();
            assert.strictEqual(showMessageBoxSyncStub.calledOnce, true);
            assert.strictEqual(showMessageBoxStub.calledOnce, true);
            assert.strictEqual(clearStoreStub.calledThrice, true);
            clearStoreStub.restore();
            showMessageBoxSyncStub.restore();
        });

        after(() =>
        {
            showMessageBoxStub.restore();
        });
    });

    afterEach(() =>
    {
        importExportMock.restoreAll();
        notificationMock.restoreAll();
        updateManagerMock.restoreAll();
        windowsMock.restoreAll();
    });
});