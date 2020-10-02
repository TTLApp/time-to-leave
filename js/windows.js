'use strict';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let waiverWindow = null;
let prefWindow = null;
let tray = null;
let contextMenu = null;

module.exports = {
    waiverWindow,
    prefWindow,
    tray,
    contextMenu
};