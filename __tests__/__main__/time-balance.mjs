'use strict';

import assert from 'assert';
import Store from 'electron-store';

import TimeBalance from '../../js/time-balance.mjs';
import { resetPreferences } from '../../js/user-preferences.mjs';

const calendarStore = new Store({name: 'flexible-store'});
const waivedWorkdays = new Store({name: 'waived-workdays'});

describe('Time Balance', () =>
{
    beforeEach(() =>
    {
        calendarStore.clear();
        waivedWorkdays.clear();
        resetPreferences();
    });

    it('getFirstInputInDb: no input', () =>
    {
        assert.strictEqual(TimeBalance.getFirstInputInDb(), '');
    });

    it('getFirstInputInDb: input 1', () =>
    {
        const entryEx = {
            '2020-3-1': {'values': ['08:00']}
        };
        calendarStore.set(entryEx);
        assert.strictEqual(TimeBalance.getFirstInputInDb(), '2020-3-1');
    });

    it('getFirstInputInDb: input 2', () =>
    {
        const entryEx = {
            '2020-3-1': {'values': ['08:00']},
            '2020-3-3': {'values': ['08:00']}
        };
        calendarStore.set(entryEx);
        assert.strictEqual(TimeBalance.getFirstInputInDb(), '2020-3-1');
    });

    it('getFirstInputInDb: input 3', () =>
    {
        const entryEx = {
            '2020-3-1': {'values': ['08:00']},
            '2020-3-3': {'values': ['08:00']},
            '2020-2-1': {'values': ['08:00']}
        };
        calendarStore.set(entryEx);
        assert.strictEqual(TimeBalance.getFirstInputInDb(), '2020-2-1');
    });

    it('getFirstInputInDb: input 4', () =>
    {
        const entryEx = {
            '2020-6-6': {'values': ['10:00', '12:00', '13:00', '14:00']},
            '2020-6-7': {'values': ['10:00', '12:00', '13:00', '14:00']},
            '2020-6-8': {'values': ['10:00', '13:00', '14:00', '19:00']},
            '2020-6-9': {'values': ['10:00', '12:00', '13:00', '22:00']},
            '2020-6-10': {'values': ['08:00', '12:00', '13:00', '19:00']}
        };
        calendarStore.set(entryEx);
        assert.strictEqual(TimeBalance.getFirstInputInDb(), '2020-6-6');
    });

    it('computeAllTimeBalanceUntil: no input', async() =>
    {
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date()), '00:00');
    });

    it('computeAllTimeBalanceUntil: only regular days', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']} // wed (8h total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '00:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-08:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-16:00');
        // time balance until sun (excluding sun)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 5)), '-16:00');
        // time balance until mon (excluding mon)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 6)), '-16:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 7)), '-24:00');
    });

    it('computeAllTimeBalanceUntil: only regular days, timesAreProgressing false', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '17:00', '13:00']} // wed (8h total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '-08:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-16:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-24:00');
        // time balance until sun (excluding sun)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 5)), '-24:00');
        // time balance until mon (excluding mon)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 6)), '-24:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 7)), '-32:00');
    });

    it('computeAllTimeBalanceUntil: only regular days (6 entries)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '10:00', '10:30', '11:30', '13:00', '17:00']} // wed (7h total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '-01:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-09:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-17:00');
        // time balance until sun (excluding sun)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 5)), '-17:00');
        // time balance until mon (excluding mon)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 6)), '-17:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 7)), '-25:00');
    });

    it('computeAllTimeBalanceUntil: only regular days (with overtime)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '18:30']} // wed (9h30 total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '01:30');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-06:30');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-14:30');
    });

    it('computeAllTimeBalanceUntil: only regular days (with overtime and 8 entries)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['06:00', '12:00', '13:00', '14:00', '14:30', '16:00', '17:00', '18:30']} // wed (10h total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '02:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-06:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-14:00');
    });

    it('computeAllTimeBalanceUntil: only regular days (with undertime)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '15:15']} // wed (6h15 total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '-01:45');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-09:45');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-17:45');
    });

    it('computeAllTimeBalanceUntil: only regular days (with mixed time)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '15:15']}, // wed (6h15 total)
            '2020-6-2': {'values': ['08:00', '12:00', '13:00', '18:15']}, // thu (9h15 total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '15:15']} // fri (6h15 total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '-01:45');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-00:30');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-02:15');
    });

    it('computeAllTimeBalanceUntil: irregular days (with mixed time)', async() =>
    {
        const entryEx = {
            '2020-6-6': {'values': ['08:00', '12:00']}, // mon (even #entries, but < 4 => 4h/-4h)[total tomorrow: -4h]
            '2020-6-7': {'values': ['08:00', '12:00', '13:00', '18:15']}, // tue (even #entries, and == 4 => 9h15/+1h15)[-2h45]
            '2020-6-8': {'values': ['08:00', '12:00', '13:00', '15:15', '15:30', '16:00']}, // wed (even #entries, and > 4 => 6h45/-1h15)[-4h]
            '2020-6-9': {'values': ['08:00', '12:00', '13:00']}, // thu (odd #entries, day is not considered => -8h)[-12h]
            '2020-6-10': {'values': ['08:00', '12:00', '13:00', '15:00', '17:00']}, // fri (odd #entries, day is not considered => -8h)[-20h]
            '2020-6-13': {'values': ['00:00', '18:00']}, // mon (18h/+10h)[-10h]
        };
        calendarStore.set(entryEx);
        // time balance until mon (excluding mon)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 6)), '00:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 7)), '-04:00');
        // time balance until wed (excluding wed)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 8)), '-02:45');
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 9)), '-04:00');
        // time balance until fru (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 10)), '-12:00');
        // time balance until sat/sun/mon (excluding sat/sun/mon)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 11)), '-20:00');
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 12)), '-20:00');
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 13)), '-20:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 14)), '-10:00');
    });

    it('computeAllTimeBalanceUntil: irregular (but even) days (with mixed time)', async() =>
    {
        const entryEx = {
            '2020-6-6': {'values': ['08:00', '12:00']}, // mon (even #entries, but < 4 => 4h/-4h)[total tomorrow: -4h]
            '2020-6-7': {'values': ['08:00', '12:00', '13:00', '18:15']}, // tue (even #entries, and == 4 => 9h15/+1h15)[-2h45]
            '2020-6-8': {'values': ['08:00', '12:00', '13:00', '15:15', '15:30', '16:00']}, // wed (even #entries, and > 4 => 6h45/-1h15)[-4h]
            '2020-6-9': {'values': ['08:00', '12:00']}, // thu (even #entries, and < 4 => 4h/-4 on total)[-8h]
            '2020-6-10': {'values': ['08:00', '12:00', '13:00', '15:00']}, // fri (even #entries, and > 4 => only up to '15:00' => 6h/-2h)[-10h]
            '2020-6-13': {'values': ['00:00', '18:00']}, // mon (18h/+10h)[0h]
        };
        calendarStore.set(entryEx);
        // time balance until mon (excluding mon)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 6)), '00:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 7)), '-04:00');
        // time balance until wed (excluding wed)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 8)), '-02:45');
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 9)), '-04:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 10)), '-08:00');
        // time balance until sat/sun/mon (excluding sat/sun/mon)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 11)), '-10:00');
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 12)), '-10:00');
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 13)), '-10:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 14)), '00:00');
    });

    it('computeAllTimeBalanceUntil: missing entries', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        calendarStore.set(entryEx);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '00:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-08:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-08:00');
        // time balance until sun (excluding sun)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 5)), '-08:00');
    });

    it('computeAllTimeBalanceUntil: with waived days', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        calendarStore.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '08:00' }, // thu
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until thu (excluding thu)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '00:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '00:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '00:00');
    });

    it('computeAllTimeBalanceUntil: with waived days 2', async() =>
    {
        const entryEx = {
            '2020-6-8': {'values': ['08:00', '12:00', '13:00', '17:00']} // wed (8h total)
        };
        calendarStore.set(entryEx);
        const waivedEntries = {
            '2020-07-09': { reason: 'Waiver', hours: '08:00' }, // tue
            '2020-07-10': { reason: 'Waiver', hours: '08:00' }, // fri
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until wed (excluding wed)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 8)), '00:00');
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 9)), '00:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 10)), '00:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 11)), '00:00');
    });

    it('computeAllTimeBalanceUntil: with waived days (not full)', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        calendarStore.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '02:00' }, // tue
        };
        waivedWorkdays.set(waivedEntries);
        // time balance until tue (excluding tue)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 2)), '00:00');
        // time balance until fri (excluding fri)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 3)), '-06:00');
        // time balance until sat (excluding sat)
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 6, 4)), '-06:00');
    });

    it('computeAllTimeBalanceUntil: target date in the past of entries', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        calendarStore.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '02:00' }, // tue
        };
        waivedWorkdays.set(waivedEntries);
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntil(new Date(2020, 5, 1)), '00:00');
    });

    it('computeAllTimeBalanceUntilAsync: target date in the past of entries', async() =>
    {
        const entryEx = {
            '2020-6-1': {'values': ['08:00', '12:00', '13:00', '17:00']}, // wed (8h total)
            '2020-6-3': {'values': ['08:00', '12:00', '13:00', '17:00']} // fri (8h total)
        };
        calendarStore.set(entryEx);
        const waivedEntries = {
            '2020-07-02': { reason: 'Waiver', hours: '02:00' }, // tue
        };
        waivedWorkdays.set(waivedEntries);
        assert.strictEqual(await TimeBalance.computeAllTimeBalanceUntilAsync(new Date(2020, 5, 1)), '00:00');
    });

});
