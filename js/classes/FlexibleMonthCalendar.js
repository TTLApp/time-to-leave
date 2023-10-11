'use strict';

import {
    isNegative,
    multiplyTime,
    subtractTime,
    sumTime,
    validateTime
} from '../time-math.js';
import { getMonthLength } from '../date-aux.js';
import { generateKey } from '../date-db-formatter.js';
import {
    formatDayId,
    displayWaiverWindow
} from '../../renderer/workday-waiver-aux.js';
import { getMonthName, getDayAbbr } from '../date-to-string-util.js';
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

class FlexibleMonthCalendar extends BaseCalendar
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
        $('#next-month').on('click', () => { this._nextMonth(); });
        $('#prev-month').on('click', () => { this._prevMonth(); });
        $('#current-month').on('click', () => { this._goToCurrentDate(); });
        $('#switch-view').on('click', () => { this._switchView(); });

        this._draw();
    }

    /**
     * Returns a date object for which the all time balance will be calculated.
     * If current month, returns the actual day. If not, first day of following month.
     * @return {Date}
     */
    _getTargetDayForAllTimeBalance()
    {
        const targetYear = this._getCalendarYear(),
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

    /*
     * Generates the calendar HTML view.
     */
    _generateTemplate()
    {
        const body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'flexible');
    }

    /*
     * Returns the template code of the body of the page.
     */
    _getBody()
    {
        let html = this._getPageHeader();
        html += this._getTableHeaderCode();
        html += '<div id="calendar-table-body">';
        html += '</div>';

        return html;
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    _getPageHeader()
    {
        const switchView = `<input id="switch-view" type="image" src="assets/switch.svg" alt="${this._getTranslation('$BaseCalendar.switch-view')}" title="${this._getTranslation('$BaseCalendar.switch-view')}" height="24" width="24"></input>`;
        const todayBut = `<input id="current-month" type="image" src="assets/calendar.svg" alt="${this._getTranslation('$FlexibleMonthCalendar.current-month')}" title="${this._getTranslation('$FlexibleMonthCalendar.current-month')}" height="24" width="24"></input>`;
        const leftBut = `<input id="prev-month" type="image" src="assets/left-arrow.svg" alt="${this._getTranslation('$FlexibleMonthCalendar.previous-month')}" height="24" width="24"></input>`;
        const rightBut = `<input id="next-month" type="image" src="assets/right-arrow.svg" alt="${this._getTranslation('$FlexibleMonthCalendar.next-month')}" height="24" width="24"></input>`;
        const title = 'Time to Leave';
        return '<div class="title-header">'+
                    '<div class="title-header title-header-img"><img src="assets/ttl.svg" height="64" width="64"></div>' +
                    `<div class="title-header title-header-text">${title}</div>` +
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
    _getTableHeaderCode()
    {
        return '<div class="calendar-table-header">' +
                    `<div class="header-day">${this._getTranslation('$FlexibleMonthCalendar.day')}</div>` +
                    `<div class="header-day-total">${this._getTranslation('$FlexibleMonthCalendar.total')}</div>` +
                '</div>\n';
    }

    /*
     * Returns the summary field HTML code.
     */
    _getSummaryRowCode()
    {
        const leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        return  '<div class="summary" id="summary-unfinished-day">' +
                    `<div class="leave-by-text" colspan="7">${this._getTranslation('$FlexibleMonthCalendar.leave-by')}</div>` +
                    '<div class="leave-by-time">' +
                        leaveByCode +
                    '</div>' +
                '</div>' +
                '<div class="summary hidden" id="summary-finished-day">' +
                    `<div class="leave-by-text" colspan="7">${this._getTranslation('$BaseCalendar.day-done-balance')}</div>` +
                    '<div class="leave-by-time">' +
                        '<div id="leave-day-balance"></div>' +
                    '</div>' +
                '</div>';
    }

    /*
     * Returns the HTML code for the row with working days, month total and balance.
     */
    _getBalanceRowCode()
    {
        return '<div class="month-total-row">' +
                    `<div class="month-total-text" title="${this._getTranslation('$FlexibleMonthCalendar.last-day-balance')}">${this._getTranslation('$FlexibleMonthCalendar.on')}</div>` +
                    `<div class="month-total-time" title="${this._getTranslation('$FlexibleMonthCalendar.last-day-balance')}"><span id="month-day-input"></span></div>` +
                    `<div class="month-total-text" title="${this._getTranslation('$FlexibleMonthCalendar.working-days-title')}">${this._getTranslation('$FlexibleMonthCalendar.working-days')}</div>` +
                    `<div class="month-total-time" title="${this._getTranslation('$FlexibleMonthCalendar.working-days-title')}"><span id="month-working-days"></span></div>` +
                    `<div class="month-total-text" title="${this._getTranslation('$BaseCalendar.month-balance-title')}">${this._getTranslation('$BaseCalendar.month-balance')}</div>` +
                    `<div class="month-total-time" title="${this._getTranslation('$BaseCalendar.month-balance-title')}"><input type="text" id="month-balance"     size="8" disabled></div>` +
                    `<div class="month-total-text" title="${this._getTranslation('$BaseCalendar.overall-balance-title')}">${this._getTranslation('$BaseCalendar.overall-balance')}</div>` +
                    `<div class="month-total-time" title="${this._getTranslation('$BaseCalendar.overall-balance-title')}"><input type="text" id="overall-balance" size="8" placeholder="..." disabled></div>` +
                '</div>';
    }

    static _getRowCode(dateKey, isInterval = false)
    {
        if (isInterval)
        {
            return  '<div class="row-time">' +
                        '<div class="interval" colspan="4"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>' +
                    '</div>';
        }
        return  '<div class="row-time">' +
                    '<div class="ti" colspan="4"><input type="time" data-date="' + dateKey + '"></div>' +
                '</div>';
    }

    _getInputsRowCode(year, month, day)
    {
        const currentDay = new Date(year, month, day),
            weekDay = currentDay.getDay();
        const today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            dateKey = generateKey(year, month, day);

        if (!this._showDay(year, month, day))
        {
            return '<div><div class="weekday">' + getDayAbbr(this._languageData.data, weekDay) + '</div>' +
                    '<div class="day">' +
                        '<span class="day-number"> ' + day + ' </span>' +
                    '</div>' +
                    '<div class="non-working-day" id="' + dateKey + '">' +
                    '</div></div>\n';
        }

        const waivedInfo = this._getWaiverStore(year, month, day);
        if (waivedInfo !== undefined)
        {
            const summaryStr = `<b>${this._getTranslation('$FlexibleMonthCalendar.waived-day')}: </b>` + waivedInfo['reason'];
            const waivedLineHtmlCode =
                '<div class="row-waiver" id="' + dateKey + '">' +
                    '<div class="weekday">' + getDayAbbr(this._languageData.data, weekDay) + '</div>' +
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
                `<div class="weekday waiver-trigger" title="${this._getTranslation('$FlexibleMonthCalendar.add-waiver-day')}">` + getDayAbbr(this._languageData.data, weekDay) + '</div>' +
                '<div class="day">' +
                    '<span class="day-number"> ' + day + ' </span>' +
                    '<img src="assets/waiver.svg" height="16" class="waiver-img">' +
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

        if (isToday)
        {
            htmlCode += this._getSummaryRowCode();
        }

        return htmlCode;
    }

    /**
     * Updates TableHeader(header-day, header-day-total) when language setting changed.
     */
    _updateTableHeader()
    {
        $('#month-year').html(`${getMonthName(this._languageData.data, this._getCalendarMonth())} ${this._getCalendarYear()}`);
        $('.header-day').text(this._getTranslation('$FlexibleMonthCalendar.day'));
        $('.header-day-total').text(this._getTranslation('$FlexibleMonthCalendar.total'));
    }

    /**
     * Returns the code of the table body of the calendar.
     * @return {string}
     */
    _generateTableBody()
    {
        let html = '';
        const monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        const balanceRowPosition = this._getBalanceRowPosition();

        let day;
        for (day = 1; day <= monthLength; ++day)
        {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day) && this._getHideNonWorkingDays())
            {
                continue;
            }

            html += this._getInputsRowCode(this._getCalendarYear(), this._getCalendarMonth(), day);
        }

        if (day >= balanceRowPosition)
        {
            html += this._getBalanceRowCode();
        }

        return html;
    }

    /*
     * Draws elements of the Calendar that depend on data.
     */
    _draw()
    {
        super._draw();
        this._drawArrowsAndButtons();

        $('.waiver-trigger').off('click').on('click', function()
        {
            const dayId = $(this).siblings().closest('.time-cells').attr('id');
            const waiverDay = formatDayId(dayId);
            displayWaiverWindow(waiverDay);
        });
    }

    /*
     * Draws the arrows and +/- buttons for the flexible calendar.
     */
    _drawArrowsAndButtons()
    {
        const calendar = this;
        let slideTimer;
        function sideScroll(element, direction, speed, step)
        {
            slideTimer = setInterval(function()
            {
                if (direction === 'left')
                {
                    element.scrollLeft -= step;
                }
                else
                {
                    element.scrollLeft += step;
                }
                if (element.scrollLeft + element.clientWidth === element.scrollWidth)
                {
                    window.clearInterval(slideTimer);
                }
            }, speed);
        }

        $('.arrow.left').off('mousedown').on('mousedown', function()
        {
            sideScroll($(this).parent().find('.time-cells')[0], 'left', 0, 1);
        });

        $('.arrow.right').off('mousedown').on('mousedown', function()
        {
            sideScroll($(this).parent().find('.time-cells')[0], 'right', 0, 1);
        });

        $('.arrow.left').off('mouseup').on('mouseup', function()
        {
            window.clearInterval(slideTimer);
        });

        $('.arrow.right').off('mouseup').on('mouseup', function()
        {
            window.clearInterval(slideTimer);
        });

        function toggleArrowColor(target)
        {
            const element = $(target);
            const hasHorizontalScrollbar = target.scrollWidth > target.clientWidth;
            element.parent().find('.arrow').toggleClass('disabled', !hasHorizontalScrollbar);
        }

        function toggleMinusSign(target)
        {
            const element = $(target);
            const numberEntries = $(element).find('.row-time').length;
            const hasMoreThanTwoEntries = numberEntries > 2;
            element.parent().find('.sign-cell.minus-sign').toggleClass('disabled', !hasMoreThanTwoEntries);
        }

        const resizeObserver = new ResizeObserver(entries =>
        {
            for (const entry of entries)
            {
                toggleArrowColor(entry.target);
            }
        });

        $('.time-cells').each((index, element) =>
        {
            resizeObserver.observe(element);
            toggleArrowColor(element);
            toggleMinusSign(element);
        });

        function addEntries(element)
        {
            const dateKey = $(element).attr('id');
            const moreThree =
                calendar.constructor._getRowCode(dateKey, true /*isInterval*/) +
                calendar.constructor._getRowCode(dateKey) +
                calendar.constructor._getRowCode(dateKey);
            $(element).append(moreThree);
            element.scrollLeft = element.scrollWidth - element.clientWidth;
            $(element).find('input[type=\'time\']').off('input propertychange').on('input propertychange', function()
            {
                calendar._updateTimeDayCallback($(this).attr('data-date'));
            });
        }

        $('.plus-sign span').off('click').on('click', function()
        {
            const element = $(this).parent().parent().find('.time-cells')[0];
            addEntries(element);
            toggleArrowColor(element);
            toggleMinusSign(element);
        });

        function removeLastEntryPair(element)
        {
            const row = $(element).find('.row-time');
            const sliceNum = row.length === 6 ? -1 : (row.length === 7 ? -2 : -3);
            row.slice(sliceNum).remove();
            calendar._updateTimeDay($(element).attr('id'));
            calendar._updateLeaveBy();
            toggleArrowColor(element);
            toggleMinusSign(element);
        }

        function removeEntries(element)
        {
            const row = $(element).find('.row-time');
            if (row.length > 3)
            {
                const dateKey = $(element).attr('id');
                const [year, month, day] = dateKey.split('-');
                const date = [year, parseInt(month) + 1, day].join('-');
                const removeEntriesDialogOptions = {
                    title: `${calendar._getTranslation('$FlexibleMonthCalendar.remove-entry')}`,
                    message: `${calendar._getTranslation('$FlexibleMonthCalendar.entry-removal-confirmation')} ${date}?`,
                    type: 'info',
                    buttons: [calendar._getTranslation('$FlexibleMonthCalendar.yes'), calendar._getTranslation('$FlexibleMonthCalendar.no')]
                };
                const getInputs = $(element).find('input');
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
                        removeLastEntryPair(element);
                    });
                }
                else
                {
                    removeLastEntryPair(element);
                }
            }
        }

        $('.minus-sign span').off('click').on('click', function()
        {
            const element = $(this).parent().parent().find('.time-cells')[0];
            removeEntries(element);
        });

        $('.time-cells').mousewheel(function(e, delta)
        {
            this.scrollLeft -= (delta * 30);
            e.preventDefault();
        });
    }

    /**
     * Responsible for adding new entries to the calendar view.
     */
    _addTodayEntries()
    {
        const dateKey = generateKey(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        $(`#${dateKey}`).parent().find('.plus-sign span').trigger('click');
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

    /*
    * Updates the monthly time balance.
    */
    _updateBalance()
    {
        const now = new Date();
        const monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let workingDaysToCompute = 0;
        let monthTotalWorked = '00:00';
        let countDays = false;
        let isNextDay = false;

        for (let day = 1; day <= monthLength; ++day)
        {
            const isToday = (now.getDate() === day && now.getMonth() === this._getCalendarMonth() && now.getFullYear() === this._getCalendarYear());
            // balance should consider preferences and count or not today
            if (isToday && !this._getCountToday() || isNextDay && this._getCountToday())
            {
                break;
            }
            isNextDay = isToday;

            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            const dayTotal = this._getDayTotal(this._getCalendarYear(), this._getCalendarMonth(), day);
            if (dayTotal !== undefined && dayTotal.length !== 0)
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
            balanceElement.val(balance);
            balanceElement.removeClass('text-success text-danger');
            balanceElement.addClass(isNegative(balance) ? 'text-danger' : 'text-success');
        }
        this._updateAllTimeBalance();
    }

    /*
     * Updates data displayed based on the database.
     */
    _updateBasedOnDB()
    {
        const monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let monthTotal = '00:00';
        let workingDays = 0;
        let stopCountingMonthStats = false;
        const lastDateToCount = new Date(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate());
        if (this._getCountToday())
        {
            lastDateToCount.setDate(lastDateToCount.getDate() + 1);
        }
        for (let day = 1; day <= monthLength; ++day)
        {
            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            let dayTotal = null;
            const dateKey = generateKey(this._getCalendarYear(), this._getCalendarMonth(), day);

            const waivedInfo = this._getWaiverStore(this._getCalendarYear(), this._getCalendarMonth(), day);
            if (waivedInfo !== undefined)
            {
                const waivedDayTotal = waivedInfo['hours'];
                $('#' + dateKey + ' .day-total').html(waivedDayTotal);
                dayTotal = waivedDayTotal;
            }
            else
            {
                workingDays += 1;
                this._setTableData(dateKey);
                this._colorErrorLine(dateKey);
            }

            stopCountingMonthStats |= (lastDateToCount.getDate() === day && lastDateToCount.getMonth() === this._getCalendarMonth() && lastDateToCount.getFullYear() === this._getCalendarYear());
            if (stopCountingMonthStats)
            {
                continue;
            }

            if (dayTotal)
            {
                monthTotal = sumTime(monthTotal, dayTotal);
            }
        }
        const monthDayInput = $('#month-day-input');
        if (monthDayInput)
        {
            monthDayInput.html(this._getBalanceRowPosition());
        }
        const monthWorkingDays = $('#month-working-days');
        if (monthWorkingDays)
        {
            monthWorkingDays.html(workingDays);
        }
        this._updateBalance();

        this._updateLeaveBy();
    }

    /*
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

        const dateKey = generateKey(this._getTodayYear(), this._getTodayMonth(), this._getTodayDate());
        const dayTotal = $('#' + dateKey).parent().find(' .day-total span').html();
        if (dayTotal !== undefined && dayTotal.length > 0)
        {
            const dayBalance = subtractTime(this._getHoursPerDay(), dayTotal);
            $('#leave-day-balance').html(dayBalance);
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

    _updateDayIntervals(key)
    {
        const inputs = $('#' + key + ' input[type="time"]');
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
                        $(element).closest('.row-time').prev().find('span').html(subtractTime(timeStart, timeEnd));
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
     * Updates the DB with the information of computed total lunch time and day time.
     * @param {string} dateKey
     */
    _updateTimeDay(dateKey)
    {
        // Cleaning intervals
        $('#' + dateKey + ' .interval span').html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

        const inputs = $('#' + dateKey + ' .ti input[type=\'time\']');
        const newValues = [];
        for (const element of inputs)
        {
            newValues.push(element.value);
        }

        this._updateDayIntervals(dateKey);
        this._updateDbEntry(dateKey, newValues);
        this._updateDayTotal(dateKey);
        this._colorErrorLine(dateKey);
    }

    /*
     * Updates data displayed based on the database.
     * Each row is composed of input pairs, and intervals between them.
     * Final number of entries is 2*i + (i-1), where i is the number of entry pairs for that date.
     */
    _setTableData(key)
    {
        const values = this._getStore(key);
        const inputs = $('#' + key + ' input[type="time"]');
        let i = 0;

        function indexIsInterval(index)
        {
            return index % 3 === 0;
        }

        for (const element of values)
        {
            if (indexIsInterval(i + 1))
            {
                $(this.constructor._getRowCode(key, true /*isInterval*/)).appendTo('#' + key);
                i++;
            }

            let input = inputs[i];
            if (input === undefined)
            {
                input = $(this.constructor._getRowCode(key)).appendTo('#' + key).find('input[type="time"]');
                input.val('');
            }
            $(input).val(element);

            i++;
        }

        /*
         * This means that one interval and two inputs were added.
         */
        function inputGroupFullyPrinted(index)
        {
            return index % 3 !== 2;
        }

        function lessThanThreeEntries(index)
        {
            return index < 3;
        }

        // One pair of entries is a special case in which no more entries are added
        const onlyOnePair = values.length === 2;

        while (!onlyOnePair && (lessThanThreeEntries(i) || inputGroupFullyPrinted(i)))
        {
            ++i;
            if (indexIsInterval(i))
            {
                $(this.constructor._getRowCode(key, true /*isInterval*/)).appendTo('#' + key);
            }
            else
            {
                $(this.constructor._getRowCode(key)).appendTo('#' + key).find('input[type="time"]');
            }
        }

        this._updateDayIntervals(key);
        this._updateDayTotal(key);
    }

    /*
     * Toggles the color of a row based on input error.
     */
    _colorErrorLine(key)
    {
        $('#' + key).toggleClass('error-tr', this._hasInputError(key));
    }

    /*
     * Analyze the inputs of a day, and return if there is an error.
     * An error means that an input earlier in the day is higher than one that is after it.
     */
    _hasInputError(key)
    {
        const inputs = $('#' + key + ' input[type=\'time\']');
        const newValues = [];
        for (const element of inputs)
        {
            newValues.push(element.value);
        }

        const validatedTimes = this._validateTimes(newValues, true /*removeEndingInvalids*/);
        if (validatedTimes.some(time => time === '--:--'))
        {
            return true;
        }
        for (let index = 0; index < validatedTimes.length; index++)
        {
            if (index > 0 && (validatedTimes[index - 1] >= validatedTimes[index]))
            {
                return true;
            }
        }
        return false;
    }
}

export {
    FlexibleMonthCalendar
};
