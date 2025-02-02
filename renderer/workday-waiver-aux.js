'use strict';

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
 * Sends waiverDay value to the main process, which triggers the waiver manager window.
 *
 * @param {string} waiverDay - day in 'YYYY-MM-DD' format
 */
function displayWaiverWindow(waiverDay)
{
    window.calendarApi.displayWaiverWindow(waiverDay);
}

export {
    displayWaiverWindow,
    formatDayId,
};
