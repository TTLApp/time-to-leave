'use strict';

const { contextBridge } = require('electron');
const { workdayWaiverApi } = require('./workday-waiver-api.js');

contextBridge.exposeInMainWorld(
    'mainApi', workdayWaiverApi
);
