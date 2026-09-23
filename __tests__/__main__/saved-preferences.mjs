'use strict';

import assert from 'assert';
import { app } from 'electron';
import { createRequire } from 'module';
import { spy, stub } from 'sinon';

import {
    confirmLanguageRestart,
    getRelaunchArguments,
    handleLanguageRestart,
} from '../../js/saved-preferences.mjs';
import { resetPreferences } from '../../js/user-preferences.mjs';

const require = createRequire(import.meta.url);
const WindowAux = require('../../js/window-aux.cjs');

describe('Saved preferences', () =>
{
    afterEach(() =>
    {
        resetPreferences();
    });

    it('getRelaunchArguments() strips stale locale reopens and keeps current windows open', () =>
    {
        const originalArgv = process.argv.slice();
        process.argv = ['electron', 'app', '--lang=fr', '--reopen-preferences', '--reopen-waiver', '--foo'];
        global.prefWindow = { id: 'pref-window' };
        global.waiverWindow = { id: 'waiver-window' };

        try
        {
            const relaunchArgs = getRelaunchArguments('es');
            assert.deepStrictEqual(relaunchArgs, ['app', '--foo', '--reopen-preferences', '--reopen-waiver', '--lang=es']);
        }
        finally
        {
            process.argv = originalArgv;
            global.prefWindow = null;
            global.waiverWindow = null;
        }
    });

    it('getRelaunchArguments() omits reopen flags when no auxiliary windows are open', () =>
    {
        const originalArgv = process.argv.slice();
        process.argv = ['electron', 'app', '--lang=fr', '--reopen-preferences', '--reopen-waiver', '--foo'];
        global.prefWindow = null;
        global.waiverWindow = null;

        try
        {
            const relaunchArgs = getRelaunchArguments('es');
            assert.deepStrictEqual(relaunchArgs, ['app', '--foo', '--lang=es']);
        }
        finally
        {
            process.argv = originalArgv;
            global.prefWindow = null;
            global.waiverWindow = null;
        }
    });

    it('confirmLanguageRestart() accepts the restart prompt', async() =>
    {
        const showDialogStub = stub(WindowAux, 'showDialog').resolves({ response: 0 });

        try
        {
            const shouldRestart = await confirmLanguageRestart();

            assert.strictEqual(shouldRestart, true);
            assert.strictEqual(showDialogStub.calledOnce, true);
        }
        finally
        {
            showDialogStub.restore();
        }
    });

    it('handleLanguageRestart() does nothing when the current language already matches', () =>
    {
        const getSwitchValueStub = stub(app.commandLine, 'getSwitchValue');
        getSwitchValueStub.withArgs('lang').returns('fr');
        const relaunchSpy = spy(app, 'relaunch');
        const exitSpy = spy(app, 'exit');

        try
        {
            handleLanguageRestart({ language: 'fr' });

            assert.strictEqual(relaunchSpy.called, false);
            assert.strictEqual(exitSpy.called, false);
        }
        finally
        {
            getSwitchValueStub.restore();
            relaunchSpy.restore();
            exitSpy.restore();
        }
    });

    it('handleLanguageRestart() asks to restart and relaunches when the user confirms', async() =>
    {
        const getSwitchValueStub = stub(app.commandLine, 'getSwitchValue');
        getSwitchValueStub.withArgs('lang').returns('en');
        const relaunchStub = stub(app, 'relaunch');
        const exitStub = stub(app, 'exit');
        const showDialogStub = stub(WindowAux, 'showDialog').resolves({ response: 0 });

        try
        {
            handleLanguageRestart({ language: 'es' });

            await new Promise((resolve) => setTimeout(resolve, 0));

            assert.strictEqual(showDialogStub.calledOnce, true);
            assert.strictEqual(relaunchStub.calledOnce, true);
            assert.strictEqual(exitStub.calledOnceWith(0), true);
        }
        finally
        {
            getSwitchValueStub.restore();
            relaunchStub.restore();
            exitStub.restore();
            showDialogStub.restore();
        }
    });
});
