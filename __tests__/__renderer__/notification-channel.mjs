'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';
import { searchLeaveByElement } from '../../renderer/notification-channel.js';

describe('searchLeaveByElement()', () =>
{
    beforeEach(() =>
    {
        // Clean up body before each test
        $('body').empty();
        $('body').append('<input id="leave-by" value="" />');
    });

    it('Should get content of #leave-by with valid times', done =>
    {
        for (let i = 0; i < 2; i++)
        {
            $('#leave-by').val(`${i}${i}:${i}${i}`);
            let called = false;
            // Mock window.rendererApi.sendLeaveBy
            window.rendererApi = {
                sendLeaveBy: (value) =>
                {
                    called = true;
                    assert.strictEqual(value, `${i}${i}:${i}${i}`);
                }
            };
            searchLeaveByElement();
            assert.strictEqual(called, true);
        }
        done();
    });

    it('Should not send a message if invalid', () =>
    {
        $('#leave-by').val('Beans');
        let called = false;
        window.rendererApi = {
            sendLeaveBy: () => { called = true; }
        };
        searchLeaveByElement();
        assert.strictEqual(called, false);
    });
});
