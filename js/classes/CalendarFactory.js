'use strict';

const { ipcRenderer } = require('electron');
const { getDefaultWidthHeight} = require('../user-preferences.js');
const { FlexibleMonthCalendar } = require('./FlexibleMonthCalendar.js');
const { FlexibleDayCalendar } = require('./FlexibleDayCalendar.js');

class CalendarFactory
{
    static getInstance(preferences, languageData, calendar = undefined)
    {
        const view = preferences['view'];
        const widthHeight = getDefaultWidthHeight();
        if (view === 'day')
        {
            if (calendar === undefined || calendar.constructor.name !== 'FlexibleDayCalendar')
            {
                if (calendar !== undefined && calendar.constructor.name !== 'FlexibleDayCalendar')
                {
                    ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                }
                return new FlexibleDayCalendar(preferences, languageData);
            }
            else
            {
                calendar.updateLanguageData(languageData);
                calendar.updatePreferences(preferences);
                calendar.redraw();
                return calendar;
            }
        }
        else if (view === 'month')
        {
            if (calendar === undefined || calendar.constructor.name !== 'FlexibleMonthCalendar')
            {
                if (calendar !== undefined && calendar.constructor.name !== 'FlexibleMonthCalendar')
                {
                    ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                }
                return new FlexibleMonthCalendar(preferences, languageData);
            }
            else
            {
                calendar.updateLanguageData(languageData);
                calendar.updatePreferences(preferences);
                calendar.redraw();
                return calendar;
            }
        }
        else
        {
            throw new Error(`Could not instantiate ${view}`);
        }
    }
}

module.exports = {
    CalendarFactory
};
