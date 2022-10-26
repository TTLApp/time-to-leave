'use strict';

const { contextBridge } = require('electron');
const { calendarApi } = require('./calendar-api.js');

contextBridge.exposeInMainWorld(
    'mainApi', calendarApi
);
