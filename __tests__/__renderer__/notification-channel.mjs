'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';

import { searchLeaveByElement } from '../../renderer/notification-channel.js';

describe('searchLeaveByElement', () =>
{
    beforeEach(() =>
    {
        // Clean up body before each test
        $('body').empty();
    });

    it('Should get content of #leave-by', done =>
    {
        $('body').append('<input id="leave-by" value="12:12" />');
        // Mock window.electronAPI
        window.electronAPI = {
            sendLeaveBy: (channel, value) =>
            {
                assert.strictEqual(channel, 'RECEIVE_LEAVE_BY');
                assert.strictEqual(value, '12:12');
                done();
            }
        };
        searchLeaveByElement();
    });

    it('Should handle empty value in #leave-by', done =>
    {
        $('body').append('<input id="leave-by" value="" />');
        window.electronAPI = {
            sendLeaveBy: (channel, value) =>
            {
                assert.strictEqual(channel, 'RECEIVE_LEAVE_BY');
                assert.strictEqual(value, '');
                done();
            }
        };
        searchLeaveByElement();
    });
});