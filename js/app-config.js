const path = require('path');

const macOS = process.platform === 'darwin';
const win32 = process.platform === 'win32';

const appConfig = {
    macOS: macOS,
    win32: win32,
    iconpath: path.join(__dirname, win32 ? '../assets/timer.ico' : '../assets/timer.png'),
    trayIcon: path.join(__dirname, win32 ? '../assets/timer-grey.ico' : '../assets/timer-16-Template.png')
};

module.exports = {
    appConfig
};