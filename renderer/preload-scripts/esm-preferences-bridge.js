'use strict';

import { contextBridge } from 'electron';
import { preferencesApi } from './preferences-api.js';

contextBridge.exposeInMainWorld(
    'mainApi', preferencesApi
);
