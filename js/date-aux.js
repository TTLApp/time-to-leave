'use strict';

/*
 * Given a JS Date, return the string in the format YYYY-MM-DD.
 */
function getDateStr(date)
{
    try
    {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().substr(0, 10);
    }
    catch (err)
    {
        return new Error(err);
    }
}

/*
 * Given a a year and month, returns how many days the month has
 */
function getMonthLength(year, month)
{
    const d = new Date(year, month+1, 0);
    return d.getDate();
}

/*
 * Returns the current datetime string in the format YYYY_MM_DD_HH_MM_SS.
 */
function getCurrentDateTimeStr()
{
    const date = new Date();
    const reg = /[-:]/g;
    const currentTimeStr = date.toLocaleTimeString([], {hour: '2-digit', hourCycle: 'h23', minute:'2-digit', second:'2-digit'}).substr(0, 8);
    try
    {
        return `${getDateStr(date)}_${currentTimeStr}`.replace(reg,'_');
    }
    catch (err)
    {
        return new Error(err);
    }
}

export {
    getDateStr, getMonthLength, getCurrentDateTimeStr
};
