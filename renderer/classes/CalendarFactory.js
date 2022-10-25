'use strict';

const { ipcRenderer } = require('electron');

import { getDefaultWidthHeight} from '../../js/user-preferences.js';
import { FlexibleMonthCalendar } from './FlexibleMonthCalendar.js';
import { FlexibleDayCalendar } from './FlexibleDayCalendar.js';

class CalendarFactory
{
    static getInstance(preferences, languageData, calendar = undefined)
    {
        const view = preferences['view'];
        const widthHeight = getDefaultWidthHeight();
        if (view !== 'day' && view !== 'month')
        {
            throw new Error(`Could not instantiate ${view}`);
        }

        const constructorName = view === 'day' ? 'FlexibleDayCalendar': 'FlexibleMonthCalendar';
        const CalendarClass = view === 'day' ? FlexibleDayCalendar: FlexibleMonthCalendar;
        if (calendar === undefined || calendar.constructor.name !== constructorName)
        {
            if (calendar !== undefined && calendar.constructor.name !== constructorName)
            {
                ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
            }
            return new CalendarClass(preferences, languageData);
        }
        else
        {
            calendar.updateLanguageData(languageData);
            calendar.updatePreferences(preferences);
            calendar.redraw();
            return calendar;
        }
    }
}

export {
    CalendarFactory
};
