const dayAbbrs = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

function getDayAbbr(dayIndex)
{
    return dayAbbrs[dayIndex];
}

function getMonthName(monthIndex)
{
    return monthNames[monthIndex];
}

module.exports =
{
    getDayAbbr,
    getMonthName
};