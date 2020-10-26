'use strict';

const path = require('path');

const macOS = process.platform === 'darwin';
const win32 = process.platform === 'win32';

const appPath = process.env.NODE_ENV === 'production'
    ? `${process.resourcesPath}/app`
    : path.join(__dirname, '..');

const appConfig = {
    macOS: macOS,
    win32: win32,
    appPath,
    iconpath: path.join(__dirname, win32 ? '../assets/timer.ico' : '../assets/timer.png'),
    trayIcon: path.join(__dirname, win32 ? '../assets/timer-grey.ico' : '../assets/timer-16-Template.png')
};

module.exports = {
    appConfig
};