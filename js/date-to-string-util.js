const dayAbbrs = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
const dayNames = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

/**
 * @param dayIndex Week day index, considering a week starting on sunday
 * @return The abbreviation (3-letters) for the week day
 */
function getDayAbbr(dayIndex)
{
    return dayAbbrs[dayIndex];
}

/**
 * @param dayIndex Week day index, considering a week starting on sunday
 * @return The name for the day
 */
function getDayName(dayIndex)
{
    return dayNames[dayIndex];
}

/**
 * @param monthIndex Month index, considering 0 as January
 * @return The month name for the passed index
 */
function getMonthName(monthIndex)
{
    return monthNames[monthIndex];
}

module.exports =
{
    getDayAbbr,
    getDayName,
    getMonthName
};