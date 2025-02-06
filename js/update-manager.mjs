'use strict';

import { app, net, shell } from 'electron';
import Store from 'electron-store';
import isOnline from 'is-online';

import { getDateStr } from './date-aux.mjs';
import i18NextConfig from '../src/configs/i18next.config.mjs';

// Allow require()
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const WindowAux = require('./window-aux.cjs');

class UpdateManager
{
    static shouldCheckForUpdates()
    {
        const store = new Store();
        const lastChecked = store.get('update-remind-me-after');
        const today = new Date(),
            todayDate = getDateStr(today);
        return !lastChecked || todayDate > lastChecked;
    }

    static async checkForUpdates(showUpToDateDialog)
    {
        const online = await isOnline();
        if (!online)
        {
            return;
        }

        const request = net.request('https://api.github.com/repos/TTLApp/time-to-leave/releases/latest');
        request.on('response', (response) =>
        {
            response.on('data', (chunk) =>
            {
                const result = `${chunk}`;
                const re = new RegExp('.*(tag_name).*', 'g');
                const matches = result.matchAll(re);
                for (const match of matches)
                {
                    const res = match[0].replace(/.*v.(\d+\.\d+\.\d+).*/g, '$1');
                    if (app.getVersion() < res)
                    {
                        const options = {
                            type: 'question',
                            buttons: [
                                i18NextConfig.getCurrentTranslation('$UpdateManager.dismissBtn'),
                                i18NextConfig.getCurrentTranslation('$UpdateManager.downloadBtn'),
                                i18NextConfig.getCurrentTranslation('$UpdateManager.remindBtn')
                            ],
                            defaultId: 1,
                            cancelId: 0,
                            message: i18NextConfig.getCurrentTranslation('$UpdateManager.title'),
                            detail: i18NextConfig.getCurrentTranslation('$UpdateManager.old-version-msg'),
                        };
                        const response = WindowAux.showDialogSync(options);
                        if (response === 1)
                        {
                            //Download latest version
                            shell.openExternal('https://github.com/TTLApp/time-to-leave/releases/latest');
                        }
                        else if (response === 2)
                        {
                            const store = new Store();
                            // Remind me later
                            const today = new Date(),
                                todayDate = getDateStr(today);
                            store.set('update-remind-me-after', todayDate);
                        }
                    }
                    else if (showUpToDateDialog)
                    {
                        const options = {
                            type: 'info',
                            buttons: [i18NextConfig.getCurrentTranslation('$Menu.ok')],
                            message: i18NextConfig.getCurrentTranslation('$UpdateManager.title'),
                            detail: i18NextConfig.getCurrentTranslation('$UpdateManager.upto-date-msg'),
                            defaultId: 1
                        };
                        WindowAux.showDialog(options);
                    }
                }
            });
        });
        request.end();
    }
}

export default UpdateManager;
