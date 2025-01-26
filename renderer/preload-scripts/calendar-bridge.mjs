'use strict';

import { contextBridge } from 'electron';
import { calendarApi } from './calendar-api.mjs';
import { rendererApi } from './renderer-api.mjs';

contextBridge.exposeInMainWorld(
    'calendarApi', calendarApi
);

contextBridge.exposeInMainWorld(
    'rendererApi', rendererApi
);
