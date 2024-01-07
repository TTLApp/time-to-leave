'use strict';

/**
 * Formats year, month and day (and maybe key) for the key format of the DBs
 * @param {number} year value representing a year in 4 digits YYYY
 * @param {number} month value representing a month starting with 0 (0-11)
 * @param {number} day value representing a day (1-31)
 * @return {String}
 */
function generateKey(year, month, day)
{
    return year + '-' + month + '-' + day;
}

export {
    generateKey
};
