'use strict';

const { getTranslationInLanguageData } = require('../renderer/i18n-translator-node-copy.js');

const dayAbbrs = [ 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat' ];
const monthNames = [ 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' ];

/**
 * @param languageData Language Data Array obtained from i18n listeners
 * @param dayIndex Week day index, considering a week starting on sunday
 * @return The abbreviation (3-letters) for the week day
 */
function getDayAbbr(languageData, dayIndex)
{
    return getTranslationInLanguageData(languageData, `$DateUtil.${dayAbbrs[dayIndex]}`);
}


/**
 * @param languageData Language Data Array obtained from i18n listeners
 * @param monthIndex Month index, considering 0 as January
 * @return The month name for the passed index
 */
function getMonthName(languageData, monthIndex)
{
    return getTranslationInLanguageData(languageData, `$DateUtil.${monthNames[monthIndex]}`);
}

module.exports = {
    getDayAbbr,
    getMonthName
};