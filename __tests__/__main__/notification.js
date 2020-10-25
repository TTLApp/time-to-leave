/* eslint-disable no-undef */
'use strict';

const {
    notify
} = require('../../js/notification');

describe('Notifications', function()
{
    test('displays a notification in test', async() =>
    {
        expect.assertions(1);
        try
        {
            process.env.NODE_ENV = 'test';
            await expect(notify('test')).toBeTruthy();
        }
        catch (error)
        {
            expect(error).toMatch('error');
        }
    });

    test('displays a notification in production', async() =>
    {
        expect.assertions(1);
        try
        {
            process.env.NODE_ENV = 'production';
            await expect(notify('production')).toBeTruthy();
        }
        catch (error)
        {
            expect(error).toMatch('error');
        }
    });

});

