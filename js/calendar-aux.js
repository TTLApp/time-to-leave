const {
    validateTime,
} = require('./time-math.js');
const Store = require('electron-store');

/*
 * Analyze the inputs of a day, and return if it has an error.
 * An error means that an input earlier in the day is higher than another.
 */
function hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd) {
    var dayValues = new Array();

    if ((dayBegin !== '' && !validateTime(dayBegin)) ||
        (lunchBegin !== '' && !validateTime(lunchBegin)) ||
        (lunchEnd !== '' && !validateTime(lunchEnd)) ||
        (dayEnd !== '' && !validateTime(dayEnd))) {
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
    const store = new Store();
    var dayStr = year + '-' + month + '-' + day + '-';
    return [store.get(dayStr + 'day-begin'),
        store.get(dayStr + 'lunch-begin'),
        store.get(dayStr + 'lunch-end'),
        store.get(dayStr + 'day-end')];
}


module.exports = {
    hasInputError,
    getDaysEntries
};