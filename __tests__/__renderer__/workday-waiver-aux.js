/* eslint-disable no-undef */
'use strict';

const assert = require('assert');

import { formatDayId, displayWaiverWindow } from '../../renderer/workday-waiver-aux.js';

// Mocking call
// TODO: find a better way to mock this or even really test it
window.mainApi = {
    displayWaiverWindow: () => {}
};

describe('Workday Waiver Aux', function()
{
    process.env.NODE_ENV = 'test';

    const validJSDay = '2020-03-10';
    const validJSDay2 = '2020-00-10';
    const garbageString = '..as';
    const incompleteDate = '---';

    describe('formatDayId(dayId)', function()
    {
        test('should be valid', () =>
        {
            assert.strictEqual(formatDayId(validJSDay), '2020-04-10');
            assert.strictEqual(formatDayId(validJSDay2), '2020-01-10');
        });

        test('should not be valid', () =>
        {
            assert.strictEqual(formatDayId(garbageString), NaN);
            assert.strictEqual(formatDayId(incompleteDate), NaN);
        });
    });

    describe('displayWaiverWindow(dayId)', function()
    {
        test('should do seamless call', async() =>
        {
            await displayWaiverWindow(validJSDay);
            await displayWaiverWindow(validJSDay2);
            await displayWaiverWindow(garbageString);
            await displayWaiverWindow(incompleteDate);
        });
    });

    // TODO: Come up with a way to test displayWaiverWindow's opening of a window
});