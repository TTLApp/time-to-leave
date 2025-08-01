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
            // Mock window.rendererApi.sendLeaveBy
            window.rendererApi = {
                sendLeaveBy: (value) =>
                {
                    assert.strictEqual(value, `${i}${i}:${i}${i}`);
                }
            };
            searchLeaveByElement();
        }
        done();
    });

    it('Should return undefined if invalid', done =>
    {
        $('#leave-by').val('Beans');
        // Mock window.rendererApi.sendLeaveBy
        window.rendererApi = {
            sendLeaveBy: (value) =>
            {
                assert.strictEqual(value, undefined);
                done();
            }
        };
        searchLeaveByElement();
    });
});