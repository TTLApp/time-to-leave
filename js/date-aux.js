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
    let d = new Date(year, month+1, 0);
    return d.getDate();
}

module.exports = {
    getDateStr, getMonthLength
};
