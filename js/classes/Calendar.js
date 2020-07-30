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
const { getDefaultWidthHeight, showDay, switchCalendarView } = require('../user-preferences.js');
const { getDateStr, getMonthLength } = require('../date-aux.js');
const {
    formatDayId,
    sendWaiverDay,
    displayWaiverWindow
} = require('../workday-waiver-aux.js');
const { computeAllTimeBalancelUntilAsync } = require('../time-balance.js');

// Global values for calendar
const store = new Store();
const waivedWorkdays = new Store({name: 'waived-workdays'});

class CalendarFactory {
    static getInstance(preferences, calendar = undefined) {
        let view = preferences.view;
        let widthHeight = getDefaultWidthHeight();
        if (view === 'day') {
            if (calendar === undefined || calendar.constructor.name !== 'DayCalendar') {
                if (calendar !== undefined && calendar.constructor.name !== 'DayCalendar') {
                    ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                }
                return new DayCalendar(preferences);
            } else {
                calendar.updatePreferences(preferences);
                calendar.redraw();
                return calendar;
            }
        } else if (view === 'month') {
            if (calendar === undefined || calendar.constructor.name !== 'Calendar') {
                if (calendar !== undefined && calendar.constructor.name !== 'Calendar') {
                    ipcRenderer.send('RESIZE_MAIN_WINDOW', widthHeight.width, widthHeight.height);
                }
                return new Calendar(preferences);
            } else {
                calendar.updatePreferences(preferences);
                calendar.redraw();
                return calendar;
            }
        }
        throw new Error(`Could not instantiate ${view}`);
    }
}

// Holds the calendar information and manipulation functions
class Calendar {
    /**
    * @param {Object.<string, any>} preferences
    */
    constructor(preferences) {
        this._options = {
            dayAbbrs : [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],
            months : [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ]
        };
        this._calendarDate = new Date();
        this.loadInternalStore();
        this.loadInternalWaiveStore();
        this.updatePreferences(preferences);
        this._initCalendar();
    }

    /*
     * Display calendar defined.
     */
    _initCalendar() {
        this._generateTemplate();

        $('#next-month').click(() => { this._nextMonth(); });
        $('#prev-month').click(() => { this._prevMonth(); });
        $('#current-month').click(() => { this._goToCurrentDate(); });
        $('#switch-view').click(() => { this._switchView(); });

        this._draw();
    }

    _updateAllTimeBalance() {
        var targetYear = this._getCalendarYear(),
            targetMonth = this._getCalendarMonth(),
            // If we are not displaying the current month we need to compute the balance including the
            // last day of the month. To do so we move to the first day of the following month
            isCurrentMonth = targetYear === this._getTodayYear() && targetMonth === this._getTodayMonth(),
            targetDate = isCurrentMonth ?
                new Date(targetYear, targetMonth, this._getCalendarDate()) :
                new Date(targetYear, targetMonth + 1, 1);
        if (isCurrentMonth && this._getCountToday()) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        computeAllTimeBalancelUntilAsync(targetDate).then(balance => {
            var balanceElement = $('#overall-balance');
            if (balanceElement) {
                balanceElement.val(balance);
                balanceElement.html(balance);
                balanceElement.removeClass('text-success text-danger');
                balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
            }
        });
    }

    /*
     * Draws elements of the Calendar that depend on data.
     */
    _draw() {
        this._updateTableHeader();
        this._updateTableBody();
        this._updateBasedOnDB();

        var waivedInfo = this._getWaiverStore(this._getTodayDate(), this._getTodayMonth(), this._getTodayYear());
        var showCurrentDay = this._showDay(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        this._togglePunchButton(showCurrentDay && waivedInfo === undefined);

        this._updateLeaveBy();

        var calendar = this;
        $('input[type=\'time\']').off('input propertychange').on('input propertychange', function() {
            calendar._updateTimeDayCallback(this.id, this.value);
        });

        $('.waiver-trigger').off('click').on('click', function() {
            const dayId = $(this).closest('tr').attr('id').substr(3);
            const waiverDay = formatDayId(dayId);
            sendWaiverDay(waiverDay);
            displayWaiverWindow();
        });

        this._updateAllTimeBalance();
    }

    /*
     * Updates data displayed based on the database.
     */
    _setTableData(day, month, key) {
        var idTag = this._getCalendarYear() + '-' + month + '-' + day + '-' + key;

        var value = this._getStore(day, month, this._getCalendarYear(), key);
        if (value === undefined) {
            value = '';
        }
        $('#' + idTag).val(value);
        return value;
    }

    /*
     * Gets value from internal store.
     */
    _getStore(day, month, year, key) {
        var idTag = year + '-' + month + '-' + day + '-' + key;

        return this._internalStore[idTag];
    }

    /*
     * Saves value on store and updates internal store.
     */
    _setStore(day, month, year, key, newValue) {
        var idTag = year + '-' + month + '-' + day + '-' + key;

        this._internalStore[idTag] = newValue;
        store.set(idTag, newValue);
    }

    /*
     * Removes value from store and from internal store.
     */
    _removeStore(day, month, year, key) {
        var idTag = year + '-' + month + '-' + day + '-' + key;

        this._internalStore[idTag] = undefined;
        store.delete(idTag);
    }

    /*
     * Gets value from internal waiver store.
     */
    _getWaiverStore(day, month, year) {
        let dayKey = getDateStr(new Date(year, month, day));

        return this._internalWaiverStore[dayKey];
    }

    /*
     * Generates the calendar HTML view.
     */
    _generateTemplate() {
        var body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'month');
    }

    /*
     * Returns the time input HTML code of a date.
     */
    static _getInputCode(year, month, day, type) {
        var idTag = year + '-' + month + '-' + day + '-' + type;

        return '<input type="time" id="' + idTag + '"' +
               (type.endsWith('total') ? ' disabled' : '') +
               '>';

    }

    /*
     * Returns the total field HTML code of a date.
     */
    static _getTotalCode(year, month, day, type) {
        var idTag = year + '-' + month + '-' + day + '-' + type;

        return '<input type="text" class="total-input" id="' +
               idTag + '" size="5"' +
               (type.endsWith('total') ? ' disabled' : '') +
               '>';
    }

    /*
     * Returns the summary field HTML code.
     */
    static _getSummaryRowCode() {
        var leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        var summaryStr = 'Based on the time you arrived today, you should leave by';
        var code = '<tr class="summary" id="summary-unfinished-day">' +
                     '<td class="leave-by-text" colspan="7">' + summaryStr + '</td>' +
                     '<td class="leave-by-time">' + leaveByCode + '</td>' +
                   '</tr>';
        var finishedSummaryStr = 'All done for today. Balance of the day:';
        var dayBalance = '<input type="text" id="leave-day-balance" size="5" disabled>';
        code += '<tr class="summary hidden" id="summary-finished-day">' +
                    '<td class="leave-by-text" colspan="7">' + finishedSummaryStr + '</td>' +
                    '<td class="leave-by-time">' + dayBalance + '</td>' +
                '</tr>';
        return code;
    }

    /*
     * Returns the HTML code for the row with working days, month total and balance.
     */
    static _getBalanceRowCode() {
        return '<tr>' +
                '<tr class="month-total-row">' +
                    '<td class="month-total-text" title="Last day used for balance">On</td>' +
                    '<td class="month-total-time" title="Last day used for balance"><input type="text" id="month-day-input"   size="2" disabled></td>' +
                    '<td class="month-total-text" title="How many working days there\'s in the month">Working days</td>' +
                    '<td class="month-total-time" title="How many working days there\'s in the month"><input type="text"  id="month-working-days" size="5" disabled></td>' +
                    '<td class="month-total-text" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month).">Month Balance</td>' +
                    '<td class="month-total-time" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month)."><input type="text" id="month-balance"     size="8" disabled></td>' +
                    '<td class="month-total-text" title="Overall balance until end of the month or current day">Overall Balance</td>' +
                    '<td class="month-total-time" title="Overall balance until end of the month or current day"><input type="text" id="overall-balance" size="8" placeholder="..." disabled></td>' +
                '</tr>' +
            '</tr>';
    }

    /*
     * Returns the code of a calendar row.
     */
    _getInputsRowCode(year, month, day) {
        var currentDay = new Date(year, month, day),
            weekDay = currentDay.getDay(),
            today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            trID = ('tr-' + year + '-' + month + '-' + day);

        if (!this._showDay(year, month, day)) {
            if (!this._getHideNonWorkingDays()) {
                return '<tr'+ (isToday ? ' class="today-non-working"' : '') + ' id="' + trID + '">' +
                        '<td class="weekday ti">' + this._options.dayAbbrs[weekDay] + '</td>' +
                        '<td class="day ti">' + day + '</td>' +
                        '<td class="day non-working-day" colspan="6">' + '</td>' +
                    '</tr>\n';
            } else {
                return '';
            }
        }

        var waivedInfo = this._getWaiverStore(day, month, year);
        if (waivedInfo !== undefined) {
            var summaryStr = '<b>Waived day: </b>' + waivedInfo['reason'];
            var waivedLineHtmlCode =
                 '<tr'+ (isToday ? ' class="isToday"' : '') + ' id="' + trID + '">' +
                    '<td class="weekday ti">' + this._options.dayAbbrs[weekDay] + '</td>' +
                    '<td class="day ti">' + day + '</td>' +
                    '<td class="waived-day-text" colspan="5">' + summaryStr + '</td>' +
                    '<td class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'day-total') + '</td>' +
                '</tr>\n';
            return waivedLineHtmlCode;
        }

        var htmlCode =
                 '<tr'+ (isToday ? ' class="isToday"' : '') + ' id="' + trID + '">' +
                    '<td class="weekday waiver-trigger ti" title="Add a waiver for this day">' + this._options.dayAbbrs[weekDay] + '</td>' +
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

        if (isToday) {
            htmlCode += this.constructor._getSummaryRowCode();
        }

        return htmlCode;
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    static _getPageHeader() {
        let switchView = '<input id="switch-view" type="image" src="assets/switch.svg" alt="Switch View" title="Switch View" height="24" width="24"></input>';
        var todayBut = '<input id="current-month" type="image" src="assets/calendar.svg" alt="Current Month" title="Go to Current Month" height="24" width="24"></input>';
        var leftBut = '<input id="prev-month" type="image" src="assets/left-arrow.svg" alt="Previous Month" height="24" width="24"></input>';
        var rightBut = '<input id="next-month" type="image" src="assets/right-arrow.svg" alt="Next Month" height="24" width="24"></input>';
        return '<div class="title-header">'+
                    '<div class="title-header title-header-img"><img src="assets/timer.svg" height="64" width="64"></div>' +
                    '<div class="title-header title-header-text">Time to Leave</div>' +
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

    /*
     * Returns the code of the header of the calendar table
     */
    static _getTableHeaderCode() {
        return '<thead>' +
                '<tr>' +
                    '<th class="th th-label th-day-name dayheader" colspan="2">Day</th>' +
                    '<th class="th th-label">Day Start</th>' +
                    '<th class="th th-label">Lunch Start</th>' +
                    '<th class="th th-label">Lunch Total</th>' +
                    '<th class="th th-label">Lunch End</th>' +
                    '<th class="th th-label">Day End</th>' +
                    '<th class="th th-label">Day total</th>' +
                '</tr>' +
                '</thead>\n';
    }

    /*
     * Returns the last valid day before the current one, to print the balance row
     */
    _getBalanceRowPosition() {
        if (this._getCalendarYear() !== this._getTodayYear() || this._getCalendarMonth() !== this._getTodayMonth()) {
            return getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        }

        var balanceRowPosition = 0;
        for (var day = 1; day < this._getTodayDate(); ++day) {
            if (this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day)) {
                balanceRowPosition = day;
            }
        }

        return balanceRowPosition;
    }

    /*
     * Returns the template code of the body of the page.
     */
    _getBody() {
        var html = '<div>';
        html += this.constructor._getPageHeader();
        html += '<table class="table-body">';
        html += this.constructor._getTableHeaderCode();
        html += '<tbody id="calendar-table-body">';
        html += '</tbody>';
        html += '</table><br>';
        html += '</div>';

        return html;
    }

    /*
     * Returns the code of the table body of the calendar.
     */
    _generateTableBody() {
        var html;
        var monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        var balanceRowPosition = this._getBalanceRowPosition();

        for (var day = 1; day <= monthLength; ++day) {
            html += this._getInputsRowCode(this._getCalendarYear(), this._getCalendarMonth(), day);
            if (day === balanceRowPosition) {
                html += this.constructor._getBalanceRowCode();
            }
        }
        return html;
    }

    /*
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    _updateTableHeader() {
        $('#month-year').html(this._options.months[this._getCalendarMonth()] + ' ' + this._getCalendarYear());
    }

    /*
     * Updates the code of the table body of the calendar, to be called on demand.
     */
    _updateTableBody() {
        $('#calendar-table-body').html(this._generateTableBody());
    }

    reload() {
        this.loadInternalStore();
        this.loadInternalWaiveStore();
        this.redraw();
    }

    redraw() {
        this._draw();
    }

    /**
    * Every day change, if the calendar is showing the same month as that of the previous day,
    * this function is called to redraw the calendar.
    * @param {int} oldDayDate not used in MonthCalendar, just DayCalendar
    * @param {int} oldMonthDate
    * @param {int} oldYearDate
    */
    refreshOnDayChange(oldDayDate, oldMonthDate, oldYearDate) {
        if (this._getCalendarMonth() === oldMonthDate && this._getCalendarYear() === oldYearDate) {
            this._goToCurrentDate();
        }
    }

    /*
     * Display next month.
     */
    _nextMonth() {
        // Set day as 1 to avoid problem when the current day on the _calendar_date
        // is not a day in the next month day's range
        this._calendarDate.setDate(1);
        this._calendarDate.setMonth(this._getCalendarMonth() + 1);
        this.redraw();
    }

    /*
     * Display previous month.
     */
    _prevMonth() {
        // Set day as 1 to avoid problem when the current day on the _calendar_date
        // is not a day in the prev month day's range
        this._calendarDate.setDate(1);
        this._calendarDate.setMonth(this._getCalendarMonth() - 1);
        this.redraw();
    }

    /*
     * Go to current month.
     */
    _goToCurrentDate() {
        this._calendarDate = new Date();
        this.redraw();
    }

    /*
     * Gets today's year
     */
    _getTodayYear() {
        return (new Date()).getFullYear();
    }

    /*
     * Gets today's month.
     */
    _getTodayMonth() {
        return (new Date()).getMonth();
    }

    /*
     * Gets today's date.
     */
    _getTodayDate() {
        return (new Date()).getDate();
    }

    /*
     * Gets year of displayed calendar.
     */
    _getCalendarYear() {
        return this._calendarDate.getFullYear();
    }

    /*
     * Gets month of displayed calendar.
     */
    _getCalendarMonth() {
        return this._calendarDate.getMonth();
    }

    /*
     * Gets day of displayed calendar. (Used only in DayCalendar)
     */
    _getCalendarDate() {
        return this._calendarDate.getDate();
    }

    /*
     * Gets the total for a specific day by looking into both stores.
     */
    _getDayTotal(day, month, year) {
        let storeTotal = this._getStore(day, month, year, 'day-total');
        if (storeTotal !== undefined) {
            return storeTotal;
        }
        let waiverTotal = this._getWaiverStore(day, month, year);
        if (waiverTotal !== undefined) {
            return waiverTotal['hours'];
        }
        return undefined;
    }

    /*
    * Returns how many "hours per day" were set in preferences.
    */
    _getHoursPerDay() {
        return this._preferences['hours-per-day'];
    }

    /*
    * Returns if "hide non-working days" was set in preferences.
    */
    _getHideNonWorkingDays() {
        return this._preferences['hide-non-working-days'];
    }

    /*
    * Returns if "count today" was set in preferences.
    */
    _getCountToday() {
        return this._preferences['count-today'];
    }

    /**
    * Updates calendar settings from a given preferences file.
    * @param {Object.<string, any>} preferences
    */
    updatePreferences(preferences) {
        this._preferences = preferences;
    }

    /**
    * Stores year data in memory to make operations faster
    */
    loadInternalStore() {
        this._internalStore = {};

        for (const entry of store) {
            const key = entry[0];
            const value = entry[1];

            this._internalStore[key] = value;
        }
    }

    /**
    * Stores waiver data in memory to make operations faster
    */
    loadInternalWaiveStore() {
        this._internalWaiverStore = {};

        for (const entry of waivedWorkdays) {
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
    * Calls showDay from user-preferences.js passing the last preferences set.
    */
    _showDay(year, month, day) {
        return showDay(year, month, day, this._preferences);
    }

    /*
    * Adds the next missing entry on the actual day and updates calendar.
    */
    punchDate() {
        var now = new Date(),
            year = now.getFullYear(),
            month = now.getMonth(),
            day = now.getDate(),
            hour = now.getHours(),
            min = now.getMinutes();

        if (this._getCalendarMonth() !== month ||
            this._getCalendarYear() !== year ||
            !this._showDay(year, month, day)) {
            return;
        }

        var dayStr = year + '-' + month + '-' + day + '-';
        var entry = '';
        if ($('#' + dayStr + 'day-end').val() === '') {
            entry = 'day-end';
        }
        if ($('#' + dayStr + 'lunch-end').val() === '') {
            entry = 'lunch-end';
        }
        if ($('#' + dayStr + 'lunch-begin').val() === '') {
            entry = 'lunch-begin';
        }
        if ($('#' + dayStr + 'day-begin').val() === '') {
            entry = 'day-begin';
        }
        if (entry.length <= 0) {
            return;
        }
        var value = hourMinToHourFormatted(hour, min);
        $('#' + dayStr + entry).val(value);
        this._updateTimeDayCallback(dayStr + entry, value);
    }

    /*
    * Updates the monthly time balance.
    */
    _updateBalance() {
        var now = new Date(),
            monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth()),
            workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        var countDays = false;
        var isNextDay = false;

        for (var day = 1; day <= monthLength; ++day) {
            var isToday = (now.getDate() === day && now.getMonth() === this._getCalendarMonth() && now.getFullYear() === this._getCalendarYear());
            if (isToday && !this._getCountToday()) {
                //balance considers only up until yesterday
                break;
            }
            else if (isNextDay && this._getCountToday()) {
                break;
            }
            isNextDay = isToday;

            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day)) {
                continue;
            }

            var dayStr = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day + '-' + 'day-total';
            var dayTotal = $('#' + dayStr).val();
            if (dayTotal) {
                countDays = true;
                monthTotalWorked = sumTime(monthTotalWorked, dayTotal);
            }
            if (countDays) {
                workingDaysToCompute += 1;
            }
        }
        var monthTotalToWork = multiplyTime(this._getHoursPerDay(), workingDaysToCompute * -1);
        var balance = sumTime(monthTotalToWork, monthTotalWorked);
        var balanceElement = $('#month-balance');
        if (balanceElement)
        {
            balanceElement.val(balance);
            balanceElement.removeClass('text-success text-danger');
            balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
        }
        this._updateAllTimeBalance();
    }

    /*
     * Updates data displayed based on the database.
     */
    _updateBasedOnDB() {
        var monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        var monthTotal = '00:00';
        let workingDays = 0;
        var stopCountingMonthStats = false;
        for (var day = 1; day <= monthLength; ++day) {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day)) {
                continue;
            }

            var dayTotal = null;
            var dayStr = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day + '-';

            var waivedInfo = this._getWaiverStore(day, this._getCalendarMonth(), this._getCalendarYear());
            if (waivedInfo !== undefined) {
                var waivedDayTotal = waivedInfo['hours'];
                $('#' + dayStr + 'day-total').val(waivedDayTotal);
                dayTotal = waivedDayTotal;
            } else {
                var lunchBegin = this._setTableData(day, this._getCalendarMonth(), 'lunch-begin');
                var lunchEnd = this._setTableData(day, this._getCalendarMonth(), 'lunch-end');
                this._setTableData(day, this._getCalendarMonth(), 'lunch-total');
                var dayBegin = this._setTableData(day, this._getCalendarMonth(), 'day-begin');
                var dayEnd = this._setTableData(day, this._getCalendarMonth(), 'day-end');
                dayTotal = this._setTableData(day, this._getCalendarMonth(), 'day-total');

                this._colorErrorLine(this._getCalendarYear(), this._getCalendarMonth(), day, dayBegin, lunchBegin, lunchEnd, dayEnd);
            }

            stopCountingMonthStats |= (this._getTodayDate() === day && this._getTodayMonth() === this._getCalendarMonth() && this._getTodayYear() === this._getCalendarYear());
            if (stopCountingMonthStats) {
                continue;
            }

            if (dayTotal) {
                monthTotal = sumTime(monthTotal, dayTotal);
            }

            workingDays += 1;
        }
        var monthDayInput = $('#month-day-input');
        if (monthDayInput)
        {
            monthDayInput.val(this._getBalanceRowPosition());
        }
        var monthWorkingDays = $('#month-working-days');
        if (monthWorkingDays)
        {
            monthWorkingDays.val(workingDays);
        }
        this._updateBalance();

        this._updateLeaveBy();
    }

    /*
     * Update contents of the "time to leave" bar.
     */
    _updateLeaveBy() {
        if (!this._showDay(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate()) ||
            this._getTodayMonth() !== this._getCalendarMonth() ||
            this._getTodayYear() !== this._getCalendarYear() ||
            this._getWaiverStore(this._getTodayDate(), this._getCalendarMonth(), this._getCalendarYear())) {
            return;
        }
        var [dayBegin, lunchBegin, lunchEnd, dayEnd] = this._getDaysEntries(this._getTodayMonth(), this._getTodayDate());
        var dayKey = this._getTodayYear() + '-' + this._getTodayMonth() + '-' + this._getTodayDate() + '-';
        if (validateTime(dayBegin)) {
            var leaveBy = sumTime(dayBegin, this._getHoursPerDay());
            var lunchTotal = $('#' + dayKey + 'lunch-total').val();
            if (lunchTotal) {
                leaveBy = sumTime(leaveBy, lunchTotal);
            }
            $('#leave-by').val(leaveBy <= '23:59' ? leaveBy : '--:--');
        } else {
            $('#leave-by').val('');
        }

        if (dayBegin !== undefined && lunchBegin !== undefined && lunchEnd !== undefined && dayEnd !== undefined) {
            //All entries computed
            this._togglePunchButton(false);

            var dayTotal = $('#' + dayKey + 'day-total').val();
            if (dayTotal) {
                var dayBalance = subtractTime(this._getHoursPerDay(), dayTotal);
                var leaveDayBalanceElement = $('#leave-day-balance');
                leaveDayBalanceElement.val(dayBalance);
                leaveDayBalanceElement.removeClass('text-success text-danger');
                leaveDayBalanceElement.addClass(isNegative(dayBalance) ? 'text-danger' : 'text-success');
                $('#summary-unfinished-day').addClass('hidden');
                $('#summary-finished-day').removeClass('hidden');
            } else {
                $('#summary-unfinished-day').removeClass('hidden');
                $('#summary-finished-day').addClass('hidden');
            }
        } else {
            this._togglePunchButton(true);

            $('#summary-unfinished-day').removeClass('hidden');
            $('#summary-finished-day').addClass('hidden');
        }
    }

    /*
     * Based on the key of the input, updates the values for total in DB and display it on page.
     */
    _updateTimeDayCallback(key, value) {
        var [year, month, day, stage, step] = key.split('-');
        var fieldKey = stage + '-' + step;
        this._updateTimeDay(year, month, day, fieldKey, value);
        this._updateLeaveBy();
        this._updateBalance();
    }


    _updateDbEntry(year, month, day, key, newValue) {
        if (validateTime(newValue)) {
            this._setStore(day, month, year, key, newValue);
        } else {
            this._removeStore(day, month, year, key);
        }
    }

    _computeLunchTime(lunchBegin, lunchEnd) {
        var lunchTime = '';
        if (lunchBegin && lunchEnd &&
            validateTime(lunchBegin) && validateTime(lunchEnd) &&
            (lunchEnd > lunchBegin)) {
            lunchTime = subtractTime(lunchBegin, lunchEnd);
        }
        return lunchTime;
    }

    _computeDayTotal(dayBegin, dayEnd, lunchBegin, lunchEnd, lunchTime) {
        var dayTotal = '';
        if (dayBegin && dayEnd &&
            validateTime(dayBegin) && validateTime(dayEnd) &&
            (dayEnd > dayBegin)) {
            dayTotal = subtractTime(dayBegin, dayEnd);
            if (lunchTime.length > 0 &&
                validateTime(lunchTime) &&
                (lunchBegin > dayBegin) &&
                (dayEnd > lunchEnd)) {
                dayTotal = subtractTime(lunchTime, dayTotal);
            }
        }
        return dayTotal;
    }

    /*
    * Updates the DB with the information of computed total lunch time and day time.
    */
    _updateTimeDay(year, month, day, key, newValue) {
        var baseStr = year + '-' + month + '-' + day + '-';

        this._updateDbEntry(year, month, day, key, newValue);

        var [dayBegin, lunchBegin, lunchEnd, dayEnd] = this._getDaysEntries(month, day);
        var lunchTime = this._computeLunchTime(lunchBegin, lunchEnd);
        var dayTotal = this._computeDayTotal(dayBegin, dayEnd, lunchBegin, lunchEnd, lunchTime);

        this._updateDbEntry(year, month, day, 'lunch-total', lunchTime);
        $('#' + baseStr + 'lunch-total').val(lunchTime);

        this._updateDbEntry(year, month, day, 'day-total', dayTotal);
        $('#' + baseStr + 'day-total').val(dayTotal);

        this._colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd);
    }

    /*
    * Returns the entry values for the day, from the internal store.
    */
    _getDaysEntries(month, day) {
        return [this._getStore(day, month, this._getCalendarYear(), 'day-begin'),
            this._getStore(day, month, this._getCalendarYear(), 'lunch-begin'),
            this._getStore(day, month, this._getCalendarYear(), 'lunch-end'),
            this._getStore(day, month, this._getCalendarYear(), 'day-end')];
    }

    /*
    * Analyze the inputs of a day, and return if there is an error.
    * An error means that an input earlier in the day is higher than one that is after it.
    */
    _hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd) {
        var dayValues = new Array();
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
    * Toggles the state of the punch butttons and actions on or off
    */
    _togglePunchButton(enable) {
        $('#punch-button').prop('disabled', !enable);
        ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', enable);
    }
    /*
    * Toggles the color of a row based on input error.
    */
    _colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd) {
        var trID = ('#tr-' + year + '-' + month + '-' + day);
        $(trID).toggleClass('error-tr', this._hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd));
    }

    _switchView() {
        let preferences = switchCalendarView();
        ipcRenderer.send('VIEW_CHANGED', preferences);
    }
}

class DayCalendar extends Calendar {
    /**
    * @param {Object.<string, any>} preferences
    */
    constructor(preferences) {
        super(preferences);
    }

    /*
    * Display calendar defined.
    */
    _initCalendar() {
        this._generateTemplate();

        $('#next-day').click(() => { this._nextDay(); });
        $('#prev-day').click(() => { this._prevDay(); });
        $('#switch-view').click(() => { this._switchView(); });
        $('#current-day').click(() => { this._goToCurrentDate(); });
        $('#input-calendar-date').change((event) => {
            let [year, month, day] = $(event.target).val().split('-');
            this._goToDate(new Date(year, month-1, day));
        });

        this._draw();
    }

    /*
     * Generates the calendar HTML view.
     */
    _generateTemplate() {
        var body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'day');
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    static _getPageHeader() {
        let switchView = '<input id="switch-view" type="image" src="assets/switch.svg" alt="Switch View" title="Switch View" height="24" width="24"></input>';
        let todayBut = '<input id="current-day" type="image" src="assets/calendar.svg" alt="Current Day" title="Go to Current Day" height="24" width="24"></input>';
        let leftBut = '<input id="prev-day" type="image" src="assets/left-arrow.svg" alt="Previous Day" height="24" width="24"></input>';
        let rightBut = '<input id="next-day" type="image" src="assets/right-arrow.svg" alt="Next Day" height="24" width="24"></input>';
        return '<div class="title-header">'+
                    '<div class="title-header-img"><img src="assets/timer.svg" height="64" width="64"></div>' +
                    '<div class="title-header-text">Time to Leave</div>' +
                    '<div class="title-header-msg"></div>' +
               '</div>' +
                '<table class="table-header"><tr>' +
                    '<th class="th but-switch-view" colspan="2">' + switchView + '</th>' +
                    '<th class="th but-left">' + leftBut + '</th>' +
                    '<th class="th th-month-name" colspan="18"><div class="div-th-month-name"><span id="header-date"></span></span><input type="date" id="input-calendar-date" required></div></th>' +
                    '<th class="th but-right">' + rightBut + '</th>' +
                    '<th class="th but-today" colspan="2">' + todayBut + '</th>' +
                '</tr></table>';
    }

    /*
     * Returns the template code of the body of the page.
     */
    _getBody() {
        var html = '<div>';
        html += this.constructor._getPageHeader();
        html += '<div id="calendar-table-body">';
        html += '</div>';

        return html;
    }

    /*
     * Returns the summary field HTML code.
     */
    static _getSummaryRowCode() {
        let leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        let summaryStr = 'You should leave by:';
        let code = '<div class="summary" id="summary-unfinished-day">' +
                     '<div class="leave-by-text">' + summaryStr + '</div>' +
                     '<div class="leave-by-time">' + leaveByCode + '</div>' +
                   '</div>';
        let finishedSummaryStr = 'All done for today. Balance of the day:';
        let dayBalance = '<input type="text" id="leave-day-balance" size="5" disabled>';
        code += '<div class="summary hidden" id="summary-finished-day">' +
                    '<div class="leave-by-text">' + finishedSummaryStr + '</div>' +
                    '<div class="leave-by-time">' + dayBalance + '</div>' +
                '</div>';
        return code;
    }

    /*
     * Returns the HTML code for the row with working days, month total and balance.
     */
    static _getBalanceRowCode() {
        return '<div class="month-total-row">' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        '<div class="month-total-text month-balance" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month).">Month Balance</div>' +
                        '<div class="month-total-time month-balance-time" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month)."><span type="text" id="month-balance"></div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        '<div class="month-total-text month-sum" title="Overall balance until end of the month or current day">Overall Balance</div>' +
                        '<div class="month-total-time month-sum-time" title="Overall balance until end of the month or current day"><span id="overall-balance"></div>' +
                    '</div>' +
                    '</div>' +
                '</div>';
    }

    /*
     * Returns the code of the table body of the calendar.
     */
    _generateTableBody() {
        return this._getInputsRowCode(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate()) + this.constructor._getBalanceRowCode();
    }

    _getInputsRowCode(year, month, day) {
        let today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            trID = ('tr-' + year + '-' + month + '-' + day);

        if (!this._showDay(year, month, day)) {
            return '<div class="today-non-working" id="' + trID + '">' +
                        '<div class="non-working-day">Not a working day</div>' +
                    '</div>\n';
        }

        let waivedInfo = this._getWaiverStore(day, month, year);
        if (waivedInfo !== undefined) {
            let summaryStr = '<b>Waived day: </b>' + waivedInfo['reason'];
            let waivedLineHtmlCode =
                 '<div class="row-waiver" id="' + trID + '">' +
                    '<div class="waived-day-text" colspan="5">' + summaryStr + '</div>' +
                    '<div class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'day-total') + '</div>' +
                '</div>\n';
            return waivedLineHtmlCode;
        }

        let htmlCode =
                '<div class="row-time">' +
                    '<div class="th th-label" colspan="4">Day Start</div>' +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'day-begin') + '</div>' +
                '</div>' +
                '<div class="row-time">' +
                    '<div class="th th-label" colspan="4">Lunch Begin</div>' +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'lunch-begin') + '</div>' +
                '</div>' +
                '<div class="row-time">' +
                    '<div class="th th-label" colspan="4">Lunch End</div>' +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'lunch-end') + '</div>' +
                '</div>' +
                '<div class="row-time">' +
                    '<div class="th th-label" colspan="4">Day End</div>' +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'day-end') + '</div>' +
                '</div>' +
                '<div class="row-total">' +
                    '<div class="th th-label th-label-total" colspan="3">Lunch Total</div>' +
                    '<div class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'lunch-total') + '</div>' +
                    '<div class="th th-label th-label-total" colspan="3">Day Total</div>' +
                    '<div class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'day-total') + '</div>' +
                '</div>\n';

        if (isToday) {
            htmlCode += this.constructor._getSummaryRowCode();
        }

        return htmlCode;
    }

    /*
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    _updateTableHeader() {
        let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let today = this._calendarDate;
        $('#header-date').html(today.toLocaleDateString(undefined, options));
        $('#input-calendar-date').val(getDateStr(today));
    }

    /*
     * Display next day.
     */
    _nextDay() {
        this._changeDay(1);
    }

    /*
     * Display previous day.
     */
    _prevDay() {
        this._changeDay(-1);
    }

    /*
     * Go to current day.
     */
    _goToCurrentDate() {
        this._goToDate(new Date());
    }

    /**
    * Returns if Calendar date agrees with parameter date.
    */
    _isCalendarOnDate(date) {
        return date.getDate() === this._getCalendarDate() && date.getMonth() === this._getCalendarMonth() && date.getFullYear() === this._getCalendarYear();
    }

    /**
    * Go to date.
    * @param {Date} date
    */
    _goToDate(date) {
        this._calendarDate = date;
        this.redraw();
    }

    /**
     * Change the calendar view by a number of days.
     * @param int numDays number of days to be changed (positive/negative)
     */
    _changeDay(numDays) {
        this._calendarDate.setDate(this._calendarDate.getDate() + numDays);
        this.redraw();
    }

    /*
     * Draws elements of the Calendar that depend on data.
     */
    _draw() {
        super._draw();

        if (!this._isCalendarOnDate(new Date())) {
            $('#punch-button').prop('disabled', true);
            ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', false);
        }
    }

    /**
    * Every day change, if the calendar is showing the same date as that of the previous date,
    * this function is called to redraw the calendar.
    * @param {int} oldDayDate
    * @param {int} oldMonthDate
    * @param {int} oldYearDate
    */
    refreshOnDayChange(oldDayDate, oldMonthDate, oldYearDate) {
        let date = new Date(oldYearDate, oldMonthDate, oldDayDate);
        if (this._isCalendarOnDate(date)) {
            this._goToCurrentDate();
        }
    }

    /*
    * Updates the monthly time balance.
    */
    _updateBalance() {
        let yesterday = new Date(this._calendarDate);
        yesterday.setDate(this._calendarDate.getDate() - 1);
        let workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        let countDays = false;

        let limit = this._getCountToday() ? this._getCalendarDate() : (yesterday.getMonth() !== this._getCalendarMonth() ? 0 : yesterday.getDate());
        for (let day = 1; day <= limit; ++day) {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day)) {
                continue;
            }

            let dayTotal = this._getDayTotal(day, this._getCalendarMonth(), this._getCalendarYear());
            if (dayTotal !== undefined) {
                countDays = true;
                monthTotalWorked = sumTime(monthTotalWorked, dayTotal);
            }
            if (countDays) {
                workingDaysToCompute += 1;
            }
        }
        let monthTotalToWork = multiplyTime(this._getHoursPerDay(), workingDaysToCompute * -1);
        let balance = sumTime(monthTotalToWork, monthTotalWorked);
        let balanceElement = $('#month-balance');
        if (balanceElement)
        {
            balanceElement.html(balance);
            balanceElement.removeClass('text-success text-danger');
            balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
        }
    }

    /*
     * Updates data displayed based on the database.
     */
    _updateBasedOnDB() {
        let monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let workingDays = 0;
        let stopCountingMonthStats = false;
        for (let day = 1; day <= monthLength; ++day) {

            if (stopCountingMonthStats) {
                break;
            }

            stopCountingMonthStats |= (this._getCalendarDate() === day);

            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day)) {
                continue;
            }

            let dayStr = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day + '-';

            if (day === this._getCalendarDate()) {
                let waivedInfo = this._getWaiverStore(day, this._getCalendarMonth(), this._getCalendarYear());
                if (waivedInfo !== undefined) {
                    let waivedDayTotal = waivedInfo['hours'];
                    $('#' + dayStr + 'day-total').val(waivedDayTotal);
                } else {
                    let lunchBegin = this._setTableData(day, this._getCalendarMonth(), 'lunch-begin');
                    let lunchEnd = this._setTableData(day, this._getCalendarMonth(), 'lunch-end');
                    this._setTableData(day, this._getCalendarMonth(), 'lunch-total');
                    let dayBegin = this._setTableData(day, this._getCalendarMonth(), 'day-begin');
                    let dayEnd = this._setTableData(day, this._getCalendarMonth(), 'day-end');
                    this._setTableData(day, this._getCalendarMonth(), 'day-total');

                    this._colorErrorLine(this._getCalendarYear(), this._getCalendarMonth(), day, dayBegin, lunchBegin, lunchEnd, dayEnd);
                }
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
}

module.exports = {
    CalendarFactory,
    Calendar,
    DayCalendar
};
