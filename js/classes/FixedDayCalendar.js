'use strict';

const { ipcRenderer } = require('electron');
const {
    isNegative,
    multiplyTime,
    sumTime
} = require('../time-math.js');
const { getDateStr, getMonthLength } = require('../date-aux.js');
const { Calendar } = require('./Calendar.js');
const { generateKey } = require('../date-db-formatter');
const i18n = require('../../src/configs/i18next.config.js');

class FixedDayCalendar extends Calendar
{
    /**
    * @param {Object.<string, any>} preferences
    */
    constructor(preferences)
    {
        super(preferences);
    }

    /*
    * Display calendar defined.
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

    /*
     * Generates the calendar HTML view.
     */
    _generateTemplate()
    {
        let body = this._getBody();
        $('#calendar').html(body);
        $('html').attr('data-view', 'day');
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    static _getPageHeader()
    {
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
    _getBody()
    {
        let html = '<div>';
        html += this.constructor._getPageHeader();
        html += '<div id="calendar-table-body">';
        html += '</div>';

        return html;
    }

    /*
     * Returns the summary field HTML code.
     */
    static _getSummaryRowCode()
    {
        let leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        let summaryStr = i18n.t('$FixedDayCalendar.leave-by');
        let code = '<div class="summary" id="summary-unfinished-day">' +
                     '<div class="leave-by-text">' + summaryStr + '</div>' +
                     '<div class="leave-by-time">' + leaveByCode + '</div>' +
                   '</div>';
        let finishedSummaryStr = i18n.t('$FixedDayCalendar.all-done');
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
    static _getBalanceRowCode()
    {
        return '<div class="month-total-row">' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        `<div class="month-total-text month-balance" title="${i18n.t('$FixedDayCalendar.month-balance-title')}">${i18n.t('$FixedDayCalendar.month-balance')}</div>` +
                        `<div class="month-total-time month-balance-time" title="${i18n.t('$FixedDayCalendar.month-balance-title')}"><span type="text" id="month-balance"></div>` +
                    '</div>' +
                    '</div>' +
                    '<div class="half-width">' +
                    '<div class="month-total-element">' +
                        `<div class="month-total-text month-sum" title="${i18n.t('$FixedDayCalendar.overall-balance-title')}">${i18n.t('$FixedDayCalendar.overall-balance')}</div>` +
                        `<div class="month-total-time month-sum-time" title="${i18n.t('$FixedDayCalendar.overall-balance-title')}"><span id="overall-balance"></div>` +
                    '</div>' +
                    '</div>' +
                '</div>';
    }

    /*
     * Returns the code of the table body of the calendar.
     */
    _generateTableBody()
    {
        return this._getInputsRowCode(this._getCalendarYear(), this._getCalendarMonth(), this._getCalendarDate()) + this.constructor._getBalanceRowCode();
    }

    _getInputsRowCode(year, month, day)
    {
        let today = new Date(),
            isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year),
            trID = ('tr-' + generateKey(year, month, day));

        if (!this._showDay(year, month, day))
        {
            return '<div class="today-non-working" id="' + trID + '">' +
                        `<div class="non-working-day">${i18n.t('$FixedDayCalendar.non-working-day')}</div>` +
                    '</div>\n';
        }

        let waivedInfo = this._getWaiverStore(day, month, year);
        if (waivedInfo !== undefined)
        {
            let summaryStr = `<b>${i18n.t('$FixedDayCalendar.waived-day')}: </b>` + waivedInfo['reason'];
            let waivedLineHtmlCode =
                 '<div class="row-waiver" id="' + trID + '">' +
                    '<div class="waived-day-text" colspan="5">' + summaryStr + '</div>' +
                    '<div class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'day-total') + '</div>' +
                '</div>\n';
            return waivedLineHtmlCode;
        }

        let htmlCode =
                '<div class="row-time">' +
                    `<div class="th th-label" colspan="4">${i18n.t('$FixedDayCalendar.day-start')}</div>` +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'day-begin') + '</div>' +
                '</div>' +
                '<div class="row-time">' +
                    `<div class="th th-label" colspan="4">${i18n.t('$FixedDayCalendar.lunch-begin')}</div>` +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'lunch-begin') + '</div>' +
                '</div>' +
                '<div class="row-time">' +
                    `<div class="th th-label" colspan="4">${i18n.t('$FixedDayCalendar.lunch-end')}</div>` +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'lunch-end') + '</div>' +
                '</div>' +
                '<div class="row-time">' +
                    `<div class="th th-label" colspan="4">${i18n.t('$FixedDayCalendar.day-end')}</div>` +
                    '<div class="ti" colspan="4">' + this.constructor._getInputCode(year, month, day, 'day-end') + '</div>' +
                '</div>' +
                '<div class="row-total">' +
                    `<div class="th th-label th-label-total" colspan="3">${i18n.t('$FixedDayCalendar.lunch-total')}</div>` +
                    '<div class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'lunch-total') + '</div>' +
                    `<div class="th th-label th-label-total" colspan="3">${i18n.t('$FixedDayCalendar.day-total')}</div>` +
                    '<div class="ti ti-total">' + this.constructor._getTotalCode(year, month, day, 'day-total') + '</div>' +
                '</div>\n';

        if (isToday)
        {
            htmlCode += this.constructor._getSummaryRowCode();
        }

        return htmlCode;
    }

    /*
     * Updates the code of the table header of the calendar, to be called on demand.
     */
    _updateTableHeader()
    {
        let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let today = this._calendarDate;
        $('#header-date').html(today.toLocaleDateString(undefined, options));
        $('#input-calendar-date').val(getDateStr(today));
    }

    /*
     * Display next day.
     */
    _nextDay()
    {
        this._changeDay(1);
    }

    /*
     * Display previous day.
     */
    _prevDay()
    {
        this._changeDay(-1);
    }

    /*
     * Go to current day.
     */
    _goToCurrentDate()
    {
        this._goToDate(new Date());
    }

    /**
    * Returns if Calendar date agrees with parameter date.
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

    /*
     * Draws elements of the Calendar that depend on data.
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

    /*
    * Updates the monthly time balance.
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

            let dayTotal = this._getDayTotal(day, this._getCalendarMonth(), this._getCalendarYear());
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

    /*
     * Updates data displayed based on the database.
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

            let dayStr = this._getCalendarYear() + '-' + this._getCalendarMonth() + '-' + day + '-';

            if (day === this._getCalendarDate())
            {
                let waivedInfo = this._getWaiverStore(day, this._getCalendarMonth(), this._getCalendarYear());
                if (waivedInfo !== undefined)
                {
                    let waivedDayTotal = waivedInfo['hours'];
                    $('#' + dayStr + 'day-total').val(waivedDayTotal);
                }
                else
                {
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
    FixedDayCalendar
};
