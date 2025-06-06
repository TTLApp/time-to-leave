'use strict';

import { contextBridge, ipcRenderer } from 'electron';
import { calendarApi } from './calendar-api.mjs';
import { rendererApi } from './renderer-api.mjs';

contextBridge.exposeInMainWorld(
    'calendarApi', calendarApi
);

contextBridge.exposeInMainWorld(
    'rendererApi', rendererApi
);

contextBridge.exposeInMainWorld(
    'electronAPI', {
        sendLeaveBy: (ipc, leaveByValue) =>
        {
            ipcRenderer.send(ipc, leaveByValue);
        }
    }
);