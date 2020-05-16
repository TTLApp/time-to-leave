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
const { showDay } = require('../user-preferences.js');
const { getDateStr, getMonthLength } = require('../date-aux.js');
const {
    formatDayId,
    sendWaiverDay,
    displayWaiverWindow
} = require('../workday-waiver-aux.js');

// Global values for calendar
const store = new Store();
const waivedWorkdays = new Store({name: 'waived-workdays'});

// Holds the calendar information and manipulation functions
class Calendar {
    /**
    * @param {Object.<string, any>} preferences
    */
    constructor(preferences) {
        this.options = {
            dayAbbrs : [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],
            months : [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ]
        };
        this.today = new Date();
        this.month = this.today.getMonth();
        this.year = this.today.getFullYear();
        this.workingDays = 0;
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

        $('#punch-button').click(() => { this.punchDate(); });
        $('#next-month').click(() => { this.nextMonth(); });
        $('#prev-month').click(() => { this.prevMonth(); });
        $('#current-month').click(() => { this.goToCurrentDate(); });

        this._draw();
    }

    /*
     * Draws elements of the Calendar that depend on data.
     */
    _draw() {
        this.updateTableHeader();
        this.updateTableBody();
        this.updateBasedOnDB();

        if (!this.showDay(this.today.getFullYear(), this.today.getMonth(), this.today.getDate())) {
            $('#punch-button').prop('disabled', true);
            ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', false);
        } else {
            $('#punch-button').prop('disabled', false);
            ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', true);
        }

        this.updateLeaveBy();

        var calendar = this;
        $('input[type=\'time\']').off('input propertychange').on('input propertychange', function() {
            calendar.updateTimeDayCallback(this.id, this.value);
        });

        $('.waiver-trigger').off('click').on('click', function() {
            const dayId = $(this).closest('tr').attr('id').substr(3);
            const waiverDay = formatDayId(dayId);
            sendWaiverDay(waiverDay);
            displayWaiverWindow();
        });
    }

    /*
     * Updates data displayed based on the database.
     */
    _setTableData(day, month, key) {
        var idTag = this.year + '-' + month + '-' + day + '-' + key;

        var value = this._getStore(day, month, this.year, key);
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

        return this.internalStore[idTag];
    }

    /*
     * Saves value on store and updates internal store.
     */
    _setStore(day, month, year, key, newValue) {
        var idTag = year + '-' + month + '-' + day + '-' + key;

        this.internalStore[idTag] = newValue;
        store.set(idTag, newValue);
    }

    /*
     * Removes value from store and from internal store.
     */
    _removeStore(day, month, year, key) {
        var idTag = year + '-' + month + '-' + day + '-' + key;

        this.internalStore[idTag] = undefined;
        store.delete(idTag);
    }

    /*
     * Gets value from internal waiver store.
     */
    _getWaiverStore(day, month, year) {
        let dayKey = getDateStr(new Date(year, month, day));

        return this.internalWaiverStore[dayKey];
    }

    /*
     * Generates the calendar HTML view.
     */
    _generateTemplate() {
        var body = this._getBody();
        $('#calendar').html(body);
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
                    '<td class="month-total-text" title="How many hours you logged in this month">Month Sum</td>' +
                    '<td class="month-total-time" title="How many hours you logged in this month"><input type="text"  id="month-total" size="8" disabled></td>' +
                    '<td class="month-total-text" title="Balance up until today for this month. A positive balance means extra    hours you don\'t need to work today (or the rest of the month).">Month Balance</td>' +
                    '<td class="month-total-time" title="Balance up until today for this month. A positive balance means extra    hours you don\'t need to work today (or the rest of the month)."><input type="text" id="month-balance"     size="8" disabled></td>' +
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

        if (!this.showDay(year, month, day)) {
            if (!this.hideNonWorkingDays) {
                return '<tr'+ (isToday ? ' class="today-non-working"' : '') + ' id="' + trID + '">' +
                        '<td class="weekday ti">' + this.options.dayAbbrs[weekDay] + '</td>' +
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
                    '<td class="weekday ti">' + this.options.dayAbbrs[weekDay] + '</td>' +
                    '<td class="day ti">' + day + '</td>' +
                    '<td class="waived-day-text" colspan="5">' + summaryStr + '</td>' +
                    '<td class="ti ti-total">' + Calendar._getTotalCode(year, month, day, 'day-total') + '</td>' +
                '</tr>\n';
            return waivedLineHtmlCode;
        }

        var htmlCode =
                 '<tr'+ (isToday ? ' class="isToday"' : '') + ' id="' + trID + '">' +
                    '<td class="weekday waiver-trigger ti" title="Add a waiver for this day">' + this.options.dayAbbrs[weekDay] + '</td>' +
                    '<td class="day ti">' +
                        '<span class="day-number"> ' + day + ' </span>' +
                        '<img src="assets/waiver.svg" height="15" class="waiver-img">' +
                    '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'day-begin') + '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'lunch-begin') + '</td>' +
                    '<td class="ti ti-total">' + Calendar._getTotalCode(year, month, day, 'lunch-total') + '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'lunch-end') + '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'day-end') + '</td>' +
                    '<td class="ti ti-total">' + Calendar._getTotalCode(year, month, day, 'day-total') + '</td>' +
                '</tr>\n';

        if (isToday) {
            htmlCode += Calendar._getSummaryRowCode();
        }

        return htmlCode;
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    _getPageHeader() {
        var todayBut = '<input id="current-month" type="image" src="assets/calendar.svg" alt="Current Month" title="Go to Current Month" height="24" width="24"></input>';
        var leftBut = '<input id="prev-month" type="image" src="assets/left-arrow.svg" alt="Previous Month" height="24" width="24"></input>';
        var rightBut = '<input id="next-month" type="image" src="assets/right-arrow.svg" alt="Next Month" height="24" width="24"></input>';
        return '<div class="title-header">'+
                    '<div class="title-header title-header-img"><img src="assets/timer.svg" height="64" width="64"></div>' +
                    '<div class="title-header title-header-text">Time to Leave</div>' +
                    '<div class="title-header title-header-msg"></div>' +
               '</div>' +
                '<table class="table-header"><tr>' +
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
        if (this.year !== this.today.getFullYear() || this.month !== this.today.getMonth()) {
            return getMonthLength(this.year, this.month);
        }

        var balanceRowPosition = 0;
        for (var day = 1; day < this.today.getDate(); ++day) {
            if (this.showDay(this.year, this.month, day)) {
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
        html += this._getPageHeader(this.year, this.month);
        html += '<table class="table-body">';
        html += Calendar._getTableHeaderCode();
        html += '<tbody id="calendar-table-body">';
        html += '</tbody>';
        html += '</table><br>';
        html += '</div>';

        return html;
    }

    /*
     * Returns the code of the table body of the calendar.
     */
    generateTableBody() {
        var html;
        var monthLength = getMonthLength(this.year, this.month);
        var balanceRowPosition = this._getBalanceRowPosition();

        for (var day = 1; day <= monthLength; ++day) {
            html += this._getInputsRowCode(this.year, this.month, day);
            if (day === balanceRowPosition) {
                html += Calendar._getBalanceRowCode();
            }
        }
        return html;
    }

    /*
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    updateTableHeader() {
        $('#month-year').html(this.options.months[this.month] + ' ' + this.year);
    }

    /*
     * Updates the code of the table body of the calendar, to be called on demand.
     */
    updateTableBody() {
        $('#calendar-table-body').html(this.generateTableBody());
    }

    reload() {
        this.loadInternalStore();
        this.loadInternalWaiveStore();
        this.redraw();
    }

    redraw() {
        this._draw();
    }

    /*
     * Display next month.
     */
    nextMonth() {
        if (this.month === 11) {
            this.month = 0;
            this.year += 1;
        } else {
            this.month += 1;
        }
        this.redraw();
    }

    /*
     * Display previous month.
     */
    prevMonth() {
        if (this.month === 0) {
            this.month = 11;
            this.year -= 1;
        } else {
            this.month -= 1;
        }
        this.redraw();
    }

    /*
     * Go to current month.
     */
    goToCurrentDate() {
        this.month = this.today.getMonth();
        this.year = this.today.getFullYear();
        this.redraw();
    }

    /*
     * Gets year of displayed calendar.
     */
    getYear() {
        return this.year;
    }

    /*
     * Gets month of displayed calendar.
     */
    getMonth() {
        return this.month;
    }

    /*
    * Returns how many "hours per day" were set in preferences.
    */
    getHoursPerDay() {
        return this.hoursPerDay;
    }

    /**
    * Updates calendar settings from a given preferences file.
    * @param {Object.<string, any>} preferences
    */
    updatePreferences(preferences) {
        this.preferences = preferences;
        this.countToday = preferences['count-today'];
        this.hideNonWorkingDays = preferences['hide-non-working-days'];
        this.hoursPerDay = preferences['hours-per-day'];
    }

    /**
    * Stores year data in memory to make operations faster
    */
    loadInternalStore() {
        this.internalStore = {};

        for (const entry of store) {
            const key = entry[0];
            const value = entry[1];

            this.internalStore[key] = value;
        }
    }

    /**
    * Stores waiver data in memory to make operations faster
    */
    loadInternalWaiveStore() {
        this.internalWaiverStore = {};

        for (const entry of waivedWorkdays) {
            const date = entry[0];
            const reason = entry[1]['reason'];
            const hours = entry[1]['hours'];

            this.internalWaiverStore[date] = {
                'hours': hours,
                'reason': reason
            };
        }
    }

    /*
    * Calls showDay from user-preferences.js passing the last preferences set.
    */
    showDay(year, month, day) {
        return showDay(year, month, day, this.preferences);
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

        if (this.getMonth() !== month ||
            this.getYear() !== year ||
            !this.showDay(year, month, day)) {
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
        this.updateTimeDayCallback(dayStr + entry, value);
    }

    /*
    * Updates the monthly time balance.
    */
    updateBalance() {
        var now = new Date(),
            monthLength = getMonthLength(this.year, this.month),
            workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        var countDays = false;

        for (var day = 1; day <= monthLength; ++day) {
            if (!this.showDay(this.year, this.month, day)) {
                continue;
            }
            var isToday = (now.getDate() === day && now.getMonth() === this.month && now.getFullYear() === this.year);
            if (isToday && !!this.countToday) {
                //balance considers only up until yesterday
                break;
            }

            var dayStr = this.year + '-' + this.month + '-' + day + '-' + 'day-total';
            var dayTotal = $('#' + dayStr).val();
            if (dayTotal) {
                countDays = true;
                monthTotalWorked = sumTime(monthTotalWorked, dayTotal);
            }
            if (countDays) {
                workingDaysToCompute += 1;
            }
        }
        var monthTotalToWork = multiplyTime(this.getHoursPerDay(), workingDaysToCompute * -1);
        var balance = sumTime(monthTotalToWork, monthTotalWorked);
        var balanceElement = $('#month-balance');
        if (balanceElement)
        {
            balanceElement.val(balance);
            balanceElement.removeClass('text-success text-danger');
            balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
        }
    }

    /*
     * Updates data displayed based on the database.
     */
    updateBasedOnDB() {
        var monthLength = getMonthLength(this.year, this.month);
        var monthTotal = '00:00';
        this.workingDays = 0;
        var stopCountingMonthStats = false;
        for (var day = 1; day <= monthLength; ++day) {
            if (!this.showDay(this.year, this.month, day)) {
                continue;
            }

            var dayTotal = null;
            var dayStr = this.year + '-' + this.month + '-' + day + '-';

            var waivedInfo = this._getWaiverStore(day, this.month, this.year);
            if (waivedInfo !== undefined) {
                var waivedDayTotal = waivedInfo['hours'];
                $('#' + dayStr + 'day-total').val(waivedDayTotal);
                dayTotal = waivedDayTotal;
            } else {
                var lunchBegin = this._setTableData(day, this.month, 'lunch-begin');
                var lunchEnd = this._setTableData(day, this.month, 'lunch-end');
                this._setTableData(day, this.month, 'lunch-total');
                var dayBegin = this._setTableData(day, this.month, 'day-begin');
                var dayEnd = this._setTableData(day, this.month, 'day-end');
                dayTotal = this._setTableData(day, this.month, 'day-total');

                this.colorErrorLine(this.year, this.month, day, dayBegin, lunchBegin, lunchEnd, dayEnd);
            }

            stopCountingMonthStats |= (this.today.getDate() === day && this.today.getMonth() === this.month && this.today.getFullYear() === this.year);
            if (stopCountingMonthStats) {
                continue;
            }

            if (dayTotal) {
                monthTotal = sumTime(monthTotal, dayTotal);
            }

            this.workingDays += 1;
        }
        var monthDayInput = $('#month-day-input');
        if (monthDayInput)
        {
            monthDayInput.val(this._getBalanceRowPosition());
        }
        var monthDayTotal = $('#month-total');
        if (monthDayTotal)
        {
            monthDayTotal.val(monthTotal);
        }
        var monthWorkingDays = $('#month-working-days');
        if (monthWorkingDays)
        {
            monthWorkingDays.val(this.workingDays);
        }
        this.updateBalance();

        this.updateLeaveBy();
    }

    /*
     * Update contents of the "time to leave" bar.
     */
    updateLeaveBy() {
        if (!this.showDay(this.today.getFullYear(), this.today.getMonth(), this.today.getDate()) ||
            this.today.getMonth() !== this.getMonth() ||
            this.today.getFullYear() !== this.getYear() ||
            this._getWaiverStore(this.today.getDate(), this.month, this.year)) {
            return;
        }
        var [dayBegin, lunchBegin, lunchEnd, dayEnd] = this.getDaysEntries(this.today.getMonth(), this.today.getDate());
        var dayKey = this.today.getFullYear() + '-' + this.today.getMonth() + '-' + this.today.getDate() + '-';
        if (validateTime(dayBegin)) {
            var leaveBy = sumTime(dayBegin, this.getHoursPerDay());
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
            $('#punch-button').prop('disabled', true);
            ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', false);

            var dayTotal = $('#' + dayKey + 'day-total').val();
            if (dayTotal) {
                var dayBalance = subtractTime(this.getHoursPerDay(), dayTotal);
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
            $('#punch-button').prop('disabled', false);
            ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', true);

            $('#summary-unfinished-day').removeClass('hidden');
            $('#summary-finished-day').addClass('hidden');
        }
    }

    /*
     * Based on the key of the input, updates the values for total in DB and display it on page.
     */
    updateTimeDayCallback(key, value) {
        var [year, month, day, stage, step] = key.split('-');
        var fieldKey = stage + '-' + step;
        this.updateTimeDay(year, month, day, fieldKey, value);
        this.updateLeaveBy();
        this.updateBalance();
    }

    /*
    * Updates the DB with the information of computed total lunch time and day time.
    */
    updateTimeDay(year, month, day, key, newValue) {
        var baseStr = year + '-' + month + '-' + day + '-';
        var oldValue = this._getStore(day, month, year, key);

        if (validateTime(newValue)) {
            this._setStore(day, month, year, key, newValue);
        } else if (oldValue && validateTime(oldValue)) {
            this._removeStore(day, month, year, key);
        }

        var oldDayTotal = this._getStore(day, month, year, 'day-total');

        //update totals
        var [dayBegin, lunchBegin, lunchEnd, dayEnd] = this.getDaysEntries(month, day);

        //compute lunch time
        var lunchTime = '';
        if (lunchBegin && lunchEnd &&
            validateTime(lunchBegin) && validateTime(lunchEnd) &&
            (lunchEnd > lunchBegin)) {
            lunchTime = subtractTime(lunchBegin, lunchEnd);
        }
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

        if (lunchTime.length > 0) {
            this._setStore(day, month, year, 'lunch-total', lunchTime);
        } else {
            this._removeStore(day, month, year, 'lunch-total');
        }
        $('#' + baseStr + 'lunch-total').val(lunchTime);

        if (dayTotal.length > 0) {
            this._setStore(day, month, year, 'day-total', dayTotal);
        } else {
            this._removeStore(day, month, year, 'day-total');
        }
        $('#' + baseStr + 'day-total').val(dayTotal);

        var displayedMonthTotal = $('#month-total').val();
        var currentMonthTotal = displayedMonthTotal;
        if (validateTime(oldDayTotal)) {
            currentMonthTotal = subtractTime(oldDayTotal, currentMonthTotal);
        }
        if (dayTotal.length > 0) {
            currentMonthTotal = sumTime(currentMonthTotal, dayTotal);
        }
        $('#month-total').val(currentMonthTotal);

        this.colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd);
    }

    /*
    * Returns the entry values for the day, from the internal store.
    */
    getDaysEntries(month, day) {
        return [this._getStore(day, month, this.year, 'day-begin'),
            this._getStore(day, month, this.year, 'lunch-begin'),
            this._getStore(day, month, this.year, 'lunch-end'),
            this._getStore(day, month, this.year, 'day-end')];
    }

    /*
    * Analyze the inputs of a day, and return if there is an error.
    * An error means that an input earlier in the day is higher than one that is after it.
    */
    hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd) {
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
    * Toggles the color of a row based on input error.
    */
    colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd) {
        var trID = ('#tr-' + year + '-' + month + '-' + day);
        $(trID).toggleClass('error-tr', this.hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd));
    }
}

module.exports = Calendar;
