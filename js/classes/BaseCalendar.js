'use strict';

const Store = require('electron-store');
const { ipcRenderer } = require('electron');
const {
    hourMinToHourFormatted,
    isNegative,
    subtractTime,
    sumTime,
    validateTime
} = require('../time-math.js');
const {
    formatDayId,
    sendWaiverDay,
    displayWaiverWindow
} = require('../workday-waiver-aux.js');
const { showDay, switchCalendarView } = require('../user-preferences.js');
const { getDateStr, getMonthLength } = require('../date-aux.js');
const { getMonthName } = require('../date-to-string-util.js');
const { computeAllTimeBalanceUntilAsync } = require('../time-balance.js');
const { generateKey } = require('../date-db-formatter.js');

// Global values for calendar
const flexibleStore = new Store({name: 'flexible-store'});
const waivedWorkdays = new Store({name: 'waived-workdays'});

// Holds the calendar information and manipulation functions
class BaseCalendar
{
    /**
     * @param {Object.<string, any>} preferences
     */
    constructor(preferences)
    {
        this._calendarDate = new Date();
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
     * @return {Date}
     */
    _getTargetDayForAllTimeBalance()
    {
        throw Error('Please implement this.');
        return new Date();
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
                let balanceElement = $('#overall-balance');
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
        let dayKey = getDateStr(new Date(year, month, day));
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
        for (let day = 1; day < this._getTodayDate(); ++day)
        {
            if (this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                balanceRowPosition = day;
            }
        }

        return balanceRowPosition;
    }

    /**
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    _updateTableHeader()
    {
        $('#month-year').html(`${getMonthName(this._getCalendarMonth())} ${this._getCalendarYear()}`);
    }

    /**
     * Updates the code of the table body of the calendar, to be called on demand.
     */
    _updateTableBody()
    {
        $('#calendar-table-body').html(this._generateTableBody());
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
        this._updateBasedOnDB();

        let waivedInfo = this._getWaiverStore(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        let showCurrentDay = this._showDay(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        this._togglePunchButton(showCurrentDay && waivedInfo === undefined);

        this._updateLeaveBy();

        const calendar = this;
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
            sendWaiverDay(waiverDay);
            displayWaiverWindow();
        });

        this._updateAllTimeBalance();
    }

    /**
     * Alias to Calendar::draw()
     */
    redraw()
    {
        this._draw();
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
     * Stores year data in memory to make operations faster
     */
    loadInternalStore()
    {
        this._internalStore = [];

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

    /*
     * Will check if the inputs for today are all filled and then enable the button, if not.
     */
    _checkTodayPunchButton()
    {
        const today = new Date();
        const isCurrentMonth = (today.getMonth() === this._calendarDate.getMonth() && today.getFullYear() === this._calendarDate.getFullYear());
        let enableButton = false;
        if (isCurrentMonth)
        {
            const dateKey = generateKey(today.getFullYear(), today.getMonth(), today.getDate());
            const inputs = $('#' + dateKey + ' input[type="time"]');
            let allInputsFilled = true;
            for (let input of inputs)
            {
                allInputsFilled &= $(input).val().length !== 0;
            }
            enableButton = !allInputsFilled;
        }
        this._togglePunchButton(enableButton);
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

        const value = hourMinToHourFormatted(hour, min);
        const key = generateKey(year, month, day);
        const inputs = $('#' + key + ' input[type="time"]');
        for (const element of inputs)
        {
            if ($(element).val().length === 0)
            {
                $(element).val(value);
                this._updateTimeDayCallback(key);
                break;
            }
        }
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
        let validatedTimes = this._validateTimes(newValues);
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
        const inputsHaveExpectedSize = values.length >= 4 && values.length % 2 === 0;
        const validatedTimesOk = validatedTimes.length > 0 && validatedTimes.every(time => time !== '--:--');
        const hasDayEnded = storeHasExpectedSize && inputsHaveExpectedSize && validatedTimesOk;

        if (hasDayEnded)
        {
            let dayTotal = '00:00';
            let timesAreProgressing = true;
            if (validatedTimes.length >= 4 && validatedTimes.length % 2 === 0)
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
        let validatedTimes = [];
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

module.exports = {
    BaseCalendar
};
