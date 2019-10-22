'use strict';

const Store = require('electron-store');
const { ipcRenderer } = require('electron');
const {
    hourMinToHourFormated,
    isNegative,
    subtractTime,
    multiplyTime,
    sumTime,
    validateTime,
    hourToMinutes
} = require('./js/time_math.js');
const { notify } = require('./js/notification.js');
const { getUserPreferences, showDay } = require('./js/UserPreferences.js');
const { applyTheme } = require('./js/Themes.js');

// Global values for calendar
const store = new Store();
const waivedWorkdays = new Store({name: 'waived-workdays'});
let preferences = getUserPreferences();
let calendar = null;

/*
 * Get nofified when preferences has been updated.
 */
ipcRenderer.on('PREFERENCE_SAVED', function (event, inputs) {
    preferences = inputs;
    calendar.redraw();
    applyTheme(preferences.theme);
});

/*
 * Returns true if the notification is enabled in preferences.
 */
function notificationIsEnabled() {
    return preferences['notification'] == 'enabled';
}

/*
 * Returns how many hours a day is set in preferences.
 */
function getHoursPerDay() {
    return preferences['hours-per-day'];
}

/*
 * Analyze the inputs of a day, and return if it has an error.
 * An error means that an input earlier in the day is higher than another.
 */
function hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd) {
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
 * Display next month of the calendar.
 */
function nextMonth() {
    calendar.nextMonth();
}

/*
 * Display previous month of the calendar.
 */
function prevMonth() {
    calendar.prevMonth();
}

/*
 * Display the current month on the calendar.
 */
function goToCurrentDate() {
    calendar.goToCurrentDate();
}

function punchDate() {
    var now = new Date(),
        year = now.getFullYear(),
        month = now.getMonth(),
        day = now.getDate(),
        hour = now.getHours(),
        min = now.getMinutes();

    if (calendar.getMonth() != month ||
        calendar.getYear() != year ||
        !showDay(year, month, day)) {
        return;
    }

    var dayStr = year + '-' + month + '-' + day + '-';
    var entry = '';
    if (document.getElementById(dayStr + 'day-end').value == '') {
        entry = 'day-end';
    }
    if (document.getElementById(dayStr + 'lunch-end').value == '') {
        entry = 'lunch-end';
    }
    if (document.getElementById(dayStr + 'lunch-begin').value == '') {
        entry = 'lunch-begin';
    }
    if (document.getElementById(dayStr + 'day-begin').value == '') {
        entry = 'day-begin';
    }
    if (entry.length <= 0) {
        return;
    }
    var value = hourMinToHourFormated(hour, min);
    document.getElementById(dayStr + entry).value = value;
    updateTimeDayCallback(dayStr + entry, value);
}

//Helds the calendar information and manipulation functions
class Calendar {
    constructor() {
        this.options = {
            weeks : [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
            weekabbrs : [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],
            months : [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
            monthabbrs : [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],
        };
        this.today = new Date();
        this.month = this.today.getMonth();
        this.year = this.today.getFullYear();
        this.workingDays = 0;
        this._initCalendar();
    }

    redraw() {
        this._initCalendar();
    }

    /*
     * Display next month.
     */
    nextMonth() {
        if (this.month == 11) {
            this.month = 0;
            this.year += 1;
        } else {
            this.month += 1;
        }
        this._initCalendar(this.month, this.year);
    }

    /*
     * Display previous month.
     */
    prevMonth() {
        if (this.month == 0) {
            this.month = 11;
            this.year -= 1;
        } else {
            this.month -= 1;
        }
        this._initCalendar(this.month, this.year);
    }

    /*
     * Go to current month.
     */
    goToCurrentDate() {
        this.month = this.today.getMonth();
        this.year = this.today.getFullYear();
        this._initCalendar(this.month, this.year);
    }

    /*
     * Display calendar defined.
     */
    _initCalendar() {
        this._generateTemplate();
        this.updateBasedOnDB();

        if (!showDay(this.today.getFullYear(), this.today.getMonth(), this.today.getDate())) {
            document.getElementById('punch-button').disabled = true;
        } else {
            document.getElementById('punch-button').disabled = false;
        }

        this.updateLeaveBy();
        $('input[type=\'time\']').on('input propertychange', function() {
            updateTimeDayCallback(this.id, this.value);
        });

        $('#punch-button').on('click', function() {
            punchDate();
        });

        $('#next-month').on('click', function() {
            nextMonth();
        });

        $('#prev-month').on('click', function() {
            prevMonth();
        });

        $('#current-month').on('click', function() {
            goToCurrentDate();
        });
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
     * Gets month length of displayed calendar.
     */
    getMonthLength() {
        var d = new Date(this.year, this.month+1, 0);
        return d.getDate();
    }

    /*
     * Updates data displayed based on the database.
     */
    _setData(key) {
        var value = '';
        if (store.has(key)) {
            value = store.get(key);
        }
        document.getElementById(key).value = value;
        return value;
    }

    updateBalance() {
        var now = new Date(),
            monthLength = this.getMonthLength(),
            workingDaysToCompute = 0,
            monthTotalWorked = '00:00';
        var countDays = false;

        for (var day = 1; day <= monthLength; ++day) {
            if (!showDay(this.year, this.month, day)) {
                continue;
            }
            var isToday = (now.getDate() == day && now.getMonth() == this.month && now.getFullYear() == this.year);
            if (isToday) {
                //balance considers only up until yesterday
                break;
            }

            var dayStr = this.year + '-' + this.month + '-' + day + '-' + 'day-total';
            var dayTotal = document.getElementById(dayStr).value;
            if (dayTotal) {
                countDays = true;
                monthTotalWorked = sumTime(monthTotalWorked, dayTotal);
            }
            if (countDays) {
                workingDaysToCompute += 1;
            }
        }
        var monthTotalToWork = multiplyTime(getHoursPerDay(), workingDaysToCompute * -1);
        var balance = sumTime(monthTotalToWork, monthTotalWorked);
        var balanceElement = document.getElementById('month-balance');
        if (balanceElement)
        {
            balanceElement.value = balance;
            balanceElement.classList.remove('text-success', 'text-danger');
            balanceElement.classList.add(isNegative(balance) ? 'text-danger' : 'text-success');
        }
    }

    /*
     * Updates data displayed based on the database.
     */
    updateBasedOnDB() {
        var monthLength = this.getMonthLength();
        var monthTotal = '00:00';
        this.workingDays = 0;
        for (var day = 1; day <= monthLength; ++day) {
            if (!showDay(this.year, this.month, day)) {
                continue;
            }

            var isToday = (this.today.getDate() == day && this.today.getMonth() == this.month && this.today.getFullYear() == this.year);
            if (isToday) {
                break;
            }
            this.workingDays += 1;

            var currentDay = new Date(this.year, this.month, day),
                dateStr = currentDay.toISOString().substr(0, 10);

            var dayStr = this.year + '-' + this.month + '-' + day + '-';
            if (waivedWorkdays.has(dateStr)) {
                var waivedInfo = waivedWorkdays.get(dateStr);
                var waivedDayTotal = waivedInfo['hours'];
                document.getElementById(dayStr + 'day-total').value = waivedDayTotal;
                monthTotal = sumTime(monthTotal, waivedDayTotal);
            } else {
                var lunchBegin = this._setData(dayStr + 'lunch-begin');
                var lunchEnd = this._setData(dayStr + 'lunch-end');
                /*var lunchTotal = */this._setData(dayStr + 'lunch-total');
                var dayBegin = this._setData(dayStr + 'day-begin');
                var dayEnd = this._setData(dayStr + 'day-end');
                var dayTotal = this._setData(dayStr + 'day-total');

                if (dayTotal) {
                    monthTotal = sumTime(monthTotal, dayTotal);
                }

                colorErrorLine(this.year, this.month, day, dayBegin, lunchBegin, lunchEnd, dayEnd);
            }
        }
        var monthDayInput = document.getElementById('month-day-input');
        if (monthDayInput)
        {
            monthDayInput.value = this._getValidPreviousDay();
        }
        var monthDayTotal = document.getElementById('month-total');
        if (monthDayTotal)
        {
            monthDayTotal.value = monthTotal;
        }
        var monthWorkingDays = document.getElementById('month-working-days');
        if (monthWorkingDays)
        {
            monthWorkingDays.value = this.workingDays;
        }
        this.updateBalance();

        this.updateLeaveBy();
    }

    /*
     * Update field time to leave
     */
    updateLeaveBy() {
        if (!showDay(this.today.getFullYear(), this.today.getMonth(), this.today.getDate()) ||
            this.today.getMonth() != this.getMonth() ||
            this.today.getFullYear() != this.getYear()) {
            return;
        }
        var [dayBegin, lunchBegin, lunchEnd, dayEnd] = getDaysEntriesFromHTML(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
        var dayKey = this.today.getFullYear() + '-' + this.today.getMonth() + '-' + this.today.getDate() + '-';
        if (validateTime(dayBegin)) {
            var leaveBy = sumTime(dayBegin, getHoursPerDay());
            var lunchTotal = document.getElementById(dayKey + 'lunch-total').value;
            if (lunchTotal) {
                leaveBy = sumTime(leaveBy, lunchTotal);
            }
            document.getElementById('leave-by').value = leaveBy <= '23:59' ? leaveBy : '--:--';
        } else {
            document.getElementById('leave-by').value = '';
        }

        if (dayBegin.length && lunchBegin.length && lunchEnd.length && dayEnd.length) {
            //All entries computed
            document.getElementById('punch-button').disabled = true;
        } else {
            document.getElementById('punch-button').disabled = false;
        }
    }

    /*
     * Generates the calendar HTML view
     */
    _generateTemplate() {
        var body = this._getBody();
        document.getElementById('calendar').innerHTML = body;
    }

    /*
     * Returns the time input html code of a date
     */
    static _getInputCode (year, month, day, type) {
        var idTag = year + '-' + month + '-' + day + '-' + type;

        return '<input type="time" id="' + idTag + '"' +
               (type.endsWith('total') ? ' disabled' : '') +
               '>';

    }

    /*
     * Returns the total field html code of a date
     */
    static _getTotalCode (year, month, day, type) {
        return '<input type="text" class="total-input" id="' +
               year + '-' + month + '-' + day + '-' + type +
               '" size="5"' +
               (type.endsWith('total') ? ' disabled' : '') +
               '>';
    }

    /*
     * Returns the summary field html code
     */
    static _getSummaryRowCode () {
        var leaveByCode = '<input type="text" id="leave-by" size="5" disabled>';
        var summaryStr = 'Based on the time you arrived today, you should leave by';
        var code = '<tr class="summary">' +
                     '<td class="leave-by-text" colspan="7">' + summaryStr + '</td>' +
                     '<td class="leave-by-time">' + leaveByCode + '</td>' +
                   '</tr>';
        return code;
    }
    
    /*
     * Returns the html code for the row with workng days, month total and balance
     */
    static _getBalanceRowCode () {
        return '<tr>' +
              '<tr class="month-total-row">' +
                  '<td class="month-total-text" title="Last day used for balance">On</td>' +
                  '<td class="month-total-time" title="Last day used for balance"><input type="text" id="month-day-input" size="2" disabled></td>' +
                  '<td class="month-total-text" title="How many working days there\'s in the month">Working days</td>' +
                  '<td class="month-total-time" title="How many working days there\'s in the month"><input type="text" id="month-working-days" size="5" disabled></td>' +
                  '<td class="month-total-text" title="How many hours you logged in this month">Month Sum</td>' +
                  '<td class="month-total-time" title="How many hours you logged in this month"><input type="text" id="month-total" size="8" disabled></td>' +
                  '<td class="month-total-text" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month).">Month Balance</td>' +
                  '<td class="month-total-time" title="Balance up until today for this month. A positive balance means extra hours you don\'t need to work today (or the rest of the month)."><input type="text" id="month-balance" size="8" disabled></td>' +
                '</tr>' +
            '</tr>';
    }

    /*
     * Returns the code of a calendar row
     */
    _getInputsRowCode (year, month, day, lastValidDay) {
        var currentDay = new Date(year, month, day),
            weekDay = currentDay.getDay(),
            today = new Date(),
            isToday = (today.getDate() == day && today.getMonth() == month && today.getFullYear() == year),
            trID = ('tr-' + year + '-' + month + '-' + day),
            dateStr = currentDay.toISOString().substr(0, 10);

        if (!showDay(year, month, day)) {
            if (preferences['hide-non-working-days']) {
                return '';
            }
            else {
                return  '<tr'+ (isToday ? ' class="today-non-working"' : '') + ' id="' + trID + '">' +
                        '<td class="weekday ti">' + this.options.weekabbrs[weekDay] + '</td>' +
                        '<td class="day ti">' + day + '</td>' +
                        '<td class="day non-working-day" colspan="6">' + '</td>' +
                    '</tr>\n';
            }
        }

        if (waivedWorkdays.has(dateStr)) {
            var waivedInfo = waivedWorkdays.get(dateStr);
            var summaryStr = '<b>Waived day: </b>' + waivedInfo['reason'];
            var waivedLineHtmlCode =
                 '<tr'+ (isToday ? ' class="isToday"' : '') + ' id="' + trID + '">' +
                    '<td class="weekday ti">' + this.options.weekabbrs[weekDay] + '</td>' +
                    '<td class="day ti">' + day + '</td>' +
                    '<td class="waived-day-text" colspan="5">' + summaryStr + '</td>' +
                    '<td class="ti ti-total">' + Calendar._getTotalCode(year, month, day, 'day-total') + '</td>' +
                '</tr>\n';
            return waivedLineHtmlCode;
        } 

        var htmlCode =
                 '<tr'+ (isToday ? ' class="isToday"' : '') + ' id="' + trID + '">' +
                    '<td class="weekday ti">' + this.options.weekabbrs[weekDay] + '</td>' +
                    '<td class="day ti">' + day + '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'day-begin') + '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'lunch-begin') + '</td>' +
                    '<td class="ti ti-total">' + Calendar._getTotalCode(year, month, day, 'lunch-total') + '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'lunch-end') + '</td>' +
                    '<td class="ti">' + Calendar._getInputCode(year, month, day, 'day-end') + '</td>' +
                    '<td class="ti ti-total">' + Calendar._getTotalCode(year, month, day, 'day-total') + '</td>' +
                '</tr>\n';

        if (day == lastValidDay) {
            htmlCode += Calendar._getBalanceRowCode();
        }

        if (isToday) {
            htmlCode += Calendar._getSummaryRowCode();
        }

        return htmlCode;
    }

    /*
     * Returns the header of the page, with the image, name and a message.
     */
    _getPageHeader (year, month) {
        var todayBut = '<input id="current-month" type="image" src="assets/calendar.svg" alt="Current Month" title="Go to Current Month" height="24" width="24"></input>';
        var leftBut = '<input id="prev-month" type="image" src="assets/left-arrow.svg" alt="Previous Month" height="24" width="24"></input>';
        var ritghBut = '<input id="next-month" type="image" src="assets/right-arrow.svg" alt="Next Month" height="24" width="24"></input>';
        return '<div class="title-header">'+
                    '<div class="title-header title-header-img"><img src="assets/timer.svg" height="64" width="64"></div>' +
                    '<div class="title-header title-header-text">Time To Leave</div>' +
                    '<div class="title-header title-header-msg"></div>' +
               '</div>' +
                '<table class="table-header"><tr>' +
                    '<th class="th but-left">' + leftBut + '</th>' +
                    '<th class="th th-month-name" colspan="18"><div class="div-th-month-name" id="month-year">' + this.options.months[month] + ' ' + year + '</div></th>' +
                    '<th class="th but-right">' + ritghBut + '</th>' +
                    '<th class="th but-today">' + todayBut + '</th>' +
                '</tr></table>';
    }

    /*
     * Returns the code of the header of the calendar table
     */
    _getTableHeaderCode () {
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
    _getValidPreviousDay() {
        var lastValidDay = 0;
        for (var day = 1; day < this.today.getDate(); ++day) {
            if (showDay(this.year, this.month, day)) {
                lastValidDay = day;
            }
        }
        
        return lastValidDay;
    }

    /*
     * Returns the code of the body of the page.
     */
    _getBody() {
        var monthLength = this.getMonthLength();
        var html = '<div>';
        html += this._getPageHeader(this.year, this.month);
        html += '<table class="table-body">';
        html += this._getTableHeaderCode();
        var lastValidDay = this._getValidPreviousDay();
        
        for (var day = 1; day <= monthLength; ++day) {
            html += this._getInputsRowCode(this.year, this.month, day, lastValidDay);
        }
        html += '</table><br>';
        html += '</div>';

        return html;
    }
}

/*
 * Returns the entries for the day.
 */
function getDaysEntries(year, month, day) {
    var dayStr = year + '-' + month + '-' + day + '-';
    return [store.get(dayStr + 'day-begin'),
        store.get(dayStr + 'lunch-begin'),
        store.get(dayStr + 'lunch-end'),
        store.get(dayStr + 'day-end')];
}

/*
 * Returns the entries for the day, from HTML (for performance).
 */
function getDaysEntriesFromHTML(year, month, day) {
    var dayStr = year + '-' + month + '-' + day + '-';
    return [document.getElementById(dayStr + 'day-begin').value,
        document.getElementById(dayStr + 'lunch-begin').value,
        document.getElementById(dayStr + 'lunch-end').value,
        document.getElementById(dayStr + 'day-end').value];
}

function colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd) {
    var trID = ('tr-' + year + '-' + month + '-' + day);
    if (hasInputError(dayBegin, lunchBegin, lunchEnd, dayEnd)) {
        document.getElementById(trID).classList.add('error-tr');
    } else if (document.getElementById(trID).classList.contains('error-tr')) {
        document.getElementById(trID).classList.remove('error-tr');
    }
}

/*
 * Updates the DB with the information of computed (total lunch time, and day time)
 */
function updateTimeDay(year, month, day, key, newValue) {
    var baseStr = year + '-' + month + '-' + day + '-';
    var dayStr = baseStr + key;
    var oldValue = store.get(dayStr);

    if (validateTime(newValue)) {
        //update db
        store.set(dayStr, newValue);
    } else {
        if (oldValue && validateTime(oldValue)) {
            store.delete(dayStr);
            //remve entry from db
        }
    }

    var oldDayTotal = store.get(baseStr + 'day-total');

    //update totals
    var [dayBegin, lunchBegin, lunchEnd, dayEnd] = getDaysEntries(year, month, day);

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
        store.set(baseStr + 'lunch-total', lunchTime);
    } else {
        store.delete(baseStr + 'lunch-total');
    }
    document.getElementById(baseStr + 'lunch-total').value = lunchTime;

    if (dayTotal.length > 0) {
        store.set(baseStr + 'day-total', dayTotal);
    } else {
        store.delete(baseStr + 'day-total');
    }
    document.getElementById(baseStr + 'day-total').value = dayTotal;

    var displayedMonthTotal = document.getElementById('month-total').value;
    var currentMonthTotal = displayedMonthTotal;
    if (validateTime(oldDayTotal)) {
        currentMonthTotal = subtractTime(oldDayTotal, currentMonthTotal);
    }
    if (dayTotal.length > 0) {
        currentMonthTotal = sumTime(currentMonthTotal, dayTotal);
    }
    document.getElementById('month-total').value = currentMonthTotal;

    colorErrorLine(year, month, day, dayBegin, lunchBegin, lunchEnd, dayEnd);
}

/*
 * Based on the key of the input, updates the values for total in db and display it on page
 */
function updateTimeDayCallback(key, value) {
    var [year, month, day, stage, step] = key.split('-');
    var fieldKey = stage + '-' + step;
    updateTimeDay(year, month, day, fieldKey, value);
    calendar.updateLeaveBy();
    calendar.updateBalance();
}

/*
 * Notify user if it's time to leave
 */
function notifyTimeToLeave() {
    if (!notificationIsEnabled() || document.getElementById('leave-by') == null) {
        return;
    }

    var timeToLeave = document.getElementById('leave-by').value;
    if (validateTime(timeToLeave)) {
        /**
         * How many minutes should pass before the Time-To-Leave notification should be presented again.
         * @type {number} Minutes post the clockout time
         */
        const notificationInterval = 5;
        var now = new Date();
        var curTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        // Let check if it's past the time to leave, and the minutes line up with the interval to check
        var minutesDiff = hourToMinutes(subtractTime(timeToLeave, curTime));
        var isRepeatingInterval = curTime > timeToLeave && (minutesDiff % notificationInterval == 0);

        if (curTime == timeToLeave || isRepeatingInterval) {
            notify('Hey there! I think it\'s time to leave.');
        }
    }
}

// On page load, create the calendar and setup notification
$(() => {
    calendar = new Calendar();
    setInterval(notifyTimeToLeave, 60000);
    let prefs = getUserPreferences();
    applyTheme(prefs.theme);
});
