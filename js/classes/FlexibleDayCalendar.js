'use strict';

const { ipcRenderer } = require('electron');
const {
    isNegative,
    multiplyTime,
    subtractTime,
    sumTime,
    validateTime
} = require('../time-math.js');
const { getDateStr, getMonthLength } = require('../date-aux.js');
const { generateKey } = require('../date-db-formatter.js');
const { showDialog } = require('../window-aux.js');
const { FlexibleMonthCalendar } = require('./FlexibleMonthCalendar.js');
const i18n = require('../../src/configs/i18next.config.js');

class FlexibleDayCalendar extends FlexibleMonthCalendar
{
    /**
    * @param {Object.<string, any>} preferences
    */
    constructor(preferences)
    {
        super(preferences);
    }

    /**
     * Initializes the calendar by generating the html code, binding JS events and then drawing according to DB.
     */
    _initCalendar()
    {
        this._generateTemplate();

        $('#next-day').click(() => { this._nextDay(); });
        $('#prev-day').click(() => { this._prevDay(); });
        $('#switch-view').click(() => { this._switchView(); });
        $('#current-day').click(() => { this._goToCurrentDate(); });
        $('#input-calendar-date').change((event) =>
        {
            let [year, month, day] = $(event.target).val().split('-');
            this._goToDate(new Date(year, month-1, day));
        });

        this._draw();
    }

    /**
     * Generates the calendar HTML view.
     */
    _generateTemplate()
    {
        let body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'flexible-day');
    }

    /**
     * Returns the header of the page, with the image, name and a message.
     * @return {string}
     */
    static _getPageHeader()
    {
        let switchView = `<input id="switch-view" type="image" src="assets/switch.svg" alt="${i18n.t('$FlexibleDayCalendar.switch-view')}" title="${i18n.t('$FlexibleDayCalendar.switch-view')}" height="24" width="24"></input>`;
        let todayBut = `<input id="current-day" type="image" src="assets/calendar.svg" alt="${i18n.t('$FlexibleDayCalendar.current-day')}" title="${i18n.t('$FlexibleDayCalendar.current-day')}" height="24" width="24"></input>`;
        let leftBut = `<input id="prev-day" type="image" src="assets/left-arrow.svg" alt="${i18n.t('$FlexibleDayCalendar.previous-day')}" height="24" width="24"></input>`;
        let rightBut = `<input id="next-day" type="image" src="assets/right-arrow.svg" alt="${i18n.t('$FlexibleDayCalendar.next-day')}" height="24" width="24"></input>`;
        return '<div class="title-header">'+
                    '<div class="title-header-img"><img src="assets/timer.svg" height="64" width="64"></div>' +
                    `<div class="title-header-text">${i18n.t('$FlexibleDayCalendar.time-to-leave')}</div>` +
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

    /**
     * Returns the template code of the body of the page.
     * @return {string}
     */
    _getBody()
    {
        let html = '<div>';
        html += this.constructor._getPageHeader();
        html += '<div id="calendar-table-body">';
        html += '</div>';

        return html;
    }

    /**
     * Returns the summary field HTML code.
     * @return {string}
     */
    static _getSummaryRowCode()
    {
        let leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        let summaryStr = i18n.t('$FlexibleDayCalendar.leave-by');
        let code = '<div class="summary" id="summary-unfinished-day">' +
                     '<div class="leave-by-text">' + summaryStr + '</div>' +
                     '<div class="leave-by-time">' + leaveByCode + '</div>' +
                   '</div>';
        let finishedSummaryStr = i18n.t('$FlexibleDayCalendar.day-done-balance');
        let dayBalance = '<input type="text" id="leave-day-balance" size="5" disabled>';
        code += '<div class="summary hidden" id="summary-finished-day">' +
                    '<div class="leave-by-text">' + finishedSummaryStr + '</div>' +
                    '<div class="leave-by-time">' + dayBalance + '</div>' +
                '</div>';
        return code;
    }
    /**
     * Returns the HTML code for the row with working days, month total and balance.
     * @return {string}
     */
    static _getBalanceRowCode()
    {
        return '<div class="month-total-row">' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        `<div class="month-total-text month-balance" title="${i18n.t('$FlexibleDayCalendar.balance-up-until-today-for-this-month')}">${i18n.t('$FlexibleDayCalendar.month-balance')}</div>` +
                        `<div class="month-total-time month-balance-time" title="${i18n.t('$FlexibleDayCalendar.balance-up-until-today-for-this-month')}"><span type="text" id="month-balance"></div>` +
                    '</div>' +
                    '</div>' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        `<div class="month-total-text month-sum" title="${i18n.t('$FlexibleDayCalendar.overall-balance-month')}">${i18n.t('$FlexibleDayCalendar.overall-balance')}</div>` +
                        `<div class="month-total-time month-sum-time" title="${i18n.t('$FlexibleDayCalendar.overall-balance-month')}"><span id="overall-balance"></div>` +
                    '</div>' +
                    '</div>' +
                '</div>';
    }

    /**
     * Returns the code of the table body of the calendar.
     * @return {string}
     */
    _generateTableBody()
    {
        return this._getInputsRowCode(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate()) + this.constructor._getBalanceRowCode();
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
        const today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            dateKey = generateKey(year, month, day);

        if (!this._showDay(year, month, day))
        {
            return '<div class="today-non-working" id="' + dateKey + '">' +
                        `<div class="non-working-day">${i18n.t('$FlexibleDayCalendar.not-a-working-day')}</div>` +
                    '</div>\n';
        }

        let waivedInfo = this._getWaiverStore(year, month, day);
        if (waivedInfo !== undefined)
        {
            let summaryStr = `<b>${i18n.t('$FlexibleDayCalendar.waived-day')}: </b>` + waivedInfo['reason'];
            let waivedLineHtmlCode =
                 '<div class="row-waiver" id="' + dateKey + '">' +
                    '<div class="waived-day-text" colspan="5">' + summaryStr + '</div>' +
                    '<div class="day-total-cell">' +
                        '<div class="day-total"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>' +
                    '</div>' +
                '</div>\n';
            return waivedLineHtmlCode;
        }

        let htmlCode =
            '<div class="rows-time" id="' + dateKey + '">' +
            '</div>' +
            '<div class="row-total">' +
                `<div class="th th-label first-group" colspan="3">${i18n.t('$FlexibleDayCalendar.day-total')}</div>` +
                '<div class="second-group">' +
                    '<div class="day-total-cell">' +
                        '<div class="day-total"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="third-group">' +
                    '<div class="sign-cell">' +
                        '<div class="sign-container"><span class="plus-sign">+</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>\n';

        if (isToday)
        {
            htmlCode += this.constructor._getSummaryRowCode();
        }

        return htmlCode;
    }

    /**
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    _updateTableHeader()
    {
        let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let today = this._calendarDate;
        $('#header-date').html(today.toLocaleDateString(i18n.language, options));
        $('#input-calendar-date').val(getDateStr(today));
    }

    /**
     * Display next day.
     */
    _nextDay()
    {
        this._changeDay(1);
    }

    /**
     * Display previous day.
     */
    _prevDay()
    {
        this._changeDay(-1);
    }

    /**
     * Go to current day.
     */
    _goToCurrentDate()
    {
        this._goToDate(new Date());
    }

    /**
     * Returns if Calendar date agrees with parameter date.
     * @return {Boolean}
     */
    _isCalendarOnDate(date)
    {
        return date.getDate() === this._getCalendarDate() && date.getMonth() === this._getCalendarMonth() && date.getFullYear() === this._getCalendarYear();
    }

    /**
     * Go to date.
     * @param {Date} date
     */
    _goToDate(date)
    {
        this._calendarDate = date;
        this.redraw();
    }

    /**
     * Change the calendar view by a number of days.
     * @param int numDays number of days to be changed (positive/negative)
     */
    _changeDay(numDays)
    {
        this._calendarDate.setDate(this._calendarDate.getDate() + numDays);
        this.redraw();
    }

    /**
     * Draws elements of the Calendar that depend on DB data.
     */
    _draw()
    {
        super._draw();

        if (!this._isCalendarOnDate(new Date()))
        {
            $('#punch-button').prop('disabled', true);
            ipcRenderer.send('TOGGLE_TRAY_PUNCH_TIME', false);
        }
    }

    /**
     * Draws +/- buttons for the flexible calendar. Arrows are not needed for day calendar.
     */
    _drawArrowsAndButtons()
    {
        const calendar = this;

        function removeEntries()
        {
            const existingEntryPairs = $('.row-entry-pair').length;
            if (existingEntryPairs > 2)
            {
                const dateKey = $('.rows-time').attr('id');
                const removeEntriesDialogOptions = {
                    title: i18n.t('$FlexibleDayCalendar.remove-entry'),
                    message: i18n.t('$FlexibleDayCalendar.entry-removal-confirmation'),
                    type: 'info',
                    buttons: [i18n.t('$FlexibleDayCalendar.yes'), i18n.t('$FlexibleDayCalendar.no')]
                };
                showDialog(removeEntriesDialogOptions, (result) =>
                {
                    const buttonId = result.response;
                    if (buttonId === 1)
                    {
                        return;
                    }
                    $('.rows-time > div:last-of-type').remove();
                    $('.rows-time > div:last-of-type').remove();

                    if (existingEntryPairs - 1 > 2)
                    {
                        const minusSignCode =
                            '<div class="sign-cell">' +
                                '<div class="sign-container"><span class="minus-sign">-</span></div>' +
                            '</div>';
                        $(minusSignCode).appendTo('.rows-time > div:last-of-type > .third-group');
                        $('.sign-cell:has(span.minus-sign)').off('click').on('click', removeEntries);
                    }

                    calendar._updateTimeDay(dateKey);
                    setTimeout(() =>
                    {
                        calendar._checkTodayPunchButton();
                    }, 0);
                });
            }
        }

        function addEntries()
        {
            const dateKey = $('.rows-time').attr('id');
            $('.sign-cell:has(span.minus-sign)').remove();
            const existingEntryPairs = 2 * $('.row-entry-pair').length;
            calendar._addNecessaryEntries(dateKey, existingEntryPairs + 2);
            $('.sign-cell:has(span.minus-sign)').off('click').on('click', removeEntries);
            $('input[type=\'time\']').off('input propertychange').on('input propertychange', function()
            {
                calendar._updateTimeDayCallback($(this).attr('data-date'));
            });
            setTimeout(() =>
            {
                calendar._checkTodayPunchButton();
            }, 0);
        }

        $('.sign-cell:has(span.plus-sign)').off('click').on('click', addEntries);
        $('.sign-cell:has(span.minus-sign)').off('click').on('click', removeEntries);
    }

    /**
     * Every day change, if the calendar is showing the same date as that of the previous date,
     * this function is called to redraw the calendar.
     * @param {int} oldDayDate
     * @param {int} oldMonthDate
     * @param {int} oldYearDate
     */
    refreshOnDayChange(oldDayDate, oldMonthDate, oldYearDate)
    {
        let date = new Date(oldYearDate, oldMonthDate, oldDayDate);
        if (this._isCalendarOnDate(date))
        {
            this._goToCurrentDate();
        }
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
        if (values !== undefined)
        {
            const validatedTimes = this._validateTimes(values);
            const inputsHaveExpectedSize = values.length >= 4 && values.length % 2 === 0;
            const validatedTimesOk = validatedTimes.length > 0 && validatedTimes.every(time => time !== '--:--');
            const hasDayEnded = inputsHaveExpectedSize && validatedTimesOk;

            let dayTotal = undefined;
            if (hasDayEnded)
            {
                dayTotal = '00:00';
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
     * Updates the monthly time balance and triggers the all time balance update at end.
     */
    _updateBalance()
    {
        let yesterday = new Date(this._calendarDate);
        yesterday.setDate(this._calendarDate.getDate() - 1);
        let workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        let countDays = false;

        let limit = this._getCountToday() ? this._getCalendarDate() : (yesterday.getMonth() !== this._getCalendarMonth() ? 0 : yesterday.getDate());
        for (let day = 1; day <= limit; ++day)
        {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            let dayTotal = this._getDayTotal(this._getCalendarYear(), this._getCalendarMonth(), day);
            if (dayTotal !== undefined)
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
            balanceElement.html(balance);
            balanceElement.removeClass('text-success text-danger');
            balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
        }
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

        const leaveBy = this._calculateLeaveBy();
        $('#leave-by').val(leaveBy <= '23:59' ? leaveBy : '--:--');

        this._checkTodayPunchButton();

        const dayTotal = $('.day-total span').html();
        if (dayTotal !== undefined && dayTotal.length > 0)
        {
            const dayBalance = subtractTime(this._getHoursPerDay(), dayTotal);
            $('#leave-day-balance').val(dayBalance);
            $('#leave-day-balance').removeClass('text-success text-danger');
            $('#leave-day-balance').addClass(isNegative(dayBalance) ? 'text-danger' : 'text-success');
            $('#summary-unfinished-day').addClass('hidden');
            $('#summary-finished-day').removeClass('hidden');
        }
        else
        {
            $('#summary-unfinished-day').removeClass('hidden');
            $('#summary-finished-day').addClass('hidden');
        }
    }

    /**
     * Updates data displayed on the calendar based on the internal DB, and updates balances at end.
     */
    _updateBasedOnDB()
    {
        let monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let workingDays = 0;
        let stopCountingMonthStats = false;
        for (let day = 1; day <= monthLength; ++day)
        {

            if (stopCountingMonthStats)
            {
                break;
            }

            stopCountingMonthStats |= (this._getCalendarDate() === day);

            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            const dateKey = generateKey(this._getCalendarYear(), this._getCalendarMonth(), day);
            if (day === this._getCalendarDate())
            {
                let waivedInfo = this._getWaiverStore(this._getCalendarYear(), this._getCalendarMonth(), day);
                if (waivedInfo !== undefined)
                {
                    let waivedDayTotal = waivedInfo['hours'];
                    $('#' + dateKey + ' .day-total').html(waivedDayTotal);
                }
                else
                {
                    this._setTableData(dateKey);
                    this._checkInputErrors();
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

    /**
     * Updates the DB with the information of computed total lunch time and day time.
     * @param {string} dateKey
     */
    _updateTimeDay(dateKey)
    {
        // Cleaning intervals
        $('#' + dateKey + ' div.interval').html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

        const inputs = $('#' + dateKey + ' .row-entry-pair input[type=\'time\']');
        let newValues = [];
        for (const element of inputs)
        {
            newValues.push(element.value);
        }

        this._updateDayIntervals(dateKey);
        this._updateDbEntry(dateKey, newValues);
        this._updateDayTotal(dateKey);
        this._checkInputErrors();
    }

    /**
     * Updates the intervals shown on the calendar
     * @param {string} dateKey
     */
    _updateDayIntervals(dateKey)
    {
        const inputs = $('#' + dateKey + ' input[type="time"]');
        let i = 0;
        let timeStart = '';
        let timeEnd = '';
        for (const element of inputs)
        {
            if (i !== 0 && (i + 1) % 2 === 1)
            {
                timeEnd = element.value;

                if (validateTime(timeEnd) && validateTime(timeStart))
                {
                    if (timeEnd > timeStart)
                    {
                        $(element).closest('.row-entry-pair').prev().find('div.interval').html(subtractTime(timeStart, timeEnd));
                    }
                    timeStart = '';
                    timeEnd = '';
                }
            }
            else if ((i + 1) % 2 === 0)
            {
                timeStart = element.value;
            }
            i++;
        }
    }

    /**
     * Analyze the inputs of a day, and color entry lines if they have errors.
     * An error means that an input earlier in the day is higher than one that is after it.
     */
    _checkInputErrors()
    {
        function colorErrorLine(entryRow, validated)
        {
            $(entryRow).toggleClass('error-tr', !validated);
        }

        // Checking errors on each row
        const entryRows = $('.row-entry-pair');
        entryRows.each((index, entryRow) =>
        {
            const inputs = $(entryRow).find('input[type=\'time\']');
            let newValues = [];
            for (const element of inputs)
            {
                newValues.push(element.value);
            }

            const validatedTimes = this._validateTimes(newValues, true /*removeEndingInvalids*/);

            const noInputsYet = validatedTimes.length === 0;
            if (noInputsYet)
            {
                colorErrorLine(entryRow, true /*validated*/);
                return;
            }

            const invalidInputs = validatedTimes.some(time => time === '--:--');
            if (invalidInputs)
            {
                colorErrorLine(entryRow, false /*validated*/);
                return;
            }

            colorErrorLine(entryRow, true /*validated*/);
        });

        // Checking errors across rows
        const allInputs = $('input[type=\'time\']');
        let newValues = [];
        for (const element of allInputs)
        {
            newValues.push(element.value);
        }
        const validatedTimes = this._validateTimes(newValues, true /*removeEndingInvalids*/);
        for (let index = 0; index < validatedTimes.length; index++)
        {
            if (index > 0 && (validatedTimes[index - 1] >= validatedTimes[index]))
            {
                const entryRowIndex = Math.floor(index/2);
                colorErrorLine(entryRows[entryRowIndex], false /*validated*/);
                return;
            }
        }
    }

    /**
     * Appends the html elements for the day.
     * The table consists of interleaved rows of entry pairs and intervals.
     * @param {string} dateKey
     * @param {number} entrySize
     */
    _addNecessaryEntries(dateKey, entrySize)
    {
        // 2 pairs is the default minimum size of the table
        const numberOfPairs = Math.ceil(entrySize/2) >= 2 ? Math.ceil(entrySize/2) : 2;

        function entryPairHTMLCode(entryIndex, isLastRow)
        {

            const minusSignCode =
                '<div class="third-group">' +
                    '<div class="sign-cell">' +
                        '<div class="sign-container"><span class="minus-sign">-</span></div>' +
                    '</div>' +
                '</div>';
            const shouldPrintMinusSign = numberOfPairs > 2 && isLastRow;

            return '<div class="row-entry-pair">' +
                `<div class="th th-label first-group">${i18n.t('$FlexibleDayCalendar.entry')} #` + entryIndex + '</div>' +
                '<div class="second-group">' +
                    '<input type="time" data-date="' + dateKey + '">' +
                    '<input type="time" data-date="' + dateKey + '">' +
                '</div>' +
                (shouldPrintMinusSign ? minusSignCode : '') +
                '</div>';
        }

        function intervalHTMLCode(entryIndex)
        {

            if (entryIndex === 0)
            {
                return '';
            }
            return '<div class="row-interval">' +
                        '<div class="th th-label first-group"></div>' +
                        '<div class="second-group">' +
                            '<div class="interval">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>' +
                        '</div>' +
                    '</div>';
        }

        const existingEntryPairs = $('.row-entry-pair').length;
        for (let i = existingEntryPairs; i < numberOfPairs; i++)
        {
            $(intervalHTMLCode(i)).appendTo('#' + dateKey);
            const isLastRow = i === (numberOfPairs - 1);
            $(entryPairHTMLCode(i + 1, isLastRow)).appendTo('#' + dateKey);
        }
    }

    /**
     * Updates data displayed based on the database.
     * @param {string} dateKey
     */
    _setTableData(dateKey)
    {
        const values = this._getStore(dateKey);
        this._addNecessaryEntries(dateKey, values.length);

        const inputs = $('#' + dateKey + ' input[type="time"]');
        let i = 0;

        for (const element of values)
        {
            let input = inputs[i];
            if (input !== undefined)
            {
                $(input).val(element);
            }
            i++;
        }

        this._updateDayIntervals(dateKey);
        this._updateDayTotal(dateKey);
    }

    /**
     * Returns a date object for which the all time balance will be calculated.
     * For DayCalendar, it's the day of CalendarDate => the day being displayed.
     * If "count_today" is active, the following day.
     * @return {Date}
     */
    _getTargetDayForAllTimeBalance()
    {
        let targetDate = new Date(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate());
        if (this._getCountToday())
        {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        return targetDate;
    }
}

module.exports = {
    FlexibleDayCalendar
};
