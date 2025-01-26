'use strict';

import '../../../__mocks__/jquery.mjs';

import assert from 'assert';
import { spy, stub } from 'sinon';
import Store from 'electron-store';

import { BaseCalendar } from '../../../renderer/classes/BaseCalendar.js';
import { generateKey } from '../../../js/date-db-formatter.mjs';
import {
    getUserPreferences,
    resetPreferences,
    savePreferences,
    showDay,
    switchCalendarView
} from '../../../js/user-preferences.mjs';
import TimeBalance from '../../../js/time-balance.mjs';
import { calendarApi } from '../../../renderer/preload-scripts/calendar-api.mjs';

import TimeMath from '../../../js/time-math.mjs';

const $_backup = global.$;

describe('BaseCalendar.js', () =>
{
    class ExtendedClass extends BaseCalendar
    {
        constructor(preferences, languageData)
        {
            super(preferences, languageData);
        }
    }

    /**
     * @type {{[key: string]: sinon.spy|sinon.stub}}
     */
    const mocks = {};
    beforeEach(() =>
    {
        const calendarStore = new Store({name: 'flexible-store'});
        calendarStore.clear();
        const waivedWorkdays = new Store({name: 'waived-workdays'});
        waivedWorkdays.clear();
        ExtendedClass.prototype._initCalendar = () => {};
        ExtendedClass.prototype._getTargetDayForAllTimeBalance = () => {};

        // Mocked APIs from the preload script of the calendar window
        window.calendarApi = calendarApi;
        window.rendererApi = {};

        window.calendarApi.computeAllTimeBalanceUntilPromise = (targetDate) =>
        {
            return TimeBalance.computeAllTimeBalanceUntilAsync(targetDate);
        };

        window.calendarApi.switchView = () =>
        {
            switchCalendarView();
        };

        window.calendarApi.getStoreContents = () =>
        {
            return new Promise((resolve) =>
            {
                resolve(calendarStore.store);
            });
        };
        window.rendererApi.getWaiverStoreContents = () =>
        {
            return new Promise((resolve) =>
            {
                resolve(waivedWorkdays.store);
            });
        };
        window.calendarApi.setStoreData = (key, contents) =>
        {
            calendarStore.set(key, contents);
            return new Promise((resolve) =>
            {
                resolve(true);
            });
        };
        window.rendererApi.showDay = showDay;
    });

    describe('constructor', () =>
    {
        it('Should not build with default values', () =>
        {
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            delete ExtendedClass.prototype._initCalendar;
            delete ExtendedClass.prototype._getTargetDayForAllTimeBalance;
            assert.throws(() => new ExtendedClass(preferences, languageData), /Please implement this\.$/);
        });

        it('Should not run _getTargetDayForAllTimeBalance with default values', () =>
        {
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            delete ExtendedClass.prototype._getTargetDayForAllTimeBalance;
            assert.throws(() => new ExtendedClass(preferences, languageData)._getTargetDayForAllTimeBalance(), /Please implement this\.$/);
        });

        it('Should build with default values', async(done) =>
        {
            ExtendedClass.prototype._initCalendar = () => { done(); };
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            assert.strictEqual(calendar._calendarDate instanceof Date, true);
            assert.strictEqual(calendar._languageData, languageData);
            assert.strictEqual(calendar._preferences, preferences);

            // These no longer get set in the constructor
            assert.strictEqual(calendar._internalStore, undefined);
            assert.strictEqual(calendar._internalWaiverStore, undefined);

            // But are set after awaiting for initialization
            await calendar.initializeStores();
            assert.strictEqual(calendar._internalStore, {});
            assert.strictEqual(calendar._internalWaiverStore, {});
        });

        it('Should build with default internal store values', async(done) =>
        {
            ExtendedClass.prototype._initCalendar = () => { done(); };
            const calendarStore = new Store({name: 'flexible-store'});
            calendarStore.set('flexible', 'store');

            const waivedWorkdays = new Store({name: 'waived-workdays'});
            waivedWorkdays.set('2022-01-01', {
                reason: 'dismiss',
                hours: '10:00'
            });

            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            assert.strictEqual(calendar._calendarDate instanceof Date, true);
            assert.strictEqual(calendar._languageData, languageData);
            assert.strictEqual(calendar._preferences, preferences);

            // These no longer get set in the constructor
            assert.strictEqual(calendar._internalStore, undefined);
            assert.strictEqual(calendar._internalWaiverStore, undefined);

            // But are set after awaiting for initialization
            await calendar.initializeStores();
            assert.strictEqual(calendar._internalStore, {
                flexible: 'store'
            });
            assert.strictEqual(calendar._internalWaiverStore, {
                '2022-01-01': {
                    reason: 'dismiss',
                    hours: '10:00'
                }
            });
        });
    });

    describe('_updateAllTimeBalance', () =>
    {
        it('Should not update value because of no implementation', () =>
        {
            delete ExtendedClass.prototype._getTargetDayForAllTimeBalance;
            mocks._computeAllTimeBalanceUntilAsyn = stub(TimeBalance, 'computeAllTimeBalanceUntilAsync').resolves();
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            assert.throws(() => calendar._updateAllTimeBalance(), /Please implement this\.$/);
            assert.strictEqual(TimeBalance.computeAllTimeBalanceUntilAsync.notCalled, true);
        });

        it('Should not update value because of rejection', () =>
        {
            stub(console, 'log');
            mocks._computeAllTimeBalanceUntilAsyn = stub(TimeBalance, 'computeAllTimeBalanceUntilAsync').rejects('Error');
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            calendar._updateAllTimeBalance();
            assert.strictEqual(TimeBalance.computeAllTimeBalanceUntilAsync.calledOnce, true);

            // When the rejection happens, we call console.log with the error value
            setTimeout(() =>
            {
                assert.strictEqual(console.log.calledOnce, true);
                console.log.restore();
            }, 100);
        });

        it('Should not update value because no overall-balance element', () =>
        {
            global.$ = () => false;
            mocks._computeAllTimeBalanceUntilAsyn = stub(TimeBalance, 'computeAllTimeBalanceUntilAsync').resolves('2022-02-31');
            mocks._isNegative = stub(TimeMath, 'isNegative').returns(true);
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            calendar._updateAllTimeBalance();
            assert.strictEqual(TimeMath.isNegative.notCalled, true);
            assert.strictEqual(TimeBalance.computeAllTimeBalanceUntilAsync.calledOnce, true);
        });

        it('Should update value with text-danger class', (done) =>
        {
            $('body').append('<span id="overall-balance" value="12:12">12:12</span>');
            $('#overall-balance').val('12:12');
            mocks._computeAllTimeBalanceUntilAsyn = stub(TimeBalance, 'computeAllTimeBalanceUntilAsync').resolves('2022-02-31');
            mocks._isNegative = stub(TimeMath, 'isNegative').returns(true);
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            calendar._updateAllTimeBalance();
            setTimeout(() =>
            {
                assert.strictEqual(TimeBalance.computeAllTimeBalanceUntilAsync.calledOnce, true);
                assert.strictEqual($('#overall-balance').val(), '2022-02-31');
                assert.strictEqual($('#overall-balance').hasClass('text-danger'), true);
                assert.strictEqual($('#overall-balance').hasClass('text-success'), false);
                done();
            }, 50);
        });

        it('Should update value with text-success class', (done) =>
        {
            $('body').append('<span class="text-success text-danger" id="overall-balance" value="12:12">12:12</span>');
            $('#overall-balance').val('12:12');
            mocks._computeAllTimeBalanceUntilAsyn = stub(TimeBalance, 'computeAllTimeBalanceUntilAsync').resolves('2022-02-31');
            mocks._isNegative = stub(TimeMath, 'isNegative').returns(false);
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            calendar._updateAllTimeBalance();
            setTimeout(() =>
            {
                assert.strictEqual(TimeBalance.computeAllTimeBalanceUntilAsync.calledOnce, true);
                assert.strictEqual($('#overall-balance').val(), '2022-02-31');
                assert.strictEqual($('#overall-balance').hasClass('text-danger'), false);
                assert.strictEqual($('#overall-balance').hasClass('text-success'), true);
                done();
            }, 50);
        });

    });

    describe('_addTodayEntries', () =>
    {
        it('Should throw error', () =>
        {
            assert.throws(() => new ExtendedClass({}, {})._addTodayEntries(), /Please implement this\.$/);
        });
    });

    describe('refreshOnDayChange', () =>
    {
        it('Should throw error', () =>
        {
            assert.throws(() => new ExtendedClass({}, {}).refreshOnDayChange(), /Please implement this\.$/);
        });
    });

    describe('_getEnablePrefillBreakTime', () =>
    {
        it('Should return preferences value', () =>
        {
            const preferences = getUserPreferences();
            assert.strictEqual(new ExtendedClass(preferences, {})._getEnablePrefillBreakTime(), preferences['enable-prefill-break-time']);
        });
    });

    describe('_getBreakTimeInterval', () =>
    {
        it('Should return preferences value', () =>
        {
            const preferences = getUserPreferences();
            assert.strictEqual(new ExtendedClass(preferences, {})._getBreakTimeInterval(), preferences['break-time-interval']);
        });
    });

    describe('_validateTimes()', () =>
    {
        it('Shold return empty array', () =>
        {
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            const validatedTimes = calendar._validateTimes([]);
            assert.deepStrictEqual(validatedTimes, []);
        });

        it('Should not remove invalid endings', () =>
        {
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            const validatedTimes = calendar._validateTimes(['10:00', '25:83']);
            assert.deepStrictEqual(validatedTimes, ['10:00', '--:--']);
        });

        it('Should remove invalid endings', () =>
        {
            const preferences = {view: 'day'};
            const languageData = {hello: 'hola'};
            const calendar = new ExtendedClass(preferences, languageData);
            const validatedTimes = calendar._validateTimes(['10:00', '25:83'], true);
            assert.deepStrictEqual(validatedTimes, ['10:00']);
        });
    });

    describe('_switchView()', () =>
    {
        const tests = [
            {view: 'day', result: 'month'},
            {view: 'month', result: 'day'}
        ];
        for (const t of tests)
        {
            it(`Should change calendar view: ${t.view}`, () =>
            {
                savePreferences({...getUserPreferences(), view: t.view});
                const languageData = {hello: 'hola'};
                const calendar = new ExtendedClass(getUserPreferences(), languageData);
                calendar._switchView();
                const updatedPreferences = getUserPreferences();
                assert.strictEqual(updatedPreferences.view, t.result);
            });
        }
    });

    describe('punchDate()', () =>
    {
        const workAllDayPreferences = ({...getUserPreferences(), 'working-days-saturday': true,
            'working-days-sunday': true});
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);
        const nextDay = new Date();
        nextDay.setDate(today.getDate() + 1);
        const languageData = {hello: 'hola'};
        const tests = [
            {   it: 'Should fail on checking year',
                date: nextYear,
                setup: () =>
                {
                    mocks._areAllInputsFilled = spy(ExtendedClass.prototype, '_areAllInputsFilled');
                },
                getCalendar: () => new ExtendedClass(getUserPreferences(), languageData),
                expect: () =>
                {
                    assert.strictEqual(mocks._areAllInputsFilled.notCalled, true);
                }
            },
            {   it: 'Should fail on checking  month',
                date: nextMonth,
                setup: () =>
                {
                    mocks._areAllInputsFilled = spy(ExtendedClass.prototype, '_areAllInputsFilled');
                },
                getCalendar: () => new ExtendedClass(getUserPreferences(), languageData),
                expect: () =>
                {
                    assert.strictEqual(mocks._areAllInputsFilled.notCalled, true);
                }
            },
            {   it: 'Should fail on checking day',
                date: nextMonth,
                setup: () =>
                {
                    mocks._areAllInputsFilled = spy(ExtendedClass.prototype, '_areAllInputsFilled');
                },
                getCalendar: () => new ExtendedClass(getUserPreferences(), languageData),
                expect: () =>
                {
                    assert.strictEqual(mocks._areAllInputsFilled.notCalled, true);
                }
            },
            {   it: 'Should not punch date',
                setup: () =>
                {
                    mocks._areAllInputsFilled = spy(ExtendedClass.prototype, '_areAllInputsFilled');
                    mocks._updateTimeDayCallback = spy(ExtendedClass.prototype, '_updateTimeDayCallback');
                    mocks._addTodayEntries = stub(ExtendedClass.prototype, '_addTodayEntries').returns({});
                },
                date: new Date(),
                getCalendar: () =>
                {
                    // Setting all days as work days so test works every day
                    const calendar = new ExtendedClass(workAllDayPreferences, languageData);
                    return calendar;
                },
                expect: () =>
                {
                    assert.strictEqual(mocks._areAllInputsFilled.calledOnce, true);
                    assert.strictEqual(mocks._addTodayEntries.calledOnce, true);
                    assert.strictEqual(mocks._updateTimeDayCallback.notCalled, true);
                }
            },
            {   it: 'Should punch date',
                setup: () =>
                {
                    ExtendedClass.prototype._updateTimeDay = () => {};
                    ExtendedClass.prototype._updateLeaveBy = () => {};
                    ExtendedClass.prototype._updateBalance = () => {};
                    const newDate = new Date();
                    const key = generateKey(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                    mocks._areAllInputsFilled = spy(ExtendedClass.prototype, '_areAllInputsFilled');
                    mocks._updateTimeDayCallback = spy(ExtendedClass.prototype, '_updateTimeDayCallback');
                    mocks._updateTimeDay = spy(ExtendedClass.prototype, '_updateTimeDay');
                    mocks._updateLeaveBy = spy(ExtendedClass.prototype, '_updateLeaveBy');
                    mocks._updateBalance = spy(ExtendedClass.prototype, '_updateBalance');
                    mocks._addTodayEntries = stub(ExtendedClass.prototype, '_addTodayEntries').returns({});
                    $('body').append(`<div id="${key}" ></div>`);
                    $(`#${key}`).append('<input type="time" value="" />');
                },
                date: new Date(),
                getCalendar: () =>
                {
                    // Setting all days as work days so test works every day
                    const calendar = new ExtendedClass(workAllDayPreferences, languageData);
                    return calendar;
                },
                expect: () =>
                {
                    assert.strictEqual(mocks._areAllInputsFilled.calledOnce, true);
                    assert.strictEqual(mocks._addTodayEntries.notCalled, true);
                    assert.strictEqual(mocks._updateTimeDayCallback.calledOnce, true);
                    assert.strictEqual(mocks._updateTimeDay.calledOnce, true);
                    assert.strictEqual(mocks._updateLeaveBy.calledOnce, true);
                    assert.strictEqual(mocks._updateBalance.calledOnce, true);
                    const newDate = new Date();
                    const key = generateKey(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                    $(`#${key}`).remove();
                }
            }
        ];
        for (const t of tests)
        {
            it(t.it, () =>
            {
                t.setup();
                const calendar = t.getCalendar();
                calendar._calendarDate = t.date;
                calendar.punchDate();
                t.expect();
            });
        }
    });

    describe('_updateDayTotal()', () =>
    {
        it('Should not update when day has not ended', async() =>
        {
            const newDate = new Date();
            const key = generateKey(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
            $('body').append(`<div id="${key}" ></div>`);
            $(`#${key}`).append('<input type="time" value="--:--" />');
            const calendar = new ExtendedClass(getUserPreferences(), {});
            await calendar.initializeStores();
            calendar._updateDayTotal(key);
            const dayTotalSpan = $('#' + key).parent().find('.day-total-cell span');
            $(`#${key}`).remove();
            assert.strictEqual(dayTotalSpan.text(), '');
        });

        it('Should update when day has ended', async() =>
        {
            const calendarStore = new Store({name: 'flexible-store'});
            const newDate = new Date();
            const key = generateKey(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
            calendarStore.set(key, '08:00');
            calendarStore.set(key, '16:00');
            $('body').append(`<div id="${key}" ></div>`);
            $('body').append('<div class="day-total-cell" ><span>--:--</span></div>');
            $(`#${key}`).append('<input type="time" value="08:00" />');
            $(`#${key}`).append('<input type="time" value="16:00" />');
            const calendar = new ExtendedClass(getUserPreferences(), {});
            await calendar.initializeStores();
            calendar._setStore(key, ['08:00', '16:30']);
            calendar._updateDayTotal(key);
            const dayTotalSpan = $('#' + key).parent().find('.day-total-cell span');
            $(`#${key}`).remove();
            assert.strictEqual(dayTotalSpan.html(), '08:30');
        });
    });

    afterEach(() =>
    {
        for (const mock of Object.values(mocks))
        {
            mock.restore();
        }
        global.$ = $_backup;
        $('#overall-balance').remove();
        resetPreferences();
    });
});