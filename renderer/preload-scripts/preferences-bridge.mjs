'use strict';

import { contextBridge } from 'electron';
import { preferencesApi } from './preferences-api.mjs';
import { rendererApi } from './renderer-api.mjs';

contextBridge.exposeInMainWorld(
    'preferencesApi', preferencesApi
);

contextBridge.exposeInMainWorld(
    'rendererApi', rendererApi
);
