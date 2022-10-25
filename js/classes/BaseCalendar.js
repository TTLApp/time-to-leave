'use strict';

const Store = require('electron-store');
const { ipcRenderer } = require('electron');

import {
    hourMinToHourFormatted,
    isNegative,
    subtractTime,
    sumTime,
    validateTime
} from '../time-math.js';
import {
    formatDayId,
    displayWaiverWindow
} from '../../renderer/workday-waiver-aux.js';
import { showDay, switchCalendarView } from '../user-preferences.js';
import { getDateStr, getMonthLength } from '../date-aux.js';
import { computeAllTimeBalanceUntilAsync } from '../time-balance.js';
import { generateKey } from '../date-db-formatter.js';
import { getTranslationInLanguageData } from '../../renderer/i18n-translator.js';

// Global values for calendar
const flexibleStore = new Store({name: 'flexible-store'});
const waivedWorkdays = new Store({name: 'waived-workdays'});

// Holds the calendar information and manipulation functions
class BaseCalendar
{
    /**
     * @param {Object.<string, any>} preferences
     */
    constructor(preferences, languageData)
    {
        this._calendarDate = new Date();
        this.updateLanguageData(languageData);
        this.loadInternalStore();
        this.loadInternalWaiveStore();
        this.updatePreferences(preferences);
        this._initCalendar();
    }

    /**
     * Initializes the calendar by generating the html code, binding JS events and then drawing according to DB.
     */
    _initCalendar()
    {
        throw Error('Please implement this.');
    }

    /**
     * Returns a date object for which the all time balance will be calculated.
     * If current month, returns the actual day. If not, first day of following month.
     * //  deepcode ignore valid-jsdoc: <not yet implemented>
     * @return {Date}
     */
    _getTargetDayForAllTimeBalance()
    {
        throw Error('Please implement this.');
    }

    /**
     * Searches for an i18n code inside the last loaded language data
     * @return {String}
     */
    _getTranslation(code)
    {
        return getTranslationInLanguageData(this._languageData.data, code);
    }

    /**
     * Calls Async method to update the All Time Balance.
     */
    _updateAllTimeBalance()
    {
        const targetDate = this._getTargetDayForAllTimeBalance();
        computeAllTimeBalanceUntilAsync(targetDate)
            .then(balance =>
            {
                const balanceElement = $('#overall-balance');
                if (balanceElement)
                {
                    balanceElement.val(balance).removeClass('text-success text-danger')
                        .html(balance).addClass(isNegative(balance) ? 'text-danger' : 'text-success');
                }
            })
            .catch(err =>
            {
                console.log(err);
            });
    }

    /**
     * Gets value from internal waiver store.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @return {string} A time string
     */
    _getWaiverStore(year, month, day)
    {
        const dayKey = getDateStr(new Date(year, month, day));
        return this._internalWaiverStore[dayKey];
    }

    /**
     * Returns the last valid day before the current one, to print the balance row
     * @return {number} Integer value representing a day (1-31)
     */
    _getBalanceRowPosition()
    {
        if (this._getCalendarYear() !== this._getTodayYear() || this._getCalendarMonth() !== this._getTodayMonth())
        {
            return getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        }

        let balanceRowPosition = 0;
        const lastDay = this._getCountToday() ? this._getTodayDate() + 1 : this._getTodayDate();
        for (let day = 1; day < lastDay; ++day)
        {
            if (this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                balanceRowPosition = day;
            }
        }

        return balanceRowPosition;
    }

    /**
     * Updates the code of the table body of the calendar, to be called on demand.
     */
    _updateTableBody()
    {
        $('#calendar-table-body').html(this._generateTableBody());
    }

    /**
     * Returns the code of the table footer of the calendar.
     * @return {string}
     */
    _generateTableFooter()
    {
        return '<button class="punch-button" id="punch-button" disabled>' +
                   '<img src="assets/fingerprint.svg" height="36" width="36"></img>' +
                   `<label for="punch-button" id="punch-button-label">${this._getTranslation('$Menu.punch-time')}</label>` +
               '</button>\n';
    }

    /**
     * Updates the code of the table footer of the calendar, to be called on demand.
     */
    _updateTableFooter()
    {
        $('#footer').html(this._generateTableFooter());
    }

    /**
     * Reloads internal DBs based on external DBs and then redraws the calendar.
     */
    reload()
    {
        this.loadInternalStore();
        this.loadInternalWaiveStore();
        this.redraw();
    }

    /*
     * Draws elements of the Calendar that depend on data.
     */
    _draw()
    {
        this._updateTableHeader();
        this._updateTableBody();
        this._updateTableFooter();
        this._updateBasedOnDB();

        const isCurrentMonth = this._getTodayMonth() === this._getCalendarMonth() && this._getTodayYear() === this._getCalendarYear();
        const waivedInfo = this._getWaiverStore(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        const showCurrentDay = this._showDay(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        this._togglePunchButton(isCurrentMonth && showCurrentDay && waivedInfo === undefined);

        this._updateLeaveBy();

        const calendar = this;

        $('#punch-button').on('click', () => { calendar.punchDate(); });

        $('input[type=\'time\']').off('input propertychange').on('input propertychange', function()
        {
            //  deepcode ignore no-invalid-this: jQuery use
            calendar._updateTimeDayCallback($(this).attr('data-date'));
        });

        $('.waiver-trigger').off('click').on('click', function()
        {
            //  deepcode ignore no-invalid-this: jQuery use
            const dayId = $(this).closest('tr').attr('id').substr(3);
            const waiverDay = formatDayId(dayId);
            displayWaiverWindow(waiverDay);
        });

        this._updateAllTimeBalance();
    }

    /**
     * Gets the total for a specific day by looking into both stores.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @return {string|undefined}
     */
    _getDayTotal(year, month, day)
    {
        const dateKey = generateKey(year, month, day);
        const values = this._getStore(dateKey);
        if (values !== undefined && values.length > 0)
        {
            const validatedTimes = this._validateTimes(values);
            const inputsHaveExpectedSize = values.length >= 2 && values.length % 2 === 0;
            const validatedTimesOk = validatedTimes.length > 0 && validatedTimes.every(time => time !== '--:--');
            const hasDayEnded = inputsHaveExpectedSize && validatedTimesOk;

            let dayTotal = undefined;
            if (hasDayEnded)
            {
                dayTotal = '00:00';
                let timesAreProgressing = true;
                if (validatedTimes.length >= 2 && validatedTimes.length % 2 === 0)
                {
                    for (let i = 0; i < validatedTimes.length; i += 2)
                    {
                        const difference = subtractTime(validatedTimes[i], validatedTimes[i + 1]);
                        dayTotal = sumTime(dayTotal, difference);
                        if (validatedTimes[i] >= validatedTimes[i + 1])
                        {
                            timesAreProgressing = false;
                        }
                    }
                }
                if (!timesAreProgressing)
                {
                    return undefined;
                }
            }
            return dayTotal;
        }

        const waiverTotal = this._getWaiverStore(year, month, day);
        if (waiverTotal !== undefined)
        {
            return waiverTotal['hours'];
        }
        return undefined;
    }

    /**
     * Alias to Calendar::draw()
     */
    redraw()
    {
        this._draw();
    }

    /**
     * Responsible for adding new entries to the calendar view.
     */
    _addTodayEntries()
    {
        throw Error('Please implement this.');
    }

    /**
    * Every day change, if the calendar is showing the same month as that of the previous day,
    * this function is called to redraw the calendar.
    */
    refreshOnDayChange()
    {
        throw Error('Please implement this.');
    }

    /**
     * Go to current month.
     */
    _goToCurrentDate()
    {
        this._calendarDate = new Date();
        this.redraw();
    }

    /**
     * Gets today's year
     * @return {number} Integer year in 4 digits YYYY
     */
    _getTodayYear()
    {
        return (new Date()).getFullYear();
    }

    /**
     * Gets today's month.
     * @return {number} Integer month in 2 digits MM (0-11)
     */
    _getTodayMonth()
    {
        return (new Date()).getMonth();
    }

    /**
     * Gets today's date.
     * @return {number} Integer day in 1-2 digits (1-31)
     */
    _getTodayDate()
    {
        return (new Date()).getDate();
    }

    /**
     * Gets year of displayed calendar.
     * @return {number} Integer year in 4 digits YYYY
     */
    _getCalendarYear()
    {
        return this._calendarDate.getFullYear();
    }

    /**
     * Gets month of displayed calendar.
     * @return {number} Integer month in 2 digits MM (0-11)
     */
    _getCalendarMonth()
    {
        return this._calendarDate.getMonth();
    }

    /**
     * Gets day of displayed calendar. (Used only in DayCalendar)
     * @return {number} Integer day in 1-2 digits (1-31)
     */
    _getCalendarDate()
    {
        return this._calendarDate.getDate();
    }

    /**
     * Returns how many "hours per day" were set in preferences.
     * @return {string}
     */
    _getHoursPerDay()
    {
        return this._preferences['hours-per-day'];
    }

    /**
     * Returns if "hide non-working days" was set in preferences.
     * @return {Boolean}
     */
    _getHideNonWorkingDays()
    {
        return this._preferences['hide-non-working-days'];
    }

    /**
     * Returns if "enable prefill break time" was set in preferences
     * @return {Boolean}
     */
    _getEnablePrefillBreakTime()
    {
        return this._preferences['enable-prefill-break-time'];
    }

    /**
     * Returns "break time interval" set in preferences
     * @return {string}
     */
    _getBreakTimeInterval()
    {
        return this._preferences['break-time-interval'];
    }

    /**
     * Returns if "count today" was set in preferences.
     * @return {Boolean}
     */
    _getCountToday()
    {
        return this._preferences['count-today'];
    }

    /**
     * Updates calendar settings from a given preferences file.
     * @param {Object.<string, any>} preferences
     */
    updatePreferences(preferences)
    {
        this._preferences = preferences;
    }

    /**
     * Updates calendar language data from a given array.
     * @param {Object.<string, string>} languageData
     */
    updateLanguageData(languageData)
    {
        this._languageData = languageData;
    }

    /**
     * Stores year data in memory to make operations faster
     */
    loadInternalStore()
    {
        this._internalStore = {};

        for (const entry of flexibleStore)
        {
            const key = entry[0];
            const value = entry[1];

            this._internalStore[key] = value;
        }
    }

    /**
     * Stores waiver data in memory to make operations faster
     */
    loadInternalWaiveStore()
    {
        this._internalWaiverStore = {};

        for (const entry of waivedWorkdays)
        {
            const date = entry[0];
            const reason = entry[1]['reason'];
            const hours = entry[1]['hours'];

            this._internalWaiverStore[date] = {
                'hours': hours,
                'reason': reason
            };
        }
    }

    /*
     * Gets value from internal store.
     */
    _getStore(key)
    {
        return this._internalStore[key] !== undefined ? this._internalStore[key].values : [];
    }

    /*
     * Saves value on store and updates internal store.
     */
    _setStore(key, newValues)
    {
        this._internalStore[key] = { values: newValues };
        flexibleStore.set(key, this._internalStore[key]);
    }

    /*
     * Removes value from store and from internal store.
     */
    _removeStore(key)
    {
        this._internalStore[key] = undefined;
        flexibleStore.delete(key);
    }

    /**
     * Calls showDay from user-preferences.js passing the last preferences set.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @return {Boolean}
     */
    _showDay(year, month, day)
    {
        return showDay(year, month, day, this._preferences);
    }

    /**
     * Returns whether the inputs for the day are all filled.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @return {Boolean}
     */
    _areAllInputsFilled(year, month, day)
    {
        const dateKey = generateKey(year, month, day);
        const inputs = $('#' + dateKey + ' input[type="time"]');
        let allInputsFilled = true;
        for (const input of inputs)
        {
            allInputsFilled &= $(input).val().length !== 0;
        }
        return allInputsFilled;
    }

    /**
     * Calculates time for break end based on break interval
     * @param {string} breakBegin
     * @return {string}
     */
    _calculateBreakEnd(breakBegin)
    {
        const breakInterval = this._getBreakTimeInterval();
        let breakEnd = sumTime(breakBegin, breakInterval);

        breakEnd = validateTime(breakEnd) ? breakEnd : '23:59';
        return breakEnd;
    }

    /**
     * Adds the next missing entry on the actual day and updates calendar.
     */
    punchDate()
    {
        const now = new Date(),
            year = now.getFullYear(),
            month = now.getMonth(),
            day = now.getDate(),
            hour = now.getHours(),
            min = now.getMinutes();

        if (this._getCalendarMonth() !== month ||
            this._getCalendarYear() !== year ||
            !this._showDay(year, month, day))
        {
            return;
        }

        if (this._areAllInputsFilled(year, month, day))
        {
            this._addTodayEntries();
        }

        const value = hourMinToHourFormatted(hour, min);
        const key = generateKey(year, month, day);
        const inputs = $('#' + key + ' input[type="time"]');

        for (let i = 0; i < inputs.length; i++)
        {
            if ($(inputs[i]).val().length === 0)
            {
                $(inputs[i]).val(value);

                //Prefill break time
                if (this._prefillEntryIndex(i, inputs))
                {
                    const breakEnd = this._calculateBreakEnd(value);
                    $(inputs[i + 1]).val(breakEnd);
                }
                this._updateTimeDayCallback(key);
                break;
            }
        }
    }

    /**
     * Returns true if next entry should be prefilled based on break interval
     * @param {number} idx
     * @param {array} inputs
     * @return {Boolean}
     */
    _prefillEntryIndex(idx, inputs)
    {
        if (this._getEnablePrefillBreakTime() &&
            idx !== inputs.length - 1 &&
            idx % 2 === 1)
        {
            return true;
        }
        return false;
    }

    /**
     * Based on the key of the input, updates the values for total in DB and display it on page.
     * @param {string} key
     */
    _updateTimeDayCallback(key)
    {
        this._updateTimeDay(key);
        this._updateLeaveBy();
        this._updateBalance();
    }

    /**
     * Based on the dateKey of the input, if an array of valid time values is given, the internal DB values are replaced.
     * If they're invalid, the internal value is removed.
     * @param {string} dateKey
     * @param {Array.string} newValues Time values
     */
    _updateDbEntry(dateKey, newValues)
    {
        const validatedTimes = this._validateTimes(newValues, true /*removeEndingInvalids*/);
        if (validatedTimes.length > 0)
        {
            this._setStore(dateKey, validatedTimes);
        }
        else
        {
            this._removeStore(dateKey);
        }
    }

    /**
     * Updates Day Total for a given day
     * @param {string} key
     */
    _updateDayTotal(key)
    {
        const dayTotalSpan = $('#' + key).parent().find('.day-total-cell span');
        dayTotalSpan.html('');

        const inputs = $('#' + key + ' input[type="time"]');
        const values = this._getStore(key);
        const validatedTimes = this._validateTimes(values);

        const storeHasExpectedSize = values.length === inputs.length;
        const inputsHaveExpectedSize = inputs.length >= 2 && inputs.length % 2 === 0;
        const validatedTimesOk = validatedTimes.length > 0 && validatedTimes.every(time => time !== '--:--');
        const hasDayEnded = storeHasExpectedSize && inputsHaveExpectedSize && validatedTimesOk;

        if (hasDayEnded)
        {
            let dayTotal = '00:00';
            let timesAreProgressing = true;
            if (validatedTimes.length >= 2 && validatedTimes.length % 2 === 0)
            {
                for (let i = 0; i < validatedTimes.length; i += 2)
                {
                    const difference = subtractTime(validatedTimes[i], validatedTimes[i + 1]);
                    dayTotal = sumTime(dayTotal, difference);
                    if (validatedTimes[i] >= validatedTimes[i + 1])
                    {
                        timesAreProgressing = false;
                    }
                }
            }
            if (timesAreProgressing)
            {
                dayTotalSpan.html(dayTotal);
            }
        }
    }

    /**
     * Calculate the time to leave for today for use in _updateLeaveBy().
     * @return {string} leave by value
     */
    _calculateLeaveBy()
    {
        let leaveBy = '--:--';
        const dateKey = generateKey(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        const values = this._getStore(dateKey);
        const validatedTimes = this._validateTimes(values, true /*removeEndingInvalids*/);
        if (validatedTimes.length > 0 && validatedTimes.every(time => time !== '--:--'))
        {
            const smallestMultipleOfTwo = Math.floor(validatedTimes.length/2)*2;
            let dayTotal = '00:00';
            let timesAreProgressing = true;
            for (let i = 0; i < smallestMultipleOfTwo; i += 2)
            {
                const difference = subtractTime(validatedTimes[i], validatedTimes[i + 1]);
                dayTotal = sumTime(dayTotal, difference);
                if (validatedTimes[i] >= validatedTimes[i + 1])
                {
                    timesAreProgressing = false;
                }
            }
            if (timesAreProgressing)
            {
                const lastTime = validatedTimes[validatedTimes.length-1];
                const remainingTime = subtractTime(dayTotal, this._getHoursPerDay());
                leaveBy = sumTime(lastTime, remainingTime);
            }
        }
        return leaveBy;
    }

    /**
     * Returns an array of only validated values.
     * @param {Array} values
     * @param {Boolean} removeEndingInvalids Removes invalid '--:--' values at end of sequence.
     *     For example, for a sequence ['08:00', '--:--', '10:00', '--:--' , '--:--' , '--:--'], will return ['08:00', '--:--', '10:00']
     * @return {Array}
     */
    _validateTimes(values, removeEndingInvalids = false)
    {
        const validatedTimes = [];
        if (values.length > 0)
        {
            for (const time of values)
            {
                validatedTimes.push(validateTime(time) ? time : '--:--');
            }
        }

        if (removeEndingInvalids)
        {
            for (let i = validatedTimes.length-1; i >= 0; i--)
            {
                if (validatedTimes[i] === '--:--')
                {
                    validatedTimes.splice(i, 1);
                }
                else
                {
                    break;
                }
            }
        }

        return validatedTimes;
    }
    /**
     * Toggles the state of the punch butttons and actions on or off
     * @param {Boolean} enable
     */
    _togglePunchButton(enable)
    {
        $('#punch-button').prop('disabled', !enable);
        ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', enable);
    }

    /**
     * Switches the calendar from Month to Day view.
     */
    _switchView()
    {
        const preferences = switchCalendarView();
        ipcRenderer.send('VIEW_CHANGED', preferences);
    }
}

export {
    BaseCalendar
};
