'use strict';

const Store = require('electron-store');
const {
    hourMinToHourFormatted,
    isNegative,
    multiplyTime,
    subtractTime,
    sumTime,
    validateTime
} = require('../time-math.js');
const { getMonthLength } = require('../date-aux.js');
const {
    formatDayId,
    sendWaiverDay,
    displayWaiverWindow
} = require('../workday-waiver-aux.js');
const { showDialog } = require('../window-aux.js');
const { Calendar } = require('./Calendar.js');

// Global values for calendar
const flexibleStore = new Store({name: 'flexible-store'});

class FlexibleMonthCalendar extends Calendar {
    /**
    * @param {Object.<string, any>} preferences
    */
    constructor(preferences) {
        super(preferences);
    }

    /*
     * Generates the calendar HTML view.
     */
    _generateTemplate() {
        let body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'flexible');
    }

    /*
     * Returns the template code of the body of the page.
     */
    _getBody() {
        let html = this.constructor._getPageHeader();
        html += this.constructor._getTableHeaderCode();
        html += '<div id="calendar-table-body">';
        html += '</div>';

        return html;
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    static _getPageHeader() {
        let todayBut = '<input id="current-month" type="image" src="assets/calendar.svg" alt="Current Month" title="Go to Current Month" height="24" width="24"></input>';
        let leftBut = '<input id="prev-month" type="image" src="assets/left-arrow.svg" alt="Previous Month" height="24" width="24"></input>';
        let rightBut = '<input id="next-month" type="image" src="assets/right-arrow.svg" alt="Next Month" height="24" width="24"></input>';
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
        return '<div class="calendar-table-header">' +
                    '<div class="header-day">Day</div>' +
                    '<div class="header-day-total">Total</div>' +
                '</div>\n';
    }

    /*
     * Returns the summary field HTML code.
     */
    static _getSummaryRowCode() {
        return  '<div class="summary" id="summary-unfinished-day">' +
                    '<div class="leave-by-text" colspan="7">Based on the time you arrived today, you should leave by</div>' +
                    '<div class="leave-by-time">' +
                        '<div id="leave-by"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="summary hidden" id="summary-finished-day">' +
                    '<div class="leave-by-text" colspan="7">All done for today. Balance of the day:</div>' +
                    '<div class="leave-by-time">' +
                        '<div id="leave-day-balance"></div>' +
                    '</div>' +
                '</div>';
    }

    /*
     * Returns the HTML code for the row with working days, month total and balance.
     */
    static _getBalanceRowCode() {
        return '<div class="month-total-row">' +
                    '<div class="month-total-text" title="Last day used for balance">On</div>' +
                    '<div class="month-total-time" title="Last day used for balance"><span id="month-day-input"></span></div>' +
                    '<div class="month-total-text" title="How many working days there\'s in the month">Working days</div>' +
                    '<div class="month-total-time" title="How many working days there\'s in the month"><span id="month-working-days"></span></div>' +
                    '<div class="month-total-text" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month).">Month Balance</div>' +
                    '<div class="month-total-time" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month)."><input type="text" id="month-balance"     size="8" disabled></div>' +
                    '<div class="month-total-text" title="Overall balance until end of the month or current day">Overall Balance</div>' +
                    '<div class="month-total-time" title="Overall balance until end of the month or current day"><input type="text" id="overall-balance" size="8" placeholder="..." disabled></div>' +
                '</div>';
    }

    static _getRowCode(dateKey, isInterval = false) {
        if (isInterval) {
            return  '<div class="row-time">' +
                        '<div class="interval" colspan="4"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>' +
                    '</div>';
        }
        return  '<div class="row-time">' +
                    '<div class="ti" colspan="4"><input type="time" data-date="' + dateKey + '"></div>' +
                '</div>';
    }

    _getInputsRowCode(year, month, day) {
        let currentDay = new Date(year, month, day),
            weekDay = currentDay.getDay();
        let today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            dateKey = (year + '-' + month + '-' + day);

        if (!this._showDay(year, month, day)) {
            return '<div><div class="weekday">' + this._options.dayAbbrs[weekDay] + '</div>' +
                    '<div class="day">' +
                        '<span class="day-number"> ' + day + ' </span>' +
                    '</div>' +
                    '<div class="non-working-day" id="' + dateKey + '">' +
                    '</div></div>\n';
        }

        let waivedInfo = this._getWaiverStore(day, month, year);
        if (waivedInfo !== undefined) {
            let summaryStr = '<b>Waived day: </b>' + waivedInfo['reason'];
            let waivedLineHtmlCode =
                '<div class="row-waiver" id="' + dateKey + '">' +
                    '<div class="weekday">' + this._options.dayAbbrs[weekDay] + '</div>' +
                    '<div class="day">' +
                        '<span class="day-number"> ' + day + ' </span>' +
                    '</div>' +
                    '<div class="waived-day-text" colspan="5">' + summaryStr + '</div>' +
                    '<div class="day-total-cell">' +
                        '<div class="day-total"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>' +
                    '</div>' +
                '</div>\n';
            return waivedLineHtmlCode;
        }

        let htmlCode =
                '<div>' +
                '<div class="weekday waiver-trigger" title="Add a waiver for this day">' + this._options.dayAbbrs[weekDay] + '</div>' +
                '<div class="day">' +
                    '<span class="day-number"> ' + day + ' </span>' +
                    '<img src="assets/waiver.svg" height="15" class="waiver-img">' +
                '</div>' +
                '<div class="sign-cell minus-sign">' +
                    '<span>-</span>' +
                '</div>' +
                '<i class="arrow left"></i>' +
                '<div class="time-cells" id="' + dateKey + '">' +
                '</div>' +
                '<i class="arrow right"></i>' +
                '<div class="sign-cell plus-sign">' +
                    '<span>+</span>' +
                '</div>' +
                '<div class="day-total-cell">' +
                    '<div class="day-total"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>' +
                '</div>' +
                '</div>\n';

        if (isToday) {
            htmlCode += this.constructor._getSummaryRowCode();
        }

        return htmlCode;
    }

    /*
     * Draws elements of the Calendar that depend on data.
     */
    _draw() {
        this._updateTableHeader();
        this._updateTableBody();
        this._updateBasedOnDB();

        let waivedInfo = this._getWaiverStore(this._getTodayDate(), this._getTodayMonth(), this._getTodayYear());
        let showCurrentDay = this._showDay(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        this._togglePunchButton(showCurrentDay && waivedInfo === undefined);

        this._updateLeaveBy();

        let calendar = this;
        $('input[type=\'time\']').off('input propertychange').on('input propertychange', function() {
            calendar._updateTimeDayCallback($(this).attr('data-date'));
        });

        $('.waiver-trigger').off('click').on('click', function() {
            const dayId = $(this).closest('tr').attr('id').substr(3);
            const waiverDay = formatDayId(dayId);
            sendWaiverDay(waiverDay);
            displayWaiverWindow();
        });

        this._updateAllTimeBalance();

        let slideTimer;
        function sideScroll(element, direction, speed, step) {
            slideTimer = setInterval(function() {
                if (direction === 'left') {
                    element.scrollLeft -= step;
                } else {
                    element.scrollLeft += step;
                }
                if (element.scrollLeft + element.clientWidth === element.scrollWidth) {
                    window.clearInterval(slideTimer);
                }
            }, speed);
        }

        $('.arrow.left').off('mousedown').on('mousedown', function() {
            sideScroll($(this).parent().find('.time-cells')[0], 'left', 0, 1);
        });

        $('.arrow.right').off('mousedown').on('mousedown', function() {
            sideScroll($(this).parent().find('.time-cells')[0], 'right', 0, 1);
        });

        $('.arrow.left').off('mouseup').on('mouseup', function() {
            window.clearInterval(slideTimer);
        });

        $('.arrow.right').off('mouseup').on('mouseup', function() {
            window.clearInterval(slideTimer);
        });

        function toggleArrowColor(target) {
            const element = $(target);
            const hasHorizontalScrollbar = target.scrollWidth > target.clientWidth;
            element.parent().find('.arrow').toggleClass('disabled', !hasHorizontalScrollbar);
            element.parent().find('.sign-cell.minus-sign').toggleClass('disabled', !hasHorizontalScrollbar);
        }

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                toggleArrowColor(entry.target);
            }
        });

        $('.time-cells').each((index, element) => {
            resizeObserver.observe(element);
            toggleArrowColor(element);
        });

        function addEntries(element) {
            const dateKey = $(element).attr('id');
            let moreThree =
                calendar.constructor._getRowCode(dateKey, true /*isInterval*/) +
                calendar.constructor._getRowCode(dateKey) +
                calendar.constructor._getRowCode(dateKey);
            $(element).append(moreThree);
            element.scrollLeft = element.scrollWidth - element.clientWidth;
            $(element).find('input[type=\'time\']').off('input propertychange').on('input propertychange', function() {
                calendar._updateTimeDayCallback($(this).attr('data-date'));
            });
            setTimeout(() => {
                calendar._checkTodayPunchButton();
            }, 0);
        }

        $('.plus-sign span').off('click').on('click', function() {
            const element = $(this).parent().parent().find('.time-cells')[0];
            addEntries(element);
            toggleArrowColor(element);
        });

        function removeEntries(element) {
            const row = $(element).find('.row-time');
            if (row.length > 5) {
                const dateKey = $(element).attr('id');
                const removeEntriesDialogOptions = {
                    title: 'Remove entry',
                    message: `Are you sure you want to remove the last two entries from day ${dateKey}?`,
                    type: 'info',
                    buttons: ['Yes', 'No']
                };
                showDialog(removeEntriesDialogOptions, (result) => {
                    const buttonId = result.response;
                    if (buttonId === 1) {
                        return;
                    }
                    const sliceNum = row.length === 6 ? -1 : (row.length === 7 ? -2 : -3);
                    row.slice(sliceNum).remove();
                    calendar._updateTimeDay($(element).attr('id'));
                    toggleArrowColor(element);
                    setTimeout(() => {
                        calendar._checkTodayPunchButton();
                    }, 0);
                });
            }
        }

        $('.minus-sign span').off('click').on('click', function() {
            const element = $(this).parent().parent().find('.time-cells')[0];
            removeEntries(element);
        });

        $('.time-cells').mousewheel(function(e, delta) {
            this.scrollLeft -= (delta * 30);
            e.preventDefault();
        });
    }

    /*
    * Adds the next missing entry on the actual day and updates calendar.
    */
    punchDate() {
        const now = new Date(),
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

        const value = hourMinToHourFormatted(hour, min);
        const key = year + '-' + month + '-' + day;
        const inputs = $('#' + key + ' input[type="time"]');
        for (const element of inputs) {
            if ($(element).val().length === 0) {
                $(element).val(value);
                this._updateTimeDayCallback(key);
                break;
            }
        }
    }

    /*
    * Updates the monthly time balance.
    */
    _updateBalance() {
        let now = new Date(),
            monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth()),
            workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        let countDays = false;
        let isNextDay = false;

        for (let day = 1; day <= monthLength; ++day) {
            let isToday = (now.getDate() === day && now.getMonth() === this._getCalendarMonth() && now.getFullYear() === this._getCalendarYear());
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

            let key = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day;
            let dayTotal = $('#' + key).parent().find('.day-total span').html();
            if (dayTotal !== undefined && dayTotal.length !== 0) {
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
        let monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let monthTotal = '00:00';
        let workingDays = 0;
        let stopCountingMonthStats = false;
        for (let day = 1; day <= monthLength; ++day) {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day)) {
                continue;
            }

            let dayTotal = null;
            let key = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day;

            let waivedInfo = this._getWaiverStore(day, this._getCalendarMonth(), this._getCalendarYear());
            if (waivedInfo !== undefined) {
                let waivedDayTotal = waivedInfo['hours'];
                $('#' + key + ' .day-total').html(waivedDayTotal);
                dayTotal = waivedDayTotal;
            } else {
                this._setTableData(key);
                this._colorErrorLine(key);
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
        let monthDayInput = $('#month-day-input');
        if (monthDayInput) {
            monthDayInput.html(this._getBalanceRowPosition());
        }
        let monthWorkingDays = $('#month-working-days');
        if (monthWorkingDays) {
            monthWorkingDays.html(workingDays);
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

        let key = this._getTodayYear() + '-' + this._getTodayMonth() + '-' + this._getTodayDate();
        const values = this._getStore(key);
        let validatedTimes = this._validateTimes(values, true /*removeEndingInvalids*/);

        let leaveBy = '--:--';
        if (validatedTimes.length > 0 && validatedTimes.every(time => time !== '--:--')) {
            const smallestMultipleOfTwo = Math.floor(validatedTimes.length/2)*2;
            let dayTotal = '00:00';
            let timesAreProgressing = true;
            for (let i = 0; i < smallestMultipleOfTwo; i += 2) {
                const difference = subtractTime(validatedTimes[i], validatedTimes[i + 1]);
                dayTotal = sumTime(dayTotal, difference);
                if (validatedTimes[i] >= validatedTimes[i + 1]) {
                    timesAreProgressing = false;
                }
            }
            if (timesAreProgressing) {
                const lastTime = validatedTimes[validatedTimes.length-1];
                const remainingTime = subtractTime(dayTotal, this._getHoursPerDay());
                leaveBy = sumTime(lastTime, remainingTime);
            }
        }
        $('#leave-by').html(leaveBy <= '23:59' ? leaveBy : '--:--');

        this._checkTodayPunchButton();

        const dayTotal = $('#' + key).parent().find(' .day-total span').html();
        if (dayTotal !== undefined && dayTotal.length > 0) {
            const dayBalance = subtractTime(this._getHoursPerDay(), dayTotal);
            $('#leave-day-balance').html(dayBalance);
            $('#leave-day-balance').removeClass('text-success text-danger');
            $('#leave-day-balance').addClass(isNegative(dayBalance) ? 'text-danger' : 'text-success');
            $('#summary-unfinished-day').addClass('hidden');
            $('#summary-finished-day').removeClass('hidden');
        } else {
            $('#summary-unfinished-day').removeClass('hidden');
            $('#summary-finished-day').addClass('hidden');
        }
    }

    /*
     * Will check if the inputs for today are all filled and then enable the button, if not.
     */
    _checkTodayPunchButton() {
        const today = new Date();
        const isCurrentMonth = (today.getMonth() === this._calendarDate.getMonth() && today.getFullYear() === this._calendarDate.getFullYear());
        let enableButton = false;
        if (isCurrentMonth) {
            const dateKey = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();
            const inputs = $('#' + dateKey + ' input[type="time"]');
            let allInputsFilled = true;
            for (let input of inputs) {
                allInputsFilled &= $(input).val().length !== 0;
            }
            enableButton = !allInputsFilled;
        }
        this._togglePunchButton(enableButton);
    }

    /*
     * Based on the key of the input, updates the values for total in DB and display it
     */
    _updateTimeDayCallback(key) {
        this._updateTimeDay(key);
        this._updateLeaveBy();
        this._updateBalance();
    }

    _updateDayIntervals(key) {
        const inputs = $('#' + key + ' input[type="time"]');
        let i = 0;
        let timeStart = '';
        let timeEnd = '';
        for (const element of inputs) {
            if (i !== 0 && (i + 1) % 2 === 1) {
                timeEnd = element.value;

                if (validateTime(timeEnd) && validateTime(timeStart)) {
                    if (timeEnd > timeStart) {
                        $(element).closest('.row-time').prev().find('span').html(subtractTime(timeStart, timeEnd));
                    }
                    timeStart = '';
                    timeEnd = '';
                }
            }
            else if ((i + 1) % 2 === 0) {
                timeStart = element.value;
            }
            i++;
        }
    }

    _updateDayTotal(key) {
        const dayTotalSpan = $('#' + key).parent().find('.day-total-cell span');
        dayTotalSpan.html('');

        const inputs = $('#' + key + ' input[type="time"]');
        const values = this._getStore(key);
        const validatedTimes = this._validateTimes(values);

        const storeHasExpectedSize = values.length === inputs.length;
        const inputsHaveExpectedSize = values.length >= 4 && values.length % 2 === 0;
        const validatedTimesOk = validatedTimes.length > 0 && validatedTimes.every(time => time !== '--:--');
        const hasDayEnded = storeHasExpectedSize && inputsHaveExpectedSize && validatedTimesOk;

        if (hasDayEnded) {
            let dayTotal = '00:00';
            let timesAreProgressing = true;
            if (validatedTimes.length >= 4 && validatedTimes.length % 2 === 0) {
                for (let i = 0; i < validatedTimes.length; i += 2) {
                    const difference = subtractTime(validatedTimes[i], validatedTimes[i + 1]);
                    dayTotal = sumTime(dayTotal, difference);
                    if (validatedTimes[i] >= validatedTimes[i + 1]) {
                        timesAreProgressing = false;
                    }
                }
            }
            if (timesAreProgressing) {
                dayTotalSpan.html(dayTotal);
            }
        }
    }

    _updateTimeDay(key) {
        // Cleaning intervals
        $('#' + key + ' .interval span').html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

        const inputs = $('#' + key + ' .ti input[type=\'time\']');
        let newValues = [];
        for (const element of inputs) {
            newValues.push(element.value);
        }

        this._updateDayIntervals(key);
        this._updateDbEntry(key, newValues);
        this._updateDayTotal(key);
        this._colorErrorLine(key);
    }

    _updateDbEntry(key, newValues) {
        let validatedTimes = this._validateTimes(newValues);
        if (validatedTimes.length > 0) {
            this._setStore(key, validatedTimes);
        } else {
            this._removeStore(key);
        }
    }

    /*
     * Updates data displayed based on the database.
     * Each row is composed of input pairs, and intervals between them.
     * Final number of entries is 2*i + (i-1), where i is the number of entry pairs for that date.
     */
    _setTableData(key) {
        const values = this._getStore(key);
        const inputs = $('#' + key + ' input[type="time"]');
        let i = 0;

        function indexIsInterval(index) {
            return index % 3 === 0;
        }

        for (const element of values) {
            if (indexIsInterval(i + 1)) {
                $(this.constructor._getRowCode(key, true /*isInterval*/)).appendTo('#' + key);
                i++;
            }

            let input = inputs[i];
            if (input === undefined) {
                input = $(this.constructor._getRowCode(key)).appendTo('#' + key).find('input[type="time"]');
                input.val('');
            }
            $(input).val(element);

            i++;
        }

        /*
         * This means that one interval and two inputs were added.
         */
        function inputGroupFullyPrinted(index) {
            return index % 3 !== 2;
        }

        function lessThanFourEntries(index) {
            return index < 5;
        }

        while (lessThanFourEntries(i) || inputGroupFullyPrinted(i)) {
            ++i;
            if (indexIsInterval(i)) {
                $(this.constructor._getRowCode(key, true /*isInterval*/)).appendTo('#' + key);
            }
            else {
                $(this.constructor._getRowCode(key)).appendTo('#' + key).find('input[type="time"]');
            }
        }

        this._updateDayIntervals(key);
        this._updateDayTotal(key);
    }

    /*
     * Gets value from internal store.
     */
    _getStore(key) {
        return this._internalStore[key] !== undefined ? this._internalStore[key].values : [];
    }

    /*
     * Saves value on store and updates internal store.
     */
    _setStore(key, newValues) {
        this._internalStore[key] = { values: newValues };
        flexibleStore.set(key, this._internalStore[key]);
    }

    /*
     * Removes value from store and from internal store.
     */
    _removeStore(key) {
        this._internalStore[key] = undefined;
        flexibleStore.delete(key);
    }

    /**
     * Returns an array of only validated values.
     * @param {Array} values
     * @param {Boolean} removeEndingInvalids Removes invalid '--:--' values at end of sequence.
     *     For example, for a sequence ['08:00', '--:--', '10:00', '--:--' , '--:--' , '--:--'], will return ['08:00', '--:--', '10:00']
     * @return {Array}
     */
    _validateTimes(values, removeEndingInvalids = false) {
        let validatedTimes = [];
        if (values.length > 0) {
            for (const time of values) {
                validatedTimes.push(validateTime(time) ? time : '--:--');
            }
        }

        if (removeEndingInvalids) {
            for (let i = validatedTimes.length-1; i >= 0; i--) {
                if (validatedTimes[i] === '--:--') {
                    validatedTimes.splice(i, 1);
                }
                else {
                    break;
                }
            }
        }

        return validatedTimes;
    }

    /**
     * Stores year data in memory to make operations faster
     */
    loadInternalStore() {
        this._internalStore = [];

        for (const entry of flexibleStore) {
            const key = entry[0];
            const value = entry[1];

            this._internalStore[key] = value;
        }
    }

    /*
     * Toggles the color of a row based on input error.
     */
    _colorErrorLine(key) {
        $('#' + key).toggleClass('error-tr', this._hasInputError(key));
    }

    /*
     * Analyze the inputs of a day, and return if there is an error.
     * An error means that an input earlier in the day is higher than one that is after it.
     */
    _hasInputError(key) {
        let inputs = $('#' + key + ' input[type=\'time\']');
        let newValues = [];
        for (const element of inputs) {
            newValues.push(element.value);
        }

        const validatedTimes = this._validateTimes(newValues, true /*removeEndingInvalids*/);
        if (validatedTimes.some(time => time === '--:--')) {
            return true;
        }
        for (let index = 0; index < validatedTimes.length; index++) {
            if (index > 0 && (validatedTimes[index - 1] >= validatedTimes[index])) {
                return true;
            }
        }
        return false;
    }
}

module.exports = {
    FlexibleMonthCalendar
};