'use strict';

const Store = require('electron-store');
const { ipcRenderer } = require('electron');
const {
    hourMinToHourFormatted,
    isNegative,
    multiplyTime,
    subtractTime,
    sumTime,
    validateTime
} = require('../time-math.js');
const { showDay, switchCalendarView } = require('../user-preferences.js');
const { getDateStr, getMonthLength } = require('../date-aux.js');
const {
    formatDayId,
    sendWaiverDay,
    displayWaiverWindow
} = require('../workday-waiver-aux.js');
const { computeAllTimeBalanceUntilAsync } = require('../time-balance.js');
const { generateKey } = require('../date-db-formatter.js');
const { getDayAbbr, getMonthName } = require('../date-to-string-util.js');
const i18n = require('../../src/configs/i18next.config.js');

// Global values for calendar
const store = new Store();
const waivedWorkdays = new Store({name: 'waived-workdays'});

// Holds the calendar information and manipulation functions
class Calendar
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
        this._generateTemplate();

        $('#next-month').click(() => { this._nextMonth(); });
        $('#prev-month').click(() => { this._prevMonth(); });
        $('#current-month').click(() => { this._goToCurrentDate(); });
        $('#switch-view').click(() => { this._switchView(); });

        this._draw();
    }

    /**
     * Returns a date object for which the all time balance will be calculated.
     * If current month, returns the actual day. If not, first day of following month.
     * @return {Date}
     */
    _getTargetDayForAllTimeBalance()
    {
        let targetYear = this._getCalendarYear(),
            targetMonth = this._getCalendarMonth(),
            // If we are not displaying the current month we need to compute the balance including the
            // last day of the month. To do so we move to the first day of the following month
            isCurrentMonth = targetYear === this._getTodayYear() && targetMonth === this._getTodayMonth(),
            targetDate = isCurrentMonth ?
                new Date(targetYear, targetMonth, this._getTodayDate()) :
                new Date(targetYear, targetMonth + 1, 1);
        if (isCurrentMonth && this._getCountToday())
        {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        return targetDate;
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
                    balanceElement.val(balance);
                    balanceElement.html(balance);
                    balanceElement.removeClass('text-success text-danger');
                    balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
                }
            })
            .catch(err =>
            {
                console.log(err);
            });
    }

    /**
     * Draws elements of the Calendar that depend on DB data.
     */
    _draw()
    {
        this._updateTableHeader();
        this._updateTableBody();
        this._updateBasedOnDB();

        let waivedInfo = this._getWaiverStore(this._getTodayDate(), this._getTodayMonth(), this._getTodayYear());
        let showCurrentDay = this._showDay(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        this._togglePunchButton(showCurrentDay && waivedInfo === undefined);

        this._updateLeaveBy();

        let calendar = this;
        $('input[type=\'time\']').off('input propertychange').on('input propertychange', function()
        {
            calendar._updateTimeDayCallback(this.id, this.value);
        });

        $('.waiver-trigger').off('click').on('click', function()
        {
            const dayId = $(this).closest('tr').attr('id').substr(3);
            const waiverDay = formatDayId(dayId);
            sendWaiverDay(waiverDay);
            displayWaiverWindow();
        });

        this._updateAllTimeBalance();
    }

    /**
     * Updates data displayed based on the database.
     * @param {number} day
     * @param {number} month
     * @param {string} key
     * @return {string|undefined} A time string
     */
    _setTableData(day, month, key)
    {
        let idTag = this._getCalendarYear() + '-' + month + '-' + day + '-' + key;

        let value = this._getStore(day, month, this._getCalendarYear(), key);
        if (value === undefined)
        {
            value = '';
        }
        $('#' + idTag).val(value);
        return value;
    }

    /**
     * Gets value from internal store.
     * @param {number} day
     * @param {number} month
     * @param {number} year
     * @param {string} key
     * @return {string|undefined} A time string
     */
    _getStore(day, month, year, key)
    {
        let idTag = generateKey(year, month, day, key);
        return this._internalStore[idTag];
    }

    /**
     * Saves value on store and updates internal store.
     * @param {number} day
     * @param {number} month
     * @param {number} year
     * @param {string} key
     * @param {string} newValue valid time value
     */
    _setStore(day, month, year, key, newValue)
    {
        let idTag = generateKey(year, month, day, key);

        this._internalStore[idTag] = newValue;
        store.set(idTag, newValue);
    }

    /**
     * Removes value from store and from internal store.
     * @param {number} day
     * @param {number} month
     * @param {number} year
     * @param {string} key
     */
    _removeStore(day, month, year, key)
    {
        let idTag = generateKey(year, month, day, key);

        this._internalStore[idTag] = undefined;
        store.delete(idTag);
    }

    /**
     * Gets value from internal waiver store.
     * @param {number} day
     * @param {number} month
     * @param {number} year
     * @return {string} A time string
     */
    _getWaiverStore(day, month, year)
    {
        let dayKey = getDateStr(new Date(year, month, day));

        return this._internalWaiverStore[dayKey];
    }

    /**
     * Generates the calendar HTML view.
     */
    _generateTemplate()
    {
        let body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'month');
    }

    /**
     * Returns the time input HTML code of a date.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @param {string} key
     * @return {string}
     */
    static _getInputCode(year, month, day, key)
    {
        let idTag = generateKey(year, month, day, key);

        return '<input type="time" id="' + idTag + '"' +
               (key.endsWith('total') ? ' disabled' : '') +
               '>';
    }

    /**
     * Returns the total field HTML code of a date.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @param {string} key
     * @return {string}
     */
    static _getTotalCode(year, month, day, key)
    {
        let idTag = generateKey(year, month, day, key);

        return '<input type="text" class="total-input" id="' +
               idTag + '" size="5"' +
               (key.endsWith('total') ? ' disabled' : '') +
               '>';
    }

    /**
     * Returns the summary field HTML code.
     * @return {string}
     */
    static _getSummaryRowCode()
    {
        let leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        let summaryStr = i18n.t('$Calendar.leave-by');
        let code = '<tr class="summary" id="summary-unfinished-day">' +
                     '<td class="leave-by-text" colspan="7">' + summaryStr + '</td>' +
                     '<td class="leave-by-time">' + leaveByCode + '</td>' +
                   '</tr>';
        let finishedSummaryStr = i18n.t('$Calendar.all-done');
        let dayBalance = '<input type="text" id="leave-day-balance" size="5" disabled>';
        code += '<tr class="summary hidden" id="summary-finished-day">' +
                    '<td class="leave-by-text" colspan="7">' + finishedSummaryStr + '</td>' +
                    '<td class="leave-by-time">' + dayBalance + '</td>' +
                '</tr>';
        return code;
    }

    /**
     * Returns the HTML code for the row with working days, month total and balance.
     * @return {string}
     */
    static _getBalanceRowCode()
    {
        return '<tr>' +
                '<tr class="month-total-row">' +
                    `<td class="month-total-text" title="${i18n.t('$Calendar.last-day-balance')}">${i18n.t('$Calendar.on')}</td>` +
                    `<td class="month-total-time" title="${i18n.t('$Calendar.last-day-balance')}"><input type="text" id="month-day-input" size="2" disabled></td>` +
                    `<td class="month-total-text" title="${i18n.t('$Calendar.working-days-title')}">${i18n.t('$Calendar.working-days')}</td>` +
                    `<td class="month-total-time" title="${i18n.t('$Calendar.working-days-title')}"><input type="text"  id="month-working-days" size="5" disabled></td>` +
                    `<td class="month-total-text" title="${i18n.t('$Calendar.month-balance-title')}">${i18n.t('$Calendar.month-balance')}</td>` +
                    `<td class="month-total-time" title="${i18n.t('$Calendar.month-balance-title')}"><input type="text" id="month-balance" size="8" disabled></td>` +
                    `<td class="month-total-text" title="${i18n.t('$Calendar.overall-balance-title')}">${i18n.t('$Calendar.overall-balance')}</td>` +
                    `<td class="month-total-time" title="${i18n.t('$Calendar.overall-balance-title')}"><input type="text" id="overall-balance" size="8" placeholder="..." disabled></td>` +
                '</tr>' +
            '</tr>';
    }

    /**
     * Returns the code of a calendar row.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @return {string}
     */
    _getInputsRowCode(year, month, day)
    {
        let currentDay = new Date(year, month, day),
            weekDay = currentDay.getDay(),
            today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            trID = ('tr-' + generateKey(year, month, day));

        if (!this._showDay(year, month, day))
        {
            if (!this._getHideNonWorkingDays())
            {
                return '<tr'+ (isToday ? ' class="today-non-working"' : '') + ' id="' + trID + '">' +
                        '<td class="weekday ti">' + getDayAbbr(weekDay) + '</td>' +
                        '<td class="day ti">' + day + '</td>' +
                        '<td class="day non-working-day" colspan="6">' + '</td>' +
                    '</tr>\n';
            }
            else
            {
                return '';
            }
        }

        let waivedInfo = this._getWaiverStore(day, month, year);
        if (waivedInfo !== undefined)
        {
            let summaryStr = '<b>Waived day: </b>' + waivedInfo['reason'];
            let waivedLineHtmlCode =
                 '<tr'+ (isToday ? ' class="isToday"' : '') + ' id="' + trID + '">' +
                    '<td class="weekday ti">' + getDayAbbr(weekDay) + '</td>' +
                    '<td class="day ti">' + day + '</td>' +
                    '<td class="waived-day-text" colspan="5">' + summaryStr + '</td>' +
                    '<td class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'day-total') + '</td>' +
                '</tr>\n';
            return waivedLineHtmlCode;
        }

        let htmlCode =
                 '<tr'+ (isToday ? ' class="isToday"' : '') + ' id="' + trID + '">' +
                    '<td class="weekday waiver-trigger ti" title="Add a waiver for this day">' + getDayAbbr(weekDay) + '</td>' +
                    '<td class="day ti">' +
                        '<span class="day-number"> ' + day + ' </span>' +
                        '<img src="assets/waiver.svg" height="15" class="waiver-img">' +
                    '</td>' +
                    '<td class="ti">' + this.constructor._getInputCode(year, month, day, 'day-begin') + '</td>' +
                    '<td class="ti">' + this.constructor._getInputCode(year, month, day, 'lunch-begin') + '</td>' +
                    '<td class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'lunch-total') + '</td>' +
                    '<td class="ti">' + this.constructor._getInputCode(year, month, day, 'lunch-end') + '</td>' +
                    '<td class="ti">' + this.constructor._getInputCode(year, month, day, 'day-end') + '</td>' +
                    '<td class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'day-total') + '</td>' +
                '</tr>\n';

        if (isToday)
        {
            htmlCode += this.constructor._getSummaryRowCode();
        }

        return htmlCode;
    }

    /**
     * Returns the header of the page, with the image, name and a message.
     * @return {string}
     */
    static _getPageHeader()
    {
        let switchView = `<input id="switch-view" type="image" src="assets/switch.svg" alt="${i18n.t('$Calendar.switch-view')}" title="${i18n.t('$Calendar.switch-view-title')}" height="24" width="24"></input>`;
        let todayBut = `<input id="current-month" type="image" src="assets/calendar.svg" alt="${i18n.t('$Calendar.current-month')}" title="${i18n.t('$Calendar.current-month-title')}" height="24" width="24"></input>`;
        let leftBut = `<input id="prev-month" type="image" src="assets/left-arrow.svg" alt="${i18n.t('$Calendar.previous-month')}" height="24" width="24"></input>`;
        let rightBut = `<input id="next-month" type="image" src="assets/right-arrow.svg" alt="${i18n.t('$Calendar.next-month')}" height="24" width="24"></input>`;
        return '<div class="title-header">'+
                    '<div class="title-header title-header-img"><img src="assets/timer.svg" height="64" width="64"></div>' +
                    `<div class="title-header title-header-text">${i18n.t('$Calendar.time-to-leave')}</div>` +
                    '<div class="title-header title-header-msg"></div>' +
               '</div>' +
                '<table class="table-header"><tr>' +
                    '<th class="th but-switch-view">' + switchView + '</th>' +
                    '<th class="th but-left">' + leftBut + '</th>' +
                    '<th class="th th-month-name" colspan="18"><div class="div-th-month-name" id="month-year"></div></th>' +
                    '<th class="th but-right">' + rightBut + '</th>' +
                    '<th class="th but-today">' + todayBut + '</th>' +
                '</tr></table>';
    }

    /**
     * Returns the code of the header of the calendar table
     * @return {string}
     */
    static _getTableHeaderCode()
    {
        return '<thead>' +
                '<tr>' +
                    `<th class="th th-label th-day-name dayheader" colspan="2">${i18n.t('$Calendar.day')}</th>` +
                    `<th class="th th-label">${i18n.t('$Calendar.day-start')}</th>` +
                    `<th class="th th-label">${i18n.t('$Calendar.lunch-start')}</th>` +
                    `<th class="th th-label">${i18n.t('$Calendar.lunch-total')}</th>` +
                    `<th class="th th-label">${i18n.t('$Calendar.lunch-end')}</th>` +
                    `<th class="th th-label">${i18n.t('$Calendar.day-end')}</th>` +
                    `<th class="th th-label">${i18n.t('$Calendar.day-total')}</th>` +
                '</tr>' +
                '</thead>\n';
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
     * Returns the template code of the body of the page.
     * @return {string}
     */
    _getBody()
    {
        let html = '<div>';
        html += this.constructor._getPageHeader();
        html += '<table class="table-body">';
        html += this.constructor._getTableHeaderCode();
        html += '<tbody id="calendar-table-body">';
        html += '</tbody>';
        html += '</table><br>';
        html += '</div>';

        return html;
    }

    /**
     * Returns the code of the table body of the calendar.
     * @return {string}
     */
    _generateTableBody()
    {
        let html = '';
        let monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let balanceRowPosition = this._getBalanceRowPosition();

        for (let day = 1; day <= monthLength; ++day)
        {
            html += this._getInputsRowCode(this._getCalendarYear(), this._getCalendarMonth(), day);
            if (day === balanceRowPosition)
            {
                html += this.constructor._getBalanceRowCode();
            }
        }
        return html;
    }

    /**
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    _updateTableHeader()
    {
        $('#month-year').html(getMonthName(this._getCalendarMonth()) + ' ' + this._getCalendarYear());
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
    * @param {number} oldDayDate not used in MonthCalendar, just DayCalendar
    * @param {number} oldMonthDate
    * @param {number} oldYearDate
    */
    refreshOnDayChange(oldDayDate, oldMonthDate, oldYearDate)
    {
        if (this._getCalendarMonth() === oldMonthDate && this._getCalendarYear() === oldYearDate)
        {
            this._goToCurrentDate();
        }
    }

    /**
     * Display next month.
     */
    _nextMonth()
    {
        // Set day as 1 to avoid problem when the current day on the _calendar_date
        // is not a day in the next month day's range
        this._calendarDate.setDate(1);
        this._calendarDate.setMonth(this._getCalendarMonth() + 1);
        this.redraw();
    }

    /**
     * Display previous month.
     */
    _prevMonth()
    {
        // Set day as 1 to avoid problem when the current day on the _calendar_date
        // is not a day in the prev month day's range
        this._calendarDate.setDate(1);
        this._calendarDate.setMonth(this._getCalendarMonth() - 1);
        this.redraw();
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
     * Gets the total for a specific day by looking into both stores.
     * @param {number} day
     * @param {number} month
     * @param {number} year
     * @return {string|undefined}
     */
    _getDayTotal(day, month, year)
    {
        let storeTotal = this._getStore(day, month, year, 'day-total');
        if (storeTotal !== undefined)
        {
            return storeTotal;
        }
        let waiverTotal = this._getWaiverStore(day, month, year);
        if (waiverTotal !== undefined)
        {
            return waiverTotal['hours'];
        }
        return undefined;
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
        this._internalStore = {};

        for (const entry of store)
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
     * Adds the next missing entry on the actual day and updates calendar.
     */
    punchDate()
    {
        let now = new Date(),
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

        let dayStr = generateKey(year, month, day) + '-';
        let entry = '';
        if ($('#' + dayStr + 'day-end').val() === '')
        {
            entry = 'day-end';
        }
        if ($('#' + dayStr + 'lunch-end').val() === '')
        {
            entry = 'lunch-end';
        }
        if ($('#' + dayStr + 'lunch-begin').val() === '')
        {
            entry = 'lunch-begin';
        }
        if ($('#' + dayStr + 'day-begin').val() === '')
        {
            entry = 'day-begin';
        }
        if (entry.length <= 0)
        {
            return;
        }
        let value = hourMinToHourFormatted(hour, min);
        $('#' + dayStr + entry).val(value);
        this._updateTimeDayCallback(dayStr + entry, value);
    }

    /**
     * Updates the monthly time balance and triggers the all time balance update at end.
     */
    _updateBalance()
    {
        let now = new Date(),
            monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth()),
            workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        let countDays = false;
        let isNextDay = false;

        for (let day = 1; day <= monthLength; ++day)
        {
            let isToday = (now.getDate() === day && now.getMonth() === this._getCalendarMonth() && now.getFullYear() === this._getCalendarYear());
            // balance should consider preferences and count or not today
            if (isToday && !this._getCountToday() ||
                isNextDay && this._getCountToday())
            {
                break;
            }
            isNextDay = isToday;

            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            let dayStr = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day + '-' + 'day-total';
            let dayTotal = $('#' + dayStr).val();
            if (dayTotal)
            {
                countDays = true;
                monthTotalWorked = sumTime(monthTotalWorked, dayTotal);
            }
            if (countDays)
            {
                workingDaysToCompute += 1;
            }
        }
        let monthTotalToWork = multiplyTime(this._getHoursPerDay(), workingDaysToCompute * -1);
        let balance = sumTime(monthTotalToWork, monthTotalWorked);
        let balanceElement = $('#month-balance');
        if (balanceElement)
        {
            balanceElement.val(balance);
            balanceElement.removeClass('text-success text-danger');
            balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
        }
        this._updateAllTimeBalance();
    }

    /**
     * Updates data displayed on the calendar based on the internal DB, and updates balances at end.
     */
    _updateBasedOnDB()
    {
        let monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let monthTotal = '00:00';
        let workingDays = 0;
        let stopCountingMonthStats = false;
        for (let day = 1; day <= monthLength; ++day)
        {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            let dayTotal = null;
            let dayStr = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day + '-';

            let waivedInfo = this._getWaiverStore(day, this._getCalendarMonth(), this._getCalendarYear());
            if (waivedInfo !== undefined)
            {
                let waivedDayTotal = waivedInfo['hours'];
                $('#' + dayStr + 'day-total').val(waivedDayTotal);
                dayTotal = waivedDayTotal;
            }
            else
            {
                let lunchBegin = this._setTableData(day, this._getCalendarMonth(), 'lunch-begin');
                let lunchEnd = this._setTableData(day, this._getCalendarMonth(), 'lunch-end');
                this._setTableData(day, this._getCalendarMonth(), 'lunch-total');
                let dayBegin = this._setTableData(day, this._getCalendarMonth(), 'day-begin');
                let dayEnd = this._setTableData(day, this._getCalendarMonth(), 'day-end');
                dayTotal = this._setTableData(day, this._getCalendarMonth(), 'day-total');

                this._colorErrorLine(this._getCalendarYear(), this._getCalendarMonth(), day, dayBegin, lunchBegin, lunchEnd, dayEnd);
            }

            stopCountingMonthStats |= (this._getTodayDate() === day && this._getTodayMonth() === this._getCalendarMonth() && this._getTodayYear() === this._getCalendarYear());
            if (stopCountingMonthStats)
            {
                continue;
            }

            if (dayTotal)
            {
                monthTotal = sumTime(monthTotal, dayTotal);
            }

            workingDays += 1;
        }
        let monthDayInput = $('#month-day-input');
        if (monthDayInput)
        {
            monthDayInput.val(this._getBalanceRowPosition());
        }
        let monthWorkingDays = $('#month-working-days');
        if (monthWorkingDays)
        {
            monthWorkingDays.val(workingDays);
        }
        this._updateBalance();

        this._updateLeaveBy();
    }

    /**
     * Update contents of the "time to leave" bar.
     */
    _updateLeaveBy()
    {
        if (!this._showDay(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate()) ||
            this._getTodayMonth() !== this._getCalendarMonth() ||
            this._getTodayYear() !== this._getCalendarYear() ||
            this._getWaiverStore(this._getTodayDate(), this._getCalendarMonth(), this._getCalendarYear()))
        {
            return;
        }
        let [dayBegin, lunchBegin, lunchEnd, dayEnd] = this._getDaysEntries(this._getTodayMonth(), this._getTodayDate());
        let dayKey = this._getTodayYear() + '-' + this._getTodayMonth() + '-' + this._getTodayDate() + '-';
        if (validateTime(dayBegin))
        {
            let leaveBy = sumTime(dayBegin, this._getHoursPerDay());
            let lunchTotal = $('#' + dayKey + 'lunch-total').val();
            if (lunchTotal)
            {
                leaveBy = sumTime(leaveBy, lunchTotal);
            }
            $('#leave-by').val(leaveBy <= '23:59' ? leaveBy : '--:--');
        }
        else
        {
            $('#leave-by').val('');
        }

        if (dayBegin !== undefined && lunchBegin !== undefined && lunchEnd !== undefined && dayEnd !== undefined)
        {
            //All entries computed
            this._togglePunchButton(false);

            let dayTotal = $('#' + dayKey + 'day-total').val();
            if (dayTotal)
            {
                let dayBalance = subtractTime(this._getHoursPerDay(), dayTotal);
                let leaveDayBalanceElement = $('#leave-day-balance');
                leaveDayBalanceElement.val(dayBalance);
                leaveDayBalanceElement.removeClass('text-success text-danger');
                leaveDayBalanceElement.addClass(isNegative(dayBalance) ? 'text-danger' : 'text-success');
                $('#summary-unfinished-day').addClass('hidden');
                $('#summary-finished-day').removeClass('hidden');
            }
            else
            {
                $('#summary-unfinished-day').removeClass('hidden');
                $('#summary-finished-day').addClass('hidden');
            }
        }
        else
        {
            this._togglePunchButton(true);

            $('#summary-unfinished-day').removeClass('hidden');
            $('#summary-finished-day').addClass('hidden');
        }
    }

    /**
     * Based on the key of the input, updates the values for total in DB and display it on page.
     * @param {string} key
     * @param {string} value Time value
     */
    _updateTimeDayCallback(key, value)
    {
        let [year, month, day, stage, step] = key.split('-');
        let fieldKey = stage + '-' + step;
        this._updateTimeDay(year, month, day, fieldKey, value);
        this._updateLeaveBy();
        this._updateBalance();
    }

    /**
     * Based on the date + key of the input, if a valid newValue is given, the internal DB value is replaced.
     * If it's invalid, the internal value is removed.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @param {string} key
     * @param {string} newValue Time value
     */
    _updateDbEntry(year, month, day, key, newValue)
    {
        if (validateTime(newValue))
        {
            this._setStore(day, month, year, key, newValue);
        }
        else
        {
            this._removeStore(day, month, year, key);
        }
    }

    /**
     * Validates two time strings and returns the interval if valid.
     * @param {string} lunchBegin
     * @param {string} lunchEnd
     * @return {string}
     */
    _computeLunchTime(lunchBegin, lunchEnd)
    {
        let lunchTime = '';
        if (lunchBegin && lunchEnd &&
            validateTime(lunchBegin) && validateTime(lunchEnd) &&
            (lunchEnd > lunchBegin))
        {
            lunchTime = subtractTime(lunchBegin, lunchEnd);
        }
        return lunchTime;
    }

    /**
     * Validates five time strings and returns the total day time.
     * @param {string} dayBegin
     * @param {string} dayEnd
     * @param {string} lunchBegin
     * @param {string} lunchEnd
     * @param {string} lunchTime
     * @return {string}
     */
    _computeDayTotal(dayBegin, dayEnd, lunchBegin, lunchEnd, lunchTime)
    {
        let dayTotal = '';
        if (dayBegin && dayEnd &&
            validateTime(dayBegin) && validateTime(dayEnd) &&
            (dayEnd > dayBegin))
        {
            dayTotal = subtractTime(dayBegin, dayEnd);
            if (lunchTime.length > 0 &&
                validateTime(lunchTime) &&
                (lunchBegin > dayBegin) &&
                (dayEnd > lunchEnd))
            {
                dayTotal = subtractTime(lunchTime, dayTotal);
            }
        }
        return dayTotal;
    }

    /**
     * Updates the DB with the information of computed total lunch time and day time.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @param {string} key
     * @param {string} newValue Time value
     */
    _updateTimeDay(year, month, day, key, newValue)
    {
        let baseStr = generateKey(year, month, day) + '-';

        this._updateDbEntry(year, month, day, key, newValue);

        let [dayBegin, lunchBegin, lunchEnd, dayEnd] = this._getDaysEntries(month, day);
        let lunchTime = this._computeLunchTime(lunchBegin, lunchEnd);
        let dayTotal = this._computeDayTotal(dayBegin, dayEnd, lunchBegin, lunchEnd, lunchTime);

        this._updateDbEntry(year, month, day, 'lunch-total', lunchTime);
        $('#' + baseStr + 'lunch-total').val(lunchTime);

        this._updateDbEntry(year, month, day, 'day-total', dayTotal);
        $('#' + baseStr + 'day-total').val(dayTotal);

        this._colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd);
    }

    /**
     * Returns the entry values for the day, from the internal store.
     * @param {number} month
     * @param {number} day
     * @return {string[]}
     */
    _getDaysEntries(month, day)
    {
        return [this._getStore(day, month, this._getCalendarYear(), 'day-begin'),
            this._getStore(day, month, this._getCalendarYear(), 'lunch-begin'),
            this._getStore(day, month, this._getCalendarYear(), 'lunch-end'),
            this._getStore(day, month, this._getCalendarYear(), 'day-end')];
    }

    /**
     * Analyze the inputs of a day, and return if there is an error.
     * An error means that an input earlier in the day is higher than one that is after it.
     * @param {string} dayBegin
     * @param {string} lunchBegin
     * @param {string} lunchEnd
     * @param {string} dayEnd
     * @return {Boolean}
     */
    _hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd)
    {
        let dayValues = [];
        let hasLunchStarted = false;
        if (validateTime(dayBegin))
        {
            dayValues.push(dayBegin);
        }
        if (validateTime(lunchBegin))
        {
            hasLunchStarted = true;
            dayValues.push(lunchBegin);
        }
        if (validateTime(lunchEnd))
        {
            if (!hasLunchStarted) return true;
            hasLunchStarted = false;
            dayValues.push(lunchEnd);
        }
        if (validateTime(dayEnd))
        {
            if (hasLunchStarted) return true;
            dayValues.push(dayEnd);
        }
        for (let index = 0; index < dayValues.length; index++)
        {
            if (index > 0 && (dayValues[index-1] >= dayValues[index]))
            {
                return true;
            }
        }
        return false;
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
     * Toggles the color of a row based on input error.
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @param {string} dayBegin
     * @param {string} lunchBegin
     * @param {string} lunchEnd
     * @param {string} dayEnd
     */
    _colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd)
    {
        let trID = ('#tr-' + generateKey(year, month, day));
        $(trID).toggleClass('error-tr', this._hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd));
    }

    /**
     * Switches the calendar from Month to Day view.
     */
    _switchView()
    {
        let preferences = switchCalendarView();
        ipcRenderer.send('VIEW_CHANGED', preferences);
    }
}

module.exports = {
    Calendar
};
