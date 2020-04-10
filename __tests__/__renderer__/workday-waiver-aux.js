/* eslint-disable no-undef */
const { formatDayId, sendWaiverDay } = require('../../js/workday-waiver-aux');

describe('Workday Waiver Aux', function() {
    process.env.NODE_ENV = 'test';

    const validJSDay = '2020-03-10';
    const validJSDay2 = '2020-00-10';
    const garbageString = '..as';
    const incompleteDate = '---';
    
    describe('formatDayId(dayId)', function() {
        test('should be valid', () => {
            expect(formatDayId(validJSDay)).toBe('2020-04-10');
            expect(formatDayId(validJSDay2)).toBe('2020-01-10');
        });

        test('should not be valid', () => {
            expect(formatDayId(garbageString)).toBeNaN();
            expect(formatDayId(incompleteDate)).toBeNaN();
        });
    });
    
    describe('sendWaiverDay(dayId)', function() {
        test('should do seamless call', async () => {
            await sendWaiverDay(validJSDay);
            await sendWaiverDay(validJSDay2);
            await sendWaiverDay(garbageString);
            await sendWaiverDay(incompleteDate);
        });
    });
    
    // TODO: Come up with a way to test displayWaiverWindow
});