'use strict';

import {
    isNegative,
    multiplyTime,
    subtractTime,
    sumTime,
    validateTime
} from '../time-math.js';
import { getDateStr, getMonthLength } from '../date-aux.js';
import { generateKey } from '../date-db-formatter.js';
import { BaseCalendar } from './BaseCalendar.js';

/// Compatiblity block - to be removed in the migration of calendar to non-remote electron
const { remote } = require('electron');
const { BrowserWindow, dialog } = remote;

/**
 * Opens an electron dialog, based on the options, and performs the successCallback after promise is resolved.
 * @param {Object.<string, any>} options
 * @param {function} successCallback
 */
function showDialog(options, successCallback)
{
    options['title'] = options['title'] || 'Time to Leave';
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options)
        .then(successCallback)
        .catch(err =>
        {
            console.log(err);
        });
}
////

class FlexibleDayCalendar extends BaseCalendar
{
    /**
    * @param {Object.<string, any>} preferences
    * @param {Object.<string, string>} languageData
    */
    constructor(preferences, languageData)
    {
        super(preferences, languageData);
    }

    /**
     * Initializes the calendar by generating the html code, binding JS events and then drawing according to DB.
     */
    _initCalendar()
    {
        this._generateTemplate();

        $('#next-day').on('click', () => { this._nextDay(); });
        $('#prev-day').on('click', () => { this._prevDay(); });
        $('#switch-view').on('click', () => { this._switchView(); });
        $('#current-day').on('click', () => { this._goToCurrentDate(); });
        $('#input-calendar-date').on('change', (event) =>
        {
            const [year, month, day] = $(event.target).val().split('-');
            this._goToDate(new Date(year, month-1, day));
        });

        this._draw();
    }

    /**
     * Generates the calendar HTML view.
     */
    _generateTemplate()
    {
        const body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'flexible-day');
    }

    /**
     * Returns the header of the page, with the image, name and a message.
     * @return {string}
     */
    _getPageHeader()
    {
        const switchView = `<input id="switch-view" type="image" src="assets/switch.svg" alt="${this._getTranslation('$BaseCalendar.switch-view')}" title="${this._getTranslation('$BaseCalendar.switch-view')}" height="24" width="24"></input>`;
        const todayBut = `<input id="current-day" type="image" src="assets/calendar.svg" alt="${this._getTranslation('$FlexibleDayCalendar.current-day')}" title="${this._getTranslation('$FlexibleDayCalendar.current-day')}" height="24" width="24"></input>`;
        const leftBut = `<input id="prev-day" type="image" src="assets/left-arrow.svg" alt="${this._getTranslation('$FlexibleDayCalendar.previous-day')}" height="24" width="24"></input>`;
        const rightBut = `<input id="next-day" type="image" src="assets/right-arrow.svg" alt="${this._getTranslation('$FlexibleDayCalendar.next-day')}" height="24" width="24"></input>`;
        const title = 'Time to Leave';
        return '<div class="title-header">'+
                    '<div class="title-header-img"><img src="assets/ttl.svg" height="64" width="64"></div>' +
                    `<div class="title-header-text">${title}</div>` +
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
        html += this._getPageHeader();
        html += '<div id="calendar-table-body">';
        html += '</div>';

        return html;
    }

    /**
     * Returns the summary field HTML code.
     * @return {string}
     */
    _getSummaryRowCode()
    {
        const leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        const summaryStr = this._getTranslation('$FlexibleDayCalendar.leave-by');
        let code = '<div class="summary" id="summary-unfinished-day">' +
                     '<div class="leave-by-text">' + summaryStr + '</div>' +
                     '<div class="leave-by-time">' + leaveByCode + '</div>' +
                   '</div>';
        const finishedSummaryStr = this._getTranslation('$BaseCalendar.day-done-balance');
        const dayBalance = '<input type="text" id="leave-day-balance" size="5" disabled>';
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
    _getBalanceRowCode()
    {
        return '<div class="month-total-row">' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        `<div class="month-total-text month-balance" title="${this._getTranslation('$BaseCalendar.month-balance-title')}">${this._getTranslation('$BaseCalendar.month-balance')}</div>` +
                        `<div class="month-total-time month-balance-time" title="${this._getTranslation('$BaseCalendar.month-balance-title')}"><span type="text" id="month-balance"></div>` +
                    '</div>' +
                    '</div>' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        `<div class="month-total-text month-sum" title="${this._getTranslation('$BaseCalendar.overall-balance-title')}">${this._getTranslation('$BaseCalendar.overall-balance')}</div>` +
                        `<div class="month-total-time month-sum-time" title="${this._getTranslation('$BaseCalendar.overall-balance-title')}"><span id="overall-balance"></div>` +
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
        return this._getInputsRowCode(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate()) + this._getBalanceRowCode();
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
                        `<div class="non-working-day">${this._getTranslation('$FlexibleDayCalendar.not-a-working-day')}</div>` +
                    '</div>\n';
        }

        const waivedInfo = this._getWaiverStore(year, month, day);
        if (waivedInfo !== undefined)
        {
            const summaryStr = `<b>${this._getTranslation('$FlexibleDayCalendar.waived-day')}: </b>` + waivedInfo['reason'];
            const waivedLineHtmlCode =
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
                `<div class="th th-label first-group" colspan="3">${this._getTranslation('$FlexibleDayCalendar.day-total')}</div>` +
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
            htmlCode += this._getSummaryRowCode();
        }

        return htmlCode;
    }

    /**
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    _updateTableHeader()
    {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = this._calendarDate;
        // pt-MI is used as an easter egg for a local dialect in Brazil
        const locale = this._languageData.language === 'pt-MI' ? 'pt-BR' : this._languageData.language;
        $('#header-date').html(today.toLocaleDateString(locale, options));
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
        this._drawButtons();

        if (!this._isCalendarOnDate(new Date()))
        {
            this._togglePunchButton(false /*enable*/);
        }
    }

    /**
     * Draws +/- buttons for the flexible calendar.
     */
    _drawButtons()
    {
        const calendar = this;

        function removeLastEntryPair(existingEntryPairs)
        {
            $('.rows-time > div:last-of-type').remove();
            $('.rows-time > div:last-of-type').remove();

            if (existingEntryPairs - 1 > 1)
            {
                const minusSignCode =
                    '<div class="sign-cell">' +
                        '<div class="sign-container"><span class="minus-sign">-</span></div>' +
                    '</div>';
                $(minusSignCode).appendTo('.rows-time > div:last-of-type > .third-group');
                $('.sign-cell:has(span.minus-sign)').off('click').on('click', removeEntries);
            }
        }

        function removeEntries()
        {
            const existingEntryPairs = $('.row-entry-pair').length;
            if (existingEntryPairs > 1)
            {
                const dateKey = $('.rows-time').attr('id');
                const removeEntriesDialogOptions = {
                    title: calendar._getTranslation('$FlexibleDayCalendar.remove-entry'),
                    message: calendar._getTranslation('$FlexibleDayCalendar.entry-removal-confirmation'),
                    type: 'info',
                    buttons: [calendar._getTranslation('$FlexibleDayCalendar.yes'), calendar._getTranslation('$FlexibleDayCalendar.no')]
                };
                const getInputs = $('.row-entry-pair').find('input');
                const len = getInputs.length;
                if (getInputs.get(len-1).value !== '' || getInputs.get(len-2).value !== '')
                {
                    showDialog(removeEntriesDialogOptions, (result) =>
                    {
                        const buttonId = result.response;
                        if (buttonId === 1)
                        {
                            return;
                        }
                        removeLastEntryPair(existingEntryPairs);
                        calendar._updateTimeDay(dateKey);
                        calendar._updateLeaveBy();
                    });
                }
                else
                {
                    removeLastEntryPair(existingEntryPairs);
                }
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
        }

        $('.sign-cell:has(span.plus-sign)').off('click').on('click', addEntries);
        $('.sign-cell:has(span.minus-sign)').off('click').on('click', removeEntries);
    }

    /**
     * Responsible for adding new entries to the calendar view.
     */
    _addTodayEntries()
    {
        $('.sign-cell:has(span.plus-sign)').trigger('click');
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
        const date = new Date(oldYearDate, oldMonthDate, oldDayDate);
        if (this._isCalendarOnDate(date))
        {
            this._goToCurrentDate();
        }
    }

    /**
     * Updates the monthly time balance and triggers the all time balance update at end.
     */
    _updateBalance()
    {
        const yesterday = new Date(this._calendarDate);
        yesterday.setDate(this._calendarDate.getDate() - 1);
        let workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        let countDays = false;

        const limit = this._getCountToday() ? this._getCalendarDate() : (yesterday.getMonth() !== this._getCalendarMonth() ? 0 : yesterday.getDate());
        for (let day = 1; day <= limit; ++day)
        {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            const dayTotal = this._getDayTotal(this._getCalendarYear(), this._getCalendarMonth(), day);
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
        const monthTotalToWork = multiplyTime(this._getHoursPerDay(), workingDaysToCompute * -1);
        const balance = sumTime(monthTotalToWork, monthTotalWorked);
        const balanceElement = $('#month-balance');
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
        const monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
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
                const waivedInfo = this._getWaiverStore(this._getCalendarYear(), this._getCalendarMonth(), day);
                if (waivedInfo !== undefined)
                {
                    const waivedDayTotal = waivedInfo['hours'];
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
        const monthDayInput = $('#month-day-input');
        if (monthDayInput)
        {
            monthDayInput.val(this._getBalanceRowPosition());
        }
        const monthWorkingDays = $('#month-working-days');
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
        const newValues = [];
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
            const newValues = [];
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
        const newValues = [];
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
        // 2 pairs is the default minimum size of the table, when no entries are there
        const numberOfPairs = Math.ceil(entrySize/2) >= 1 ? Math.ceil(entrySize/2) : 2;

        const translatedEntry = this._getTranslation('$FlexibleDayCalendar.entry');
        function entryPairHTMLCode(entryIndex, isLastRow)
        {
            const minusSignCode =
                '<div class="sign-cell">' +
                    '<div class="sign-container"><span class="minus-sign">-</span></div>' +
                '</div>';
            const shouldPrintMinusSign = numberOfPairs > 1 && isLastRow;

            return '<div class="row-entry-pair">' +
                    `<div class="th th-label first-group">${translatedEntry} #` + entryIndex + '</div>' +
                    '<div class="second-group">' +
                        '<input type="time" data-date="' + dateKey + '">' +
                        '<input type="time" data-date="' + dateKey + '">' +
                    '</div>' +
                    '<div class="third-group">' +
                        (shouldPrintMinusSign ? minusSignCode : '') +
                    '</div>' +
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
            const input = inputs[i];
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
        const targetDate = new Date(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate());
        if (this._getCountToday())
        {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        return targetDate;
    }
}

export {
    FlexibleDayCalendar
};
