'use strict';

const {
    isNegative,
    multiplyTime,
    subtractTime,
    sumTime,
    validateTime
} = require('../time-math.js');
const { getMonthLength } = require('../date-aux.js');
const { generateKey } = require('../date-db-formatter.js');
const {
    formatDayId,
    displayWaiverWindow
} = require('../workday-waiver-aux.js');
const { showDialog } = require('../window-aux.js');
const { getDayAbbr } = require('../date-to-string-util.js');
const { BaseCalendar } = require('./BaseCalendar.js');
const i18n = require('../../src/configs/i18next.config.js');

class FlexibleMonthCalendar extends BaseCalendar
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

    /*
     * Generates the calendar HTML view.
     */
    _generateTemplate()
    {
        let body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'flexible');
    }

    /*
     * Returns the template code of the body of the page.
     */
    _getBody()
    {
        let html = this.constructor._getPageHeader();
        html += this.constructor._getTableHeaderCode();
        html += '<div id="calendar-table-body">';
        html += '</div>';

        return html;
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    static _getPageHeader()
    {
        let switchView = `<input id="switch-view" type="image" src="assets/switch.svg" alt="${i18n.t('$BaseCalendar.switch-view')}" title="${i18n.t('$BaseCalendar.switch-view')}" height="24" width="24"></input>`;
        let todayBut = `<input id="current-month" type="image" src="assets/calendar.svg" alt="${i18n.t('$FlexibleMonthCalendar.current-month')}" title="${i18n.t('$FlexibleMonthCalendar.current-month')}" height="24" width="24"></input>`;
        let leftBut = `<input id="prev-month" type="image" src="assets/left-arrow.svg" alt="${i18n.t('$FlexibleMonthCalendar.previous-month')}" height="24" width="24"></input>`;
        let rightBut = `<input id="next-month" type="image" src="assets/right-arrow.svg" alt="${i18n.t('$FlexibleMonthCalendar.next-month')}" height="24" width="24"></input>`;
        return '<div class="title-header">'+
                    '<div class="title-header title-header-img"><img src="assets/timer.svg" height="64" width="64"></div>' +
                    `<div class="title-header title-header-text">${i18n.t('$BaseCalendar.time-to-leave')}</div>` +
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
    static _getTableHeaderCode()
    {
        return '<div class="calendar-table-header">' +
                    `<div class="header-day">${i18n.t('$FlexibleMonthCalendar.day')}</div>` +
                    `<div class="header-day-total">${i18n.t('$FlexibleMonthCalendar.total')}</div>` +
                '</div>\n';
    }

    /*
     * Returns the summary field HTML code.
     */
    static _getSummaryRowCode()
    {
        let leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        return  '<div class="summary" id="summary-unfinished-day">' +
                    `<div class="leave-by-text" colspan="7">${i18n.t('$FlexibleMonthCalendar.leave-by')}</div>` +
                    '<div class="leave-by-time">' +
                        leaveByCode +
                    '</div>' +
                '</div>' +
                '<div class="summary hidden" id="summary-finished-day">' +
                    `<div class="leave-by-text" colspan="7">${i18n.t('$BaseCalendar.day-done-balance')}</div>` +
                    '<div class="leave-by-time">' +
                        '<div id="leave-day-balance"></div>' +
                    '</div>' +
                '</div>';
    }

    /*
     * Returns the HTML code for the row with working days, month total and balance.
     */
    static _getBalanceRowCode()
    {
        return '<div class="month-total-row">' +
                    `<div class="month-total-text" title="${i18n.t('$FlexibleMonthCalendar.last-day-balance')}">${i18n.t('$FlexibleMonthCalendar.on')}</div>` +
                    `<div class="month-total-time" title="${i18n.t('$FlexibleMonthCalendar.last-day-balance')}"><span id="month-day-input"></span></div>` +
                    `<div class="month-total-text" title="${i18n.t('$FlexibleMonthCalendar.working-days-title')}">${i18n.t('$FlexibleMonthCalendar.working-days')}</div>` +
                    `<div class="month-total-time" title="${i18n.t('$FlexibleMonthCalendar.working-days-title')}"><span id="month-working-days"></span></div>` +
                    `<div class="month-total-text" title="${i18n.t('$BaseCalendar.month-balance-title')}">${i18n.t('$BaseCalendar.month-balance')}</div>` +
                    `<div class="month-total-time" title="${i18n.t('$BaseCalendar.month-balance-title')}"><input type="text" id="month-balance"     size="8" disabled></div>` +
                    `<div class="month-total-text" title="${i18n.t('$BaseCalendar.overall-balance-title')}">${i18n.t('$BaseCalendar.overall-balance')}</div>` +
                    `<div class="month-total-time" title="${i18n.t('$BaseCalendar.overall-balance-title')}"><input type="text" id="overall-balance" size="8" placeholder="..." disabled></div>` +
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
        let currentDay = new Date(year, month, day),
            weekDay = currentDay.getDay();
        let today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            dateKey = generateKey(year, month, day);

        if (!this._showDay(year, month, day))
        {
            return '<div><div class="weekday">' + getDayAbbr(weekDay) + '</div>' +
                    '<div class="day">' +
                        '<span class="day-number"> ' + day + ' </span>' +
                    '</div>' +
                    '<div class="non-working-day" id="' + dateKey + '">' +
                    '</div></div>\n';
        }

        let waivedInfo = this._getWaiverStore(year, month, day);
        if (waivedInfo !== undefined)
        {
            let summaryStr = `<b>${i18n.t('$FlexibleMonthCalendar.waived-day')}: </b>` + waivedInfo['reason'];
            let waivedLineHtmlCode =
                '<div class="row-waiver" id="' + dateKey + '">' +
                    '<div class="weekday">' + getDayAbbr(weekDay) + '</div>' +
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
                `<div class="weekday waiver-trigger" title="${i18n.t('$FlexibleMonthCalendar.add-waiver-day')}">` + getDayAbbr(weekDay) + '</div>' +
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

        if (isToday)
        {
            htmlCode += this.constructor._getSummaryRowCode();
        }

        return htmlCode;
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
            let moreThree =
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

        function removeEntries(element)
        {
            const row = $(element).find('.row-time');
            if (row.length > 3)
            {
                const dateKey = $(element).attr('id');
                const removeEntriesDialogOptions = {
                    title: `${i18n.t('$FlexibleMonthCalendar.remove-entry')}`,
                    message: `${i18n.t('$FlexibleMonthCalendar.entry-removal-confirmation')} ${dateKey}?`,
                    type: 'info',
                    buttons: [i18n.t('$FlexibleMonthCalendar.yes'), i18n.t('$FlexibleMonthCalendar.no')]
                };
                showDialog(removeEntriesDialogOptions, (result) =>
                {
                    const buttonId = result.response;
                    if (buttonId === 1)
                    {
                        return;
                    }
                    const sliceNum = row.length === 6 ? -1 : (row.length === 7 ? -2 : -3);
                    row.slice(sliceNum).remove();
                    calendar._updateTimeDay($(element).attr('id'));
                    toggleArrowColor(element);
                    toggleMinusSign(element);
                });
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
            if (isToday && !this._getCountToday() || isNextDay && this._getCountToday())
            {
                break;
            }
            isNextDay = isToday;

            if (!this._showDay(this._getCalendarYear(), this._getCalendarMonth(), day))
            {
                continue;
            }

            const dateKey = generateKey(this._getCalendarYear(), this._getCalendarMonth(), day);
            let dayTotal = $('#' + dateKey).parent().find('.day-total span').html();
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
    _updateBasedOnDB()
    {
        let monthLength = getMonthLength(this._getCalendarYear(), this._getCalendarMonth());
        let monthTotal = '00:00';
        let workingDays = 0;
        let stopCountingMonthStats = false;
        let lastDateToCount = new Date(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate());
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

            let waivedInfo = this._getWaiverStore(this._getCalendarYear(), this._getCalendarMonth(), day);
            if (waivedInfo !== undefined)
            {
                let waivedDayTotal = waivedInfo['hours'];
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
        let monthDayInput = $('#month-day-input');
        if (monthDayInput)
        {
            monthDayInput.html(this._getBalanceRowPosition());
        }
        let monthWorkingDays = $('#month-working-days');
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
        let newValues = [];
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
        const onlyOnePair = values.length == 2;

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
        let inputs = $('#' + key + ' input[type=\'time\']');
        let newValues = [];
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

module.exports = {
    FlexibleMonthCalendar
};
