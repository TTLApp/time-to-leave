const themeOptions = [ 'default', 'dark' ];

/**
 * Checks whether the provided theme is valid. This list should be reflected in the `styles.css` file.
 * @param {string} testTheme
 * @return {boolean}
 */
function isValidTheme(testTheme) {
    return themeOptions.indexOf(testTheme) >= 0;
}

/**
 * Takes the provided theme key, and loads into a data-attribute on the DOM
 * @param {string} theme
 */
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
