/* eslint-disable no-undef */
'use strict';

const Store = require('electron-store');
import {
    computeAllTimeBalanceUntil,
    getFirstInputInDb
} from '../../js/time-balance.js';
import { resetPreferences } from '../../js/user-preferences.js';

const flexibleStore = new Store({name: 'flexible-store'});
const waivedWorkdays = new Store({name: 'waived-workdays'});

describe('Time Balance', () =>
{
    beforeEach(() =>
    {
        flexibleStore.clear();
        waivedWorkdays.clear();
        resetPreferences();
    });

    test('getFirstInputInDb: no input', () =>
    {
        expect(getFirstInputInDb()).toBe('');
    });

    test('getFirstInputInDb: input 1', () =>
    {
        const entryEx = {
            '2020-3-1': {'values': ['08:00']}
        };
        flexibleStore.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-3-1');
    });

    test('getFirstInputInDb: input 2', () =>
    {
        const entryEx = {
            '2020-3-1': {'values': ['08:00']},
            '2020-3-3': {'values': ['08:00']}
        };
        flexibleStore.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-3-1');
    });

    test('getFirstInputInDb: input 3', () =>
    {
        const entryEx = {
            '2020-3-1': {'values': ['08:00']},
            '2020-3-3': {'values': ['08:00']},
            '2020-2-1': {'values': ['08:00']}
        };
        flexibleStore.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-2-1');
    });

    test('getFirstInputInDb: input 4', () =>
    {
        const entryEx = {
            '2020-6-6': {'values': ['10:00', '12:00', '13:00', '14:00']},
            '2020-6-7': {'values': ['10:00', '12:00', '13:00', '14:00']},
            '2020-6-8': {'values': ['10:00', '13:00', '14:00', '19:00']},
            '2020-6-9': {'values': ['10:00', '12:00', '13:00', '22:00']},
            '2020-6-10': {'values': ['08:00', '12:00', '13:00', '19:00']}
        };
        flexibleStore.set(entryEx);
        expect(getFirstInputInDb()).toBe('2020-6-6');
    });

    test('computeAllTimeBalanceUntil: no input', async() =>
    {
        await expect(computeAllTimeBalanceUntil(new Date())).resolves.toBe('00:00');
    });

    test('computeAllTimeBalanceUntil: only regular days', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']} // wed (8h total)
        };
        flexibleStore.set(entryEx);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-08:00');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-16:00');
        // time balance until sun (excluding sun)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 5))).resolves.toBe('-16:00');
        // time balance until mon (excluding mon)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 6))).resolves.toBe('-16:00');
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 7))).resolves.toBe('-24:00');
    });

    test('computeAllTimeBalanceUntil: only regular days (6 entries)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '10:00', '10:30', '11:30', '13:00', '17:00']} // wed (7h total)
        };
        flexibleStore.set(entryEx);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('-01:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-09:00');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-17:00');
        // time balance until sun (excluding sun)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 5))).resolves.toBe('-17:00');
        // time balance until mon (excluding mon)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 6))).resolves.toBe('-17:00');
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 7))).resolves.toBe('-25:00');
    });

    test('computeAllTimeBalanceUntil: only regular days (with overtime)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '18:30']} // wed (9h30 total)
        };
        flexibleStore.set(entryEx);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('01:30');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-06:30');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-14:30');
    });

    test('computeAllTimeBalanceUntil: only regular days (with overtime and 8 entries)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['06:00', '12:00', '13:00', '14:00', '14:30', '16:00', '17:00', '18:30']} // wed (10h total)
        };
        flexibleStore.set(entryEx);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('02:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-06:00');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-14:00');
    });

    test('computeAllTimeBalanceUntil: only regular days (with undertime)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '15:15']} // wed (6h15 total)
        };
        flexibleStore.set(entryEx);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('-01:45');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-09:45');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-17:45');
    });

    test('computeAllTimeBalanceUntil: only regular days (with mixed time)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '15:15']}, // wed (6h15 total)
            '2020-6-2': {'values': ['08:00', '12:00', '13:00', '18:15']}, // thu (9h15 total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '15:15']} // fri (6h15 total)
        };
        flexibleStore.set(entryEx);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('-01:45');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-00:30');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-02:15');
    });

    test('computeAllTimeBalanceUntil: irregular days (with mixed time)', async() =>
    {
        const entryEx = {
            '2020-6-6': {'values': ['08:00', '12:00']}, // mon (even #entries, but < 4 => 4h/-4h)[total tomorrow: -4h]
            '2020-6-7': {'values': ['08:00', '12:00', '13:00', '18:15']}, // tue (even #entries, and == 4 => 9h15/+1h15)[-2h45]
            '2020-6-8': {'values': ['08:00', '12:00', '13:00', '15:15', '15:30', '16:00']}, // wed (even #entries, and > 4 => 6h45/-1h15)[-4h]
            '2020-6-9': {'values': ['08:00', '12:00', '13:00']}, // thu (odd #entries, day is not considered => -8h)[-12h]
            '2020-6-10': {'values': ['08:00', '12:00', '13:00', '15:00', '17:00']}, // fri (odd #entries, day is not considered => -8h)[-20h]
            '2020-6-13': {'values': ['00:00', '18:00']}, // mon (18h/+10h)[-10h]
        };
        flexibleStore.set(entryEx);
        // time balance until mon (excluding mon)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 6))).resolves.toBe('00:00');
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 7))).resolves.toBe('-04:00');
        // time balance until wed (excluding wed)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 8))).resolves.toBe('-02:45');
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 9))).resolves.toBe('-04:00');
        // time balance until fru (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 10))).resolves.toBe('-12:00');
        // time balance until sat/sun/mon (excluding sat/sun/mon)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 11))).resolves.toBe('-20:00');
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 12))).resolves.toBe('-20:00');
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 13))).resolves.toBe('-20:00');
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 14))).resolves.toBe('-10:00');
    });

    test('computeAllTimeBalanceUntil: irregular (but even) days (with mixed time)', async() =>
    {
        const entryEx = {
            '2020-6-6': {'values': ['08:00', '12:00']}, // mon (even #entries, but < 4 => 4h/-4h)[total tomorrow: -4h]
            '2020-6-7': {'values': ['08:00', '12:00', '13:00', '18:15']}, // tue (even #entries, and == 4 => 9h15/+1h15)[-2h45]
            '2020-6-8': {'values': ['08:00', '12:00', '13:00', '15:15', '15:30', '16:00']}, // wed (even #entries, and > 4 => 6h45/-1h15)[-4h]
            '2020-6-9': {'values': ['08:00', '12:00']}, // thu (even #entries, and < 4 => 4h/-4 on total)[-8h]
            '2020-6-10': {'values': ['08:00', '12:00', '13:00', '15:00']}, // fri (even #entries, and > 4 => only up to '15:00' => 6h/-2h)[-10h]
            '2020-6-13': {'values': ['00:00', '18:00']}, // mon (18h/+10h)[0h]
        };
        flexibleStore.set(entryEx);
        // time balance until mon (excluding mon)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 6))).resolves.toBe('00:00');
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 7))).resolves.toBe('-04:00');
        // time balance until wed (excluding wed)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 8))).resolves.toBe('-02:45');
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 9))).resolves.toBe('-04:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 10))).resolves.toBe('-08:00');
        // time balance until sat/sun/mon (excluding sat/sun/mon)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 11))).resolves.toBe('-10:00');
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 12))).resolves.toBe('-10:00');
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 13))).resolves.toBe('-10:00');
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 14))).resolves.toBe('00:00');
    });

    test('computeAllTimeBalanceUntil: missing entries', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        flexibleStore.set(entryEx);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-08:00');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-08:00');
        // time balance until sun (excluding sun)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 5))).resolves.toBe('-08:00');
    });

    test('computeAllTimeBalanceUntil: with waived days', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        flexibleStore.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '08:00' }, // thu
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until thu (excluding thu)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('00:00');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('00:00');
    });

    test('computeAllTimeBalanceUntil: with waived days 2', async() =>
    {
        const entryEx = {
            '2020-6-8': {'values': ['08:00', '12:00', '13:00', '17:00']} // wed (8h total)
        };
        flexibleStore.set(entryEx);
        const waivedEntries = {
            '2020-07-09': { reason: 'Waiver', hours: '08:00' }, // tue
            '2020-07-10': { reason: 'Waiver', hours: '08:00' }, // fri
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until wed (excluding wed)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 8))).resolves.toBe('00:00');
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 9))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 10))).resolves.toBe('00:00');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 11))).resolves.toBe('00:00');
    });

    test('computeAllTimeBalanceUntil: with waived days (not full)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        flexibleStore.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '02:00' }, // tue
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until tue (excluding tue)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 2))).resolves.toBe('00:00');
        // time balance until fri (excluding fri)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 3))).resolves.toBe('-06:00');
        // time balance until sat (excluding sat)
        await expect(computeAllTimeBalanceUntil(new Date(2020, 6, 4))).resolves.toBe('-06:00');
    });

    test('computeAllTimeBalanceUntil: target date in the past of entries', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        flexibleStore.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '02:00' }, // tue
        };
        waivedWorkdays.set(waivedEntries);
        await expect(computeAllTimeBalanceUntil(new Date(2020, 5, 1))).resolves.toBe('00:00');
    });
});
