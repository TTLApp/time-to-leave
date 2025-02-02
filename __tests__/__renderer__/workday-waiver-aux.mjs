'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';

import { formatDayId, displayWaiverWindow } from '../../renderer/workday-waiver-aux.js';

const window_backup = global.window;

describe('Workday Waiver Aux', function()
{
    before(() =>
    {
        // Mocking call
        // TODO: find a better way to mock this or even really test it
        global.window = {
            calendarApi: {
                displayWaiverWindow: () => {}
            }
        };
    });

    const validJSDay = '2020-03-10';
    const validJSDay2 = '2020-00-10';
    const garbageString = '..as';
    const incompleteDate = '---';

    describe('formatDayId(dayId)', function()
    {
        it('should be valid', () =>
        {
            assert.strictEqual(formatDayId(validJSDay), '2020-04-10');
            assert.strictEqual(formatDayId(validJSDay2), '2020-01-10');
        });

        it('should not be valid', () =>
        {
            assert.strictEqual(formatDayId(garbageString), NaN);
            assert.strictEqual(formatDayId(incompleteDate), NaN);
        });
    });

    describe('displayWaiverWindow(dayId)', function()
    {
        it('should do seamless call', async() =>
        {
            await displayWaiverWindow(validJSDay);
            await displayWaiverWindow(validJSDay2);
            await displayWaiverWindow(garbageString);
            await displayWaiverWindow(incompleteDate);
        });
    });

    after(() =>
    {
        global.window = window_backup;
    });

    // TODO: Come up with a way to test displayWaiverWindow's opening of a window
});
