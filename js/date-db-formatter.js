'use strict';

/**
 * Formats year, month and day (and maybe key) for the key format of the DBs
 * @param {number} year value representing a year in 4 digits YYYY
 * @param {number} month value representing a month starting with 0 (0-11)
 * @param {number} day value representing a day (1-31)
 * @param {String|undefined} key Fixed calendar requires key's for the db entries (day-total, lunch-begin, etc)
 * @return {String}
 */
function generateKey(year, month, day, key = undefined) 
{
    return year + '-' + month + '-' + day + (key === undefined ? '' : ('-' + key));
}

module.exports = {
    generateKey,
};