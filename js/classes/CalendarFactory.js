'use strict';

const { ipcRenderer } = require('electron');
const { getDefaultWidthHeight} = require('../user-preferences.js');
const { Calendar } = require('./Calendar.js');
const { FixedDayCalendar } = require('./FixedDayCalendar.js');
const { FlexibleMonthCalendar } = require('./FlexibleMonthCalendar.js');

class CalendarFactory {
    static getInstance(preferences, calendar = undefined) {
        const view = preferences['view'];
        const numberOfEntries = preferences['number-of-entries'];
        let widthHeight = getDefaultWidthHeight();
        if (numberOfEntries === 'fixed') {
            if (view === 'day') {
                if (calendar === undefined || calendar.constructor.name !== 'FixedDayCalendar') {
                    if (calendar !== undefined && calendar.constructor.name !== 'FixedDayCalendar') {
                        ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                    }
                    return new FixedDayCalendar(preferences);
                } else {
                    calendar.updatePreferences(preferences);
                    calendar.redraw();
                    return calendar;
                }
            } else if (view === 'month') {
                if (calendar === undefined || calendar.constructor.name !== 'Calendar') {
                    if (calendar !== undefined && calendar.constructor.name !== 'Calendar') {
                        ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                    }
                    return new Calendar(preferences);
                } else {
                    calendar.updatePreferences(preferences);
                    calendar.redraw();
                    return calendar;
                }
            }
            throw new Error(`Could not instantiate ${view}`);
        }
        else if (numberOfEntries === 'flexible') {
            if (view === 'month') {
                if (calendar === undefined || calendar.constructor.name !== 'FlexibleMonthCalendar') {
                    if (calendar !== undefined && calendar.constructor.name !== 'FlexibleMonthCalendar') {
                        ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                    }
                    return new FlexibleMonthCalendar(preferences);
                } else {
                    calendar.updatePreferences(preferences);
                    calendar.redraw();
                    return calendar;
                }
            }
            throw new Error(`Could not instantiate ${view}`);
        }
        else {
            throw new Error(`Could not instantiate ${numberOfEntries}`);
        }
    }
}

module.exports = {
    CalendarFactory
};
