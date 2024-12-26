'use strict';

import Store from 'electron-store';

import {
    subtractTime,
    sumTime
} from './time-math.js';
import { getDateStr } from './date-aux.js';
import { getUserPreferences, showDay } from './user-preferences.js';

// Global values for calendar
const calendarStore = new Store({ name: 'flexible-store' });
const waivedWorkdays = new Store({ name: 'waived-workdays' });

function getFirstInputInDb()
{
    const inputs = [];
    const startDateStr = _getOverallBalanceStartDate();
    const [startYear, startMonth, startDay] = startDateStr.split('-');
    const startDate = new Date(startYear, startMonth - 1, startDay);

    for (const value of calendarStore)
    {
        const [year, month, day] = value[0].split('-');
        if (new Date(year, month, day) >= startDate)
        {
            inputs.push(value[0]);
        }
    }
    inputs.sort(function(a, b)
    {
        const [aYear, aMonth, aDay] = a.split('-');
        const [bYear, bMonth, bDay] = b.split('-');
        return new Date(aYear, aMonth, aDay) - new Date(bYear, bMonth, bDay);
    });
    return inputs.length ? inputs[0] : '';
}

/**
* @param {string} dbKey given key of the db
*/
function _getDateFromStoreDb(dbKey)
{
    // Normal Store is formated with month described by 0-11 (jan - dec)
    const [year, month, day] = dbKey.split('-');
    return new Date(year, month, day);
}

/**
* @param {string} dbKey given key of the db
*/
function _getDateFromWaivedWorkdayDb(dbKey)
{
    // WaivedWorkday are formated with two digits for the month/day (01 instead of 1)
    // and has the month described by 1-12 (jan - dec)
    const [year, month, day] = dbKey.split('-');
    return new Date(year, month-1, day);
}

function _getOverallBalanceStartDate()
{
    const savedPreferences = getUserPreferences();
    return savedPreferences['overall-balance-start-date'];
}

function _getHoursPerDay()
{
    const savedPreferences = getUserPreferences();
    return savedPreferences['hours-per-day'];
}

/**
* Given an array of times from a day in the calendar, returns the day
* total according to same calculation rules as those of the calendar.
* @param {string[]} values
*/
function _getDayTotal(values)
{
    const inputsHaveExpectedSize = values.length >= 2 && values.length % 2 === 0;
    const timesOk = values.length > 0 && values.every(time => time !== '--:--');
    const hasDayEnded = inputsHaveExpectedSize && timesOk;

    if (hasDayEnded)
    {
        let dayTotal = '00:00';
        let timesAreProgressing = true;
        if (values.length >= 2 && values.length % 2 === 0)
        {
            for (let i = 0; i < values.length; i += 2)
            {
                const difference = subtractTime(values[i], values[i + 1]);
                dayTotal = sumTime(dayTotal, difference);
                if (values[i] >= values[i + 1])
                {
                    timesAreProgressing = false;
                }
            }
        }
        if (timesAreProgressing)
        {
            return dayTotal;
        }
    }
    return '00:00';
}

/**
* Iterates over stores and returns total balance.
* Since waiver store precedes normal store, must not get from normal store if day is waived.
* @param {Date} firstDate
* @param {Date} limitDate
*/
function _getDayTotalsFromStores(firstDate, limitDate)
{
    const preferences = getUserPreferences();
    const totals = {};

    const getDateStrAndDateValue = (value, date) =>
    {
        const dateStr = getDateStr(date);

        if (!totals[dateStr])
        {
            const dateShown = showDay(date.getFullYear(), date.getMonth(), date.getDate(), preferences);
            if (date >= firstDate && date <= limitDate && dateShown)
            {
                return [dateStr, value[1]];
            }
        }
        return [];
    };

    for (const value of waivedWorkdays)
    {
        const [key, dateValue] = getDateStrAndDateValue(value, _getDateFromWaivedWorkdayDb(value[0]));
        if (key && dateValue)
        {
            totals[key] = dateValue['hours'];
        }

    }

    for (const value of calendarStore)
    {
        const [key, dateValue] = getDateStrAndDateValue(value, _getDateFromStoreDb(value[0]));
        if (key && dateValue)
        {
            totals[key] = _getDayTotal(dateValue.values);
        }
    }

    return totals;
}

/**
* Computation of all time balance, including limitDay.
* @param {Date} limitDate
*/
async function computeAllTimeBalanceUntil(limitDate)
{
    const firstInput = getFirstInputInDb();
    if (firstInput === '')
    {
        return '00:00';
    }
    const [firstYear, firstMonth, firstDay] = firstInput.split('-');
    const firstDate = new Date(firstYear, firstMonth, firstDay);

    const totals = _getDayTotalsFromStores(firstDate, limitDate);

    const preferences = getUserPreferences();
    const hoursPerDay = _getHoursPerDay();
    let allTimeTotal = '00:00';
    const date = new Date(firstDate);
    const limitDateStr = getDateStr(limitDate);
    let dateStr = getDateStr(date);
    while (dateStr !== limitDateStr && limitDate > date)
    {
        if (showDay(date.getFullYear(), date.getMonth(), date.getDate(), preferences))
        {
            const dayTotal = dateStr in totals ? totals[dateStr] : '00:00';
            const dayBalance = subtractTime(hoursPerDay, dayTotal);
            allTimeTotal = sumTime(dayBalance, allTimeTotal);
        }
        date.setDate(date.getDate() + 1);
        dateStr = getDateStr(date);
    }
    return allTimeTotal;
}

/**
* Computes all time balance using an async promise.
* @param {Date} limitDate
*/
async function computeAllTimeBalanceUntilAsync(limitDate)
{
    return new Promise(resolve =>
    {
        setTimeout(() =>
        {
            resolve(computeAllTimeBalanceUntil(limitDate));
        }, 1);
    });
}

export {
    computeAllTimeBalanceUntil,
    computeAllTimeBalanceUntilAsync,
    getFirstInputInDb,
};
