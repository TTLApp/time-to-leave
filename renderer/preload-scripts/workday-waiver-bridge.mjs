'use strict';

import { contextBridge } from 'electron';
import { workdayWaiverApi } from './workday-waiver-api.mjs';
import { rendererApi } from './renderer-api.mjs';

contextBridge.exposeInMainWorld(
    'workdayWaiverApi', workdayWaiverApi
);

contextBridge.exposeInMainWorld(
    'rendererApi', rendererApi
);

