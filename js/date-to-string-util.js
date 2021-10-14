const i18n = require('../src/configs/i18next.config.js');

const dayAbbrs = [ 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat' ];
const dayNames = [ 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday' ];
const monthNames = [ 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' ];

/**
 * @param dayIndex Week day index, considering a week starting on sunday
 * @return The abbreviation (3-letters) for the week day
 */
function getDayAbbr(dayIndex)
{
    return i18n.t(`$DateUtil.${dayAbbrs[dayIndex]}`);
}


/**
 * @param dayIndex Week day index, considering a week starting on sunday
 * @return The name for the day
 */
function getDayName(dayIndex)
{
    return i18n.t(`$DateUtil.${dayNames[dayIndex]}`);
}

/**
 * @param monthIndex Month index, considering 0 as January
 * @return The month name for the passed index
 */
function getMonthName(monthIndex)
{
    return i18n.t(`$DateUtil.${monthNames[monthIndex]}`);
}

module.exports =
{
    getDayAbbr,
    getDayName,
    getMonthName
};