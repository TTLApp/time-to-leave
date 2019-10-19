const themeOptions = ['', 'dark'];

/**
 * Checks whether the provided theme is valid. This list should be reflected in the `styles.css` file.
 * @param {string} testTheme
 * @return {boolean}
 */
function isValidTheme(testTheme) {
    return themeOptions.indexOf(testTheme) >= 0;
}

function applyTheme(theme) {
    if (isValidTheme(theme) === false) {
        return;
    }

    document.querySelector('html').setAttribute('data-theme', theme);
}

module.exports = {
    isValidTheme,
    applyTheme
};
