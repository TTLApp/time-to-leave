/* eslint-disable no-undef */
'use strict';

const path = require('path');
const { remote } = require('electron');
const { BrowserWindow } = remote;
import * as windowAux from '../../js/window-aux.js';

describe('window-aux.js Testing', function()
{
    process.env.NODE_ENV = 'test';

    const mockHtmlPath = path.join('file://', __dirname, '../../__mocks__/mock.html');

    // const devToolsShortcut = new KeyboardEvent('keyup', {keyCode: 73, ctrlKey: true, shiftKey: true});
    // const badDevToolsShortcut = new KeyboardEvent('keyup', {keyCode: 74, ctrlKey: true, shiftKey: true});
    const browserWindowOptions = {
        webPreferences: {
            enableRemoteModule: true,
            nodeIntegration: true
        }
    };
    const timeoutValue = 1500;

    // Testcase no longer being used since the move to electron without remote
    // but we should make use of it for a mocha testcase to still be sure the proferences window
    // and workday waiver have the shortcut working

    // describe('bindDevToolsShortcut(window)', function()
    // {

    //     test('No bind: should not open anything', async() =>
    //     {
    //         const testWindow = new BrowserWindow(browserWindowOptions);
    //         testWindow.loadURL(mockHtmlPath);
    //         expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();

    //         testWindow.webContents.on('dom-ready', () =>
    //         {
    //             window.dispatchEvent(devToolsShortcut);
    //         });
    //         testWindow.on('did-fail-load', (event, code, desc, url, isMainFrame) =>
    //         {
    //             console.log('did-fail-load: ', event,  code, desc, url, isMainFrame);
    //         });

    //         await new Promise(r => setTimeout(r, timeoutValue));
    //         expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();
    //     });

    //     test('Bind: should open devTools', async() =>
    //     {
    //         const testWindow = new BrowserWindow(browserWindowOptions);
    //         testWindow.loadURL(mockHtmlPath);
    //         expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();

    //         testWindow.webContents.on('dom-ready', () =>
    //         {
    //             bindDevToolsShortcut(window);
    //             window.dispatchEvent(devToolsShortcut);
    //         });
    //         testWindow.webContents.on('did-fail-load', (event, code, desc, url, isMainFrame) =>
    //         {
    //             console.log('did-fail-load: ', event,  code, desc, url, isMainFrame);
    //         });

    //         await new Promise(r => setTimeout(r, timeoutValue));
    //         expect(testWindow.webContents.isDevToolsOpened()).toBeTruthy();
    //     });

    //     test('Bind: bad shortcut, should not open devTools', async() =>
    //     {
    //         const testWindow = new BrowserWindow(browserWindowOptions);
    //         testWindow.loadURL(mockHtmlPath);
    //         expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();

    //         testWindow.webContents.on('dom-ready', () =>
    //         {
    //             bindDevToolsShortcut(window);
    //             window.dispatchEvent(badDevToolsShortcut);
    //         });
    //         testWindow.webContents.on('did-fail-load', (event, code, desc, url, isMainFrame) =>
    //         {
    //             console.log('did-fail-load: ', event,  code, desc, url, isMainFrame);
    //         });

    //         await new Promise(r => setTimeout(r, timeoutValue));
    //         expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();
    //     });
    // });

    describe('showDialogSync(options, successCallback)', function()
    {
        test('Does not crash', async() =>
        {
            const testWindow = new BrowserWindow(browserWindowOptions);
            testWindow.loadURL(mockHtmlPath);

            let spy;
            testWindow.webContents.on('dom-ready', () =>
            {
                spy = jest.spyOn(windowAux, 'showDialogSync');

                const options = {
                    title: 'Time to Leave',
                };
                windowAux.showDialogSync(options, () =>
                {
                    return;
                });
            });
            testWindow.webContents.on('did-fail-load', (event, code, desc, url, isMainFrame) =>
            {
                console.log('did-fail-load: ', event,  code, desc, url, isMainFrame);
            });

            await new Promise(r => setTimeout(r, timeoutValue));
            expect(testWindow).toBeDefined();
            expect(spy).toHaveBeenCalled();

            spy.mockRestore();
        });
    });

    describe('showAlert(message)', function()
    {
        test('Does not crash', async() =>
        {
            const testWindow = new BrowserWindow(browserWindowOptions);
            testWindow.loadURL(mockHtmlPath);

            let spy;
            testWindow.webContents.on('dom-ready', () =>
            {
                spy = jest.spyOn(windowAux, 'showAlert');
                windowAux.showAlert('Test showAlert');
            });
            testWindow.webContents.on('did-fail-load', (event, code, desc, url, isMainFrame) =>
            {
                console.log('did-fail-load: ', event,  code, desc, url, isMainFrame);
            });

            await new Promise(r => setTimeout(r, timeoutValue));
            expect(testWindow).toBeDefined();
            expect(spy).toHaveBeenCalled();

            spy.mockRestore();
        });
    });
});