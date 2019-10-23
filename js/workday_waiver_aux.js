const { Menu } = require('electron').remote;

/**
 * Displays workday waiver manager window.
 */
function displayWaiverWindow() {
    const waiverMenu = Menu.getApplicationMenu().getMenuItemById('workday-waiver-manager');
    waiverMenu.click();
}

module.exports = {
    displayWaiverWindow
};
