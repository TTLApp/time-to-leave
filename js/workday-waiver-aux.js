const { ipcRenderer } = require('electron');
const { Menu } = require('electron').remote;

/**
 * @param {string} dayId - day in '<year>-<month - 1>-<day>' format
 * @returns {string} - day in 'YYYY-MM-DD' format
 */
function formatDayId(dayId) {
    const [year, month, day] = dayId.split('-').map((i) => { return parseInt(i); });
    const date = new Date(year, month, day);
    return date.toISOString().substr(0, 10);
}

/**
 * Sends waiverDay value through SET_WAIVER_DAY event.
 *
 * @param {string} waiverDay - day in 'YYYY-MM-DD' format
 */
function sendWaiverDay(waiverDay) {
    ipcRenderer.send('SET_WAIVER_DAY', waiverDay);
}

/**
 * Displays workday waiver manager window.
 */
function displayWaiverWindow() {
    const waiverMenu = Menu.getApplicationMenu().getMenuItemById('workday-waiver-manager');
    waiverMenu.click();
}

module.exports = {
    formatDayId,
    sendWaiverDay,
    displayWaiverWindow
};
