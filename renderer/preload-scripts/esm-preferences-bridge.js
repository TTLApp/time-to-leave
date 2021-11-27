'use strict';

const { contextBridge } = require('electron');
const { preferencesApi } = require('./preferences-api.js');

contextBridge.exposeInMainWorld(
    'mainApi', preferencesApi
);
