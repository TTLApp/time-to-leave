'use strict';

const { ipcRenderer } = require('electron');

/**
 * @param {string} dayId - day in '<year>-<month - 1>-<day>' format
 * @returns {string} - day in 'YYYY-MM-DD' format
 */
function formatDayId(dayId)
{
    const [year, month, day] = dayId.split('-').map((i) => { return parseInt(i); });
    // Use UTC date to avoid problems with time zone
    const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
    return Number.isNaN(date.getTime()) ? NaN : date.toISOString().substr(0, 10);
}

/**
 * Sends waiverDay value through SET_WAIVER_DAY event, which triggers open window event on main process.
 *
 * @param {string} waiverDay - day in 'YYYY-MM-DD' format
 */
function displayWaiverWindow(waiverDay)
{
    ipcRenderer.send('SET_WAIVER_DAY', waiverDay);
}

export {
    formatDayId,
    displayWaiverWindow
};
