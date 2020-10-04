'use strict';

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

/**
 * Takes the provided theme key, and loads into a data-attribute on the DOM
 * @param {string} theme
 * @return {boolean} If the theme application was successful
 * */
function applyTheme(theme) 
{
    if (isValidTheme(theme) === false) 
    {
        return false;
    }

    if (theme === 'system-default') 
    {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Applies to the Primary view
    $('html').attr('data-theme', theme);
    return true;
}

module.exports = {
    isValidTheme,
    applyTheme
};
