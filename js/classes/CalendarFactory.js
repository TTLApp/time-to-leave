'use strict';

const { ipcRenderer } = require('electron');
const { getDefaultWidthHeight} = require('../user-preferences.js');
const { Calendar, DayCalendar } = require('./Calendar.js');

class CalendarFactory {
    static getInstance(preferences, calendar = undefined) {
        let view = preferences.view;
        let widthHeight = getDefaultWidthHeight();
        if (view === 'day') {
            if (calendar === undefined || calendar.constructor.name !== 'DayCalendar') {
                if (calendar !== undefined && calendar.constructor.name !== 'DayCalendar') {
                    ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                }
                return new DayCalendar(preferences);
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
}

module.exports = {
    CalendarFactory
};
