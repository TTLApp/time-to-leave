'use strict';

import { contextBridge } from 'electron';
import { calendarApi } from './calendar-api.js';

contextBridge.exposeInMainWorld(
    'mainApi', calendarApi
);
