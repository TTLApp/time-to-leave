'use strict';

import { MonthCalendar } from './MonthCalendar.js';
import { DayCalendar } from './DayCalendar.js';

class CalendarFactory
{
    static async getInstance(preferences, languageData, calendar = undefined)
    {
        const view = preferences['view'];
        if (view !== 'day' && view !== 'month')
        {
            return Promise.reject(`Could not instantiate ${view}`);
        }

        const constructorName = view === 'day' ? 'DayCalendar': 'MonthCalendar';
        const CalendarClass = view === 'day' ? DayCalendar: MonthCalendar;
        if (calendar === undefined || calendar.constructor.name !== constructorName)
        {
            if (calendar !== undefined && calendar.constructor.name !== constructorName)
            {
                CalendarFactory.ResizeCalendar(preferences);
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

    static ResizeCalendar(preferences)
    {
        const widthHeight = window.calendarApi.getDefaultWidthHeight(preferences);
        window.resizeTo(widthHeight.width, widthHeight.height);
    }
}

export {
    CalendarFactory
};
