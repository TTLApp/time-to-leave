'use strict';

// TODO: this is duplicated in renderer/themes.js and in preferences.html.
// Please concentrate it in a single place, probably a JSON.
const themeOptions = ['system-default', 'light', 'dark', 'cadent-star'];

/**
 * Checks whether the provided theme is valid. This list should be reflected in the `styles.css` file.
 * @param {string} testTheme
 * @return {boolean}
 */
function isValidTheme(testTheme)
{
    return themeOptions.indexOf(testTheme) >= 0;
}

module.exports = {
    isValidTheme
};
