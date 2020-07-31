const Store = require('electron-store');
const {
    subtractTime,
    sumTime
} = require('./time-math.js');
const { getDateStr } = require('./date-aux.js');
const { getUserPreferences, showDay } = require('./user-preferences.js');

// Global values for calendar
const store = new Store();
const waivedWorkdays = new Store({ name: 'waived-workdays' });

function getFirstInputInDb() {
    var inputs = [];
    const startDateStr = _getOverallBalanceStartDate();
    let [startYear, startMonth, startDay] = startDateStr.split('-');
    const startDate = new Date(startYear, startMonth - 1, startDay);

    for (let value of store) {
        let [year, month, day] = value[0].split('-');
        if (new Date(year, month, day) >= startDate) {
            inputs.push(value[0]);
        }
    }
    inputs.sort(function(a, b) {
        var [aYear, aMonth, aDay] = a.split('-');
        var [bYear, bMonth, bDay] = b.split('-');
        return new Date(aYear, aMonth, aDay) - new Date(bYear, bMonth, bDay);
    });
    return inputs.length ? inputs[0] : '';
}

/**
* @param {string} dbKey given key of the db
*/
function _getDateFromStoreDb(dbKey) {
    // Normal Store is formated with month described by 0-11 (jan - dec)
    const [year, month, day] = dbKey.split('-');
    return new Date(year, month, day);
}

/**
* @param {string} dbKey given key of the db
*/
function _getDateFromWaivedWorkdayDb(dbKey) {
    // WaivedWorkday are formated with two digits for the month/day (01 instead of 1)
    // and has the month described by 1-12 (jan - dec)
    const [year, month, day] = dbKey.split('-');
    return new Date(year, month-1, day);
}

function _getOverallBalanceStartDate() {
    const savedPreferences = getUserPreferences();
    return savedPreferences['overall-balance-start-date'];
}

function _getHoursPerDay() {
    const savedPreferences = getUserPreferences();
    return savedPreferences['hours-per-day'];
}

/**
* Iterates over stores and returns total balance.
* Since waiver store precedes normal store, must not get from normal store if day is waived.
* @param {Date} firstDate
* @param {Date} limitDate
*/
function _getDayTotalsFromStores(firstDate, limitDate) {
    const preferences = getUserPreferences();

    let totals = {};
    for (let value of waivedWorkdays) {
        let date = _getDateFromWaivedWorkdayDb(value[0]);
        const dateShown = showDay(date.getFullYear(), date.getMonth(), date.getDate(), preferences);
        if (date >= firstDate && date <= limitDate && dateShown) {
            totals[getDateStr(date)] = value[1]['hours'];
        }
    }
    for (let value of store) {
        if (value[0].endsWith('-day-total')) {
            let date = _getDateFromStoreDb(value[0]);
            if (!(getDateStr(date) in totals)) {
                const dateShown = showDay(date.getFullYear(), date.getMonth(), date.getDate(), preferences);
                if (date >= firstDate && date <= limitDate && dateShown) {
                    const totalForDay = value[1];
                    totals[getDateStr(date)] = totalForDay;
                }
            }
        }
    }

    return totals;
}

/**
* Computation of all time balance, including limitDay.
* @param {Date} limitDate
*/
async function computeAllTimeBalanceUntil(limitDate) {
    const firstInput = getFirstInputInDb();
    if (firstInput === '') {
        return '00:00';
    }
    var [firstYear, firstMonth, firstDay] = firstInput.split('-');
    var firstDate = new Date(firstYear, firstMonth, firstDay);

    let totals = _getDayTotalsFromStores(firstDate, limitDate);

    const preferences = getUserPreferences();
    const hoursPerDay = _getHoursPerDay();
    let allTimeTotal = '00:00';
    let date = new Date(firstDate);
    const limitDateStr = getDateStr(limitDate);
    let dateStr = getDateStr(date);
    while (dateStr !== limitDateStr && limitDate > date) {
        if (showDay(date.getFullYear(), date.getMonth(), date.getDate(), preferences)) {
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
async function computeAllTimeBalanceUntilAsync(limitDate) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(computeAllTimeBalanceUntil(limitDate));
        }, 1);
    });
}

module.exports = {
    computeAllTimeBalanceUntilAsync,
    computeAllTimeBalanceUntil,
    getFirstInputInDb
};