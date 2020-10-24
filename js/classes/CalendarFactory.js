'use strict';

const { ipcRenderer } = require('electron');
const { getDefaultWidthHeight } = require('../user-preferences.js');
const { Calendar } = require('./Calendar.js');
const { FixedDayCalendar } = require('./FixedDayCalendar.js');
const { FlexibleMonthCalendar } = require('./FlexibleMonthCalendar.js');
const { FlexibleDayCalendar } = require('./FlexibleDayCalendar.js');

class CalendarFactory
{
    static getInstance(preferences, calendar = undefined)
    {
        const view = preferences['view'];
        const numberOfEntries = preferences['number-of-entries'];
        let widthHeight = getDefaultWidthHeight();

        if (!CalendarFactory.isValidAttribute('numberOfEntries', numberOfEntries))
            throw new Error(`Could not instantiate ${numberOfEntries}`);

        if (!CalendarFactory.isValidAttribute('view', view))
            throw new Error(`Could not instantiate ${view}`);

        const calendarType = CalendarFactory.getCalendarType(numberOfEntries, view);

        if (calendar === undefined)
            return calendarType.instantiate(preferences);

        if (calendar.constructor.name !== calendarType.constructorName)
        {
            ipcRenderer.send(
                'RESIZE_MAIN_WINDOW',
                widthHeight.width,
                widthHeight.height
            );
            return calendarType.instantiate(preferences);
        }

        calendar.updatePreferences(preferences);
        calendar.redraw();
        return calendar;
    }

    static getCalendarTypes()
    {
        return [
            {
                numberOfEntries: 'fixed',
                view: 'day',
                constructorName: 'FixedDayCalendar',
                instantiate: (preferences) => new FixedDayCalendar(preferences),
            },
            {
                numberOfEntries: 'fixed',
                view: 'month',
                constructorName: 'Calendar',
                instantiate: (preferences) => new Calendar(preferences),
            },
            {
                numberOfEntries: 'flexible',
                view: 'day',
                constructorName: 'FlexibleDayCalendar',
                instantiate: (preferences) =>
                    new FlexibleDayCalendar(preferences),
            },
            {
                numberOfEntries: 'flexible',
                view: 'month',
                constructorName: 'FlexibleMonthCalendar',
                instantiate: (preferences) =>
                    new FlexibleMonthCalendar(preferences),
            },
        ];
    }

    static isValidAttribute(key, value)
    {
        const values = CalendarFactory.getCalendarTypes().map(calendarType => calendarType[key]);
        return values.includes(value);
    }

    static getCalendarType(numberOfEntries, view)
    {
        return CalendarFactory.getCalendarTypes().find(
            (el) => el.numberOfEntries === numberOfEntries && el.view === view
        );
    }
}

module.exports = {
    CalendarFactory,
};
