/* eslint-disable no-undef */
const Store = require('electron-store');
const {
    computeAllTimeBalancelUntil,
    getFirstInputInDb
} = require('../../js/time-balance');

describe('Time Balance', () => {
    test('getFirstInputInDb: no input', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        expect(getFirstInputInDb()).toBe('');
    });

    test('getFirstInputInDb: input 1', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-3-1-day-begin': '08:00'
        };
        store.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-3-1-day-begin');
    });

    test('getFirstInputInDb: input 2', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-3-1-day-begin': '08:00',
            '2020-3-3-day-begin': '08:00'
        };
        store.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-3-1-day-begin');
    });

    test('getFirstInputInDb: input 3', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-3-1-day-begin': '08:00',
            '2020-3-3-day-begin': '08:00',
            '2020-2-1-day-begin': '08:00'
        };
        store.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-2-1-day-begin');
    });

    test('getFirstInputInDb: input 4', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-6-day-begin': '10:00',
            '2020-6-6-day-end': '14:00',
            '2020-6-6-day-total': '03:00',
            '2020-6-6-lunch-begin': '12:00',
            '2020-6-6-lunch-end': '13:00',
            '2020-6-6-lunch-total': '01:00',
            '2020-6-7-day-begin': '10:00',
            '2020-6-7-day-end': '14:00',
            '2020-6-7-day-total': '03:00',
            '2020-6-7-lunch-begin': '12:00',
            '2020-6-7-lunch-end': '13:00',
            '2020-6-7-lunch-total': '01:00',
            '2020-6-8-day-begin': '10:00',
            '2020-6-8-day-end': '19:00',
            '2020-6-8-day-total': '08:00',
            '2020-6-8-lunch-begin': '13:00',
            '2020-6-8-lunch-end': '14:00',
            '2020-6-8-lunch-total': '01:00',
            '2020-6-9-day-begin': '10:00',
            '2020-6-9-day-end': '22:00',
            '2020-6-9-day-total': '11:00',
            '2020-6-9-lunch-begin': '12:00',
            '2020-6-9-lunch-end': '13:00',
            '2020-6-9-lunch-total': '01:00',
            '2020-6-10-day-begin': '08:00',
            '2020-6-10-day-end': '19:00',
            '2020-6-10-day-total': '10:00',
            '2020-6-10-lunch-begin': '12:00',
            '2020-6-10-lunch-end': '13:00',
            '2020-6-10-lunch-total': '01:00',
        };
        store.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-6-6-day-begin');
    });

    test('computeAllTimeBalancelUntil: no input', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        expect(computeAllTimeBalancelUntil(new Date())).resolves.toBe('00:00');
    });

    test('computeAllTimeBalancelUntil: only regular days', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '08:00' // wed
        };
        store.set(entryEx);
        // time balance until thu (excluding thu)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 3))).resolves.toBe('-08:00');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 4))).resolves.toBe('-16:00');
        // time balance until sun (excluding sun)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 5))).resolves.toBe('-16:00');
        // time balance until mon (excluding mon)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 6))).resolves.toBe('-16:00');
        // time balance until tue (excluding tue)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 7))).resolves.toBe('-24:00');
    });

    test('computeAllTimeBalancelUntil: only regular days (with overtime)', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '09:30' // wed
        };
        store.set(entryEx);
        // time balance until thu (excluding thu)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 2))).resolves.toBe('01:30');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 3))).resolves.toBe('-06:30');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 4))).resolves.toBe('-14:30');
    });

    test('computeAllTimeBalancelUntil: only regular days (with undertime)', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '06:15' // wec
        };
        store.set(entryEx);
        // time balance until thu (excluding thu)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 2))).resolves.toBe('-01:45');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 3))).resolves.toBe('-09:45');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 4))).resolves.toBe('-17:45');
    });

    test('computeAllTimeBalancelUntil: only regular days (with mixed time)', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '06:15', // wed
            '2020-6-2-day-total': '09:15', // thu
            '2020-6-3-day-total': '06:15', // fri
        };
        store.set(entryEx);
        // time balance until thu (excluding thu)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 2))).resolves.toBe('-01:45');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 3))).resolves.toBe('-00:30');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 4))).resolves.toBe('-02:15');
    });

    test('computeAllTimeBalancelUntil: missing entries', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '08:00', // wed
            '2020-6-3-day-total': '08:00', // fri
        };
        store.set(entryEx);
        // time balance until thu (excluding thu)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 3))).resolves.toBe('-08:00');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 4))).resolves.toBe('-08:00');
        // time balance until sun (excluding sun)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 5))).resolves.toBe('-08:00');
    });

    test('computeAllTimeBalancelUntil: with waived days', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '08:00', // wed
            '2020-6-3-day-total': '08:00', // fri
        };
        store.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '08:00' }, // thu
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until thu (excluding thu)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 3))).resolves.toBe('00:00');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 4))).resolves.toBe('00:00');
    });

    test('computeAllTimeBalancelUntil: with waived days 2', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-8-day-total': '08:00', // wed
        };
        store.set(entryEx);
        const waivedEntries = {
            '2020-07-09': { reason: 'Waiver', hours: '08:00' }, // tue
            '2020-07-10': { reason: 'Waiver', hours: '08:00' }, // fri
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until wed (excluding wed)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 8))).resolves.toBe('00:00');
        // time balance until tue (excluding tue)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 9))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 10))).resolves.toBe('00:00');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 11))).resolves.toBe('00:00');
    });

    test('computeAllTimeBalancelUntil: with waived days (not full)', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '08:00', // wed
            '2020-6-3-day-total': '08:00', // fri
        };
        store.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '02:00' }, // tue
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until tue (excluding tue)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 3))).resolves.toBe('-06:00');
        // time balance until sat (excluding sat)
        expect(computeAllTimeBalancelUntil(new Date(2020, 6, 4))).resolves.toBe('-06:00');
    });

    test('computeAllTimeBalancelUntil: target date in the past of entries', () => {
        const store = new Store();
        const waivedWorkdays = new Store({ name: 'waived-workdays' });
        store.clear();
        waivedWorkdays.clear();
        const entryEx = {
            '2020-6-1-day-total': '08:00', // wed
            '2020-6-3-day-total': '08:00', // fri
        };
        store.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '02:00' }, // tue
        };
        waivedWorkdays.set(waivedEntries);
        expect(computeAllTimeBalancelUntil(new Date(2020, 5, 1))).resolves.toBe('00:00');
    });
});