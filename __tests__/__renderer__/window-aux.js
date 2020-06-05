/* eslint-disable no-undef */
const path = require('path');
const { remote } = require('electron');
const { BrowserWindow } = remote;

describe('window-aux.js Testing', function() {
    process.env.NODE_ENV = 'test';

    // No idea why it's failing on mac, but issue #268 tracks this problem. Jest requires at least one test.
    const isMacOS = process.platform === 'darwin';
    if (isMacOS) {
        test('Empty test', () => {});
        return;
    }

    const mockHtmlPath = path.join(__dirname, '../../__mocks__/mock.html');
    const devToolsShortcut = new KeyboardEvent('keyup', {keyCode: 73, ctrlKey: true, shiftKey: true});
    const badDevToolsShortcut = new KeyboardEvent('keyup', {keyCode: 74, ctrlKey: true, shiftKey: true});
    const browserWindowOptions = {
        webPreferences: {
            enableRemoteModule: true,
            nodeIntegration: true
        }
    };
    const timeoutValue = 1500;

    describe('bindDevToolsShortcut(window)', function() {

        test('No bind: should not open anything', async() => {
            let testWindow = new BrowserWindow(browserWindowOptions);
            testWindow.loadURL(mockHtmlPath);
            expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();

            testWindow.webContents.on('dom-ready', () => {
                window.dispatchEvent(devToolsShortcut);
            });

            await new Promise(r => setTimeout(r, timeoutValue));
            expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();
        });

        test('Bind: should open devTools', async() => {
            let testWindow = new BrowserWindow(browserWindowOptions);
            testWindow.loadURL(mockHtmlPath);
            expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();

            testWindow.webContents.on('dom-ready', () => {
                const { bindDevToolsShortcut } = require('../../js/window-aux.js');
                bindDevToolsShortcut(window);
                window.dispatchEvent(devToolsShortcut);
            });

            await new Promise(r => setTimeout(r, timeoutValue));
            expect(testWindow.webContents.isDevToolsOpened()).toBeTruthy();
        });

        test('Bind: bad shortcut, should not open devTools', async() => {
            let testWindow = new BrowserWindow(browserWindowOptions);
            testWindow.loadURL(mockHtmlPath);
            expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();

            testWindow.webContents.on('dom-ready', () => {
                const { bindDevToolsShortcut } = require('../../js/window-aux.js');
                bindDevToolsShortcut(window);
                window.dispatchEvent(badDevToolsShortcut);
            });

            await new Promise(r => setTimeout(r, timeoutValue));
            expect(testWindow.webContents.isDevToolsOpened()).not.toBeTruthy();
        });
    });

    describe('showDialog(options, successCallback)', function() {

        test('Does not crash', async() => {
            let testWindow = new BrowserWindow(browserWindowOptions);
            testWindow.loadURL(mockHtmlPath);

            let spy;
            testWindow.webContents.on('dom-ready', () => {
                const windowAux = require('../../js/window-aux.js');
                spy = jest.spyOn(windowAux, 'showDialog');

                let options = {
                    title: 'Time to Leave',
                };
                windowAux.showDialog(options, () => {
                    return;
                });
            });

            await new Promise(r => setTimeout(r, timeoutValue));
            expect(testWindow).toBeDefined();
            expect(spy).toHaveBeenCalled();

            spy.mockRestore();
        });
    });

    describe('showAlert(message)', function() {

        test('Does not crash', async() => {
            let testWindow = new BrowserWindow(browserWindowOptions);
            testWindow.loadURL(mockHtmlPath);

            let spy;
            testWindow.webContents.on('dom-ready', () => {
                const windowAux = require('../../js/window-aux.js');
                const { dialog } = require('electron').remote;

                spy = jest.spyOn(dialog, 'showMessageBoxSync').mockImplementation(() => {});

                windowAux.showAlert('Test showAlert');
            });

            await new Promise(r => setTimeout(r, timeoutValue));
            expect(testWindow).toBeDefined();
            expect(spy).toHaveBeenCalled();

            spy.mockRestore();
        });
    });
});