const {
    validateTime,
} = require('./time-math.js');
const Store = require('electron-store');

/*
 * Check validity of a time input
 */
function isInvalidInputTime(time) {
    if (time === undefined || time === "") {
        return false;
    }
    return !validateTime(time);
}

/*
 * Analyze the inputs of a day, and return if it has an error.
 * An error means that an input earlier in the day is higher than another.
 */
function hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd) {
    var dayValues = new Array();

    if (isInvalidInputTime(dayBegin) ||
        isInvalidInputTime(lunchBegin) ||
        isInvalidInputTime(lunchEnd) ||
        isInvalidInputTime(dayEnd)) {
        return true;
    }

    if (validateTime(dayBegin)) {
        dayValues.push(dayBegin);
    }
    if (validateTime(lunchBegin)) {
        dayValues.push(lunchBegin);
    }
    if (validateTime(lunchEnd)) {
        dayValues.push(lunchEnd);
    }
    if (validateTime(dayEnd)) {
        dayValues.push(dayEnd);
    }
    for (var index = 0; index < dayValues.length; index++) {
        if (index > 0 && (dayValues[index-1] >= dayValues[index])) {
            return true;
        }
    }
    return false;
}

/*
 * Returns the entries for the day.
 */
function getDaysEntries(year, month, day) {
    const db = new Store();
    var dayStr = year + '-' + month + '-' + day + '-';
    return [db.get(dayStr + 'day-begin'),
        db.get(dayStr + 'lunch-begin'),
        db.get(dayStr + 'lunch-end'),
        db.get(dayStr + 'day-end')];
}


module.exports = {
    hasInputError,
    getDaysEntries
};