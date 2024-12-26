'use strict';

const { hourMinToHourFormatted, sumTime } = require('./time-math.js');
const { generateKey } = require('./date-db-formatter.js');
import Store from 'electron-store';

/**
 * Returns a random integer between min (inclusive) and max (inclusive), rounding up to closest multiple of 5
 * @param {int} min Minimum value
 * @param {int} max Maximum value
 * @returns Random number between min and max
 */
function randomIntFromInterval(min, max)
{
    const round5 = (x) => Math.ceil(x / 5) * 5;
    return round5(Math.floor(Math.random() * (max - min + 1) + min));
}

/**
 * Generated a random time string in the format 'HH:MM' (negative or positive)
 * The random time should be between 0 and 59
 * @param {int} min Minimum value
 * @param {int} max Maximum value
 * @returns Random time between min and max
 */
function randomTime(min, max)
{
    const rand = randomIntFromInterval(min, max);
    const timeStr = hourMinToHourFormatted(0/*hour*/, rand/*min*/);
    const negative = randomIntFromInterval(0, 1) === 1;
    return `${negative ? '-' : ''}${timeStr}`;
}

/**
 * Generate random entries for the given date range, respecting the given working days and using as a base the usual times.
 * Usage example: generateDemoInformation('2021-01-01', '2021-10-18', [1, 2, 3, 4, 5], ['10:00', '13:00', '14:00', '19:00']);
 * @param {string} dateFromStr Starting date in the form YYYY-MM-DD
 * @param {string} dateToStr Ending date in the form YYYY-MM-DD
 * @param {string[]} workingDays Array of integers representing the working days of the week (0 = Sunday, 6 = Saturday)
 * @param {string[]} workingTimes Array of strings representing the usual times of breaks in a day (start time, lunch begin, lunch end and leave time)
 */
function generateDemoInformation(dateFromStr, dateToStr, workingDays, usualTimes = ['9:00', '12:00', '13:00', '18:00'])
{
    const dateFrom = new Date(Date.parse(dateFromStr));
    const dateTo = new Date(Date.parse(dateToStr));

    console.log(`Generating random entried from: ${dateFrom} to ${dateTo}`);

    const valuesToStore = {};
    for (let day = dateFrom; day <= dateTo; day.setDate(day.getDate() + 1))
    {
        if (!workingDays.includes(day.getDay()))
        {
            continue;
        }

        const entry0 = sumTime(usualTimes[0], randomTime(0, 30));
        const entry1 = sumTime(usualTimes[1], randomTime(0, 15));
        const entry2 = sumTime(usualTimes[2], randomTime(0, 15));
        const entry3 = sumTime(usualTimes[3], randomTime(0, 30));
        const entry = { values: [entry0, entry1, entry2, entry3] };
        valuesToStore[generateKey(day.getFullYear(), day.getMonth(), day.getDate())] = entry;
    }
    console.log(`Generated ${Object.keys(valuesToStore).length} entries`);
    const entryStore = new Store({name: 'flexible-store'});
    entryStore.set(valuesToStore);
}

module.exports = {
    generateDemoInformation
};
