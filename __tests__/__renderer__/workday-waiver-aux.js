/* eslint-disable no-undef */
'use strict';

import { formatDayId, displayWaiverWindow } from '../../renderer/workday-waiver-aux.js';

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
            expect(formatDayId(validJSDay)).toBe('2020-04-10');
            expect(formatDayId(validJSDay2)).toBe('2020-01-10');
        });

        test('should not be valid', () =>
        {
            expect(formatDayId(garbageString)).toBeNaN();
            expect(formatDayId(incompleteDate)).toBeNaN();
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