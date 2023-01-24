/* eslint-disable no-undef */
'use strict';

const {
    validateJSON
} = require('../../js/validate-json');

describe('Validate json', function()
{
    process.env.NODE_ENV = 'test';

    // TODO: Regular store entries are still here to test import of old dbs. Please remove on the next release.
    describe('validateJSON(instance)', function()
    {
        const goodFlexibleEntry = {'type': 'flexible', 'date': '2020-06-03', 'values': ['08:00', '12:00', '13:00', '14:00']};
        const goodWaivedEntry = {'type': 'waived', 'date': '2020-06-03', 'data': 'waived', 'hours': '08:00'};
        test('should be valid', () =>
        {
            expect(validateJSON(goodWaivedEntry)).toBeTruthy();
            expect(validateJSON(goodFlexibleEntry)).toBeTruthy();
        });
    });
});
