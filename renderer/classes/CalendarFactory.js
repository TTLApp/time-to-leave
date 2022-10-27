'use strict';

import { FlexibleMonthCalendar } from './FlexibleMonthCalendar.js';
import { FlexibleDayCalendar } from './FlexibleDayCalendar.js';

class CalendarFactory
{
    static async getInstance(preferences, languageData, calendar = undefined)
    {
        const view = preferences['view'];
        if (view !== 'day' && view !== 'month')
        {
            return Promise.reject(`Could not instantiate ${view}`);
        }

        const constructorName = view === 'day' ? 'FlexibleDayCalendar': 'FlexibleMonthCalendar';
        const CalendarClass = view === 'day' ? FlexibleDayCalendar: FlexibleMonthCalendar;
        if (calendar === undefined || calendar.constructor.name !== constructorName)
        {
            if (calendar !== undefined && calendar.constructor.name !== constructorName)
            {
                window.mainApi.resizeMainWindow();
            }
            calendar = new CalendarClass(preferences, languageData);
            await calendar.reload();
            return calendar;
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
