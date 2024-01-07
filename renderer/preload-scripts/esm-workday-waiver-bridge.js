'use strict';

import { contextBridge } from 'electron';
import { workdayWaiverApi } from './workday-waiver-api.js';

contextBridge.exposeInMainWorld(
    'mainApi', workdayWaiverApi
);
