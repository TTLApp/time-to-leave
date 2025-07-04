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
    });

    it('Should get content of #leave-by with valid times', done =>
    {
        for (let i = 0; i < 2; i++)
        {
            $('body').append(`<input id="leave-by" value="${i}${i}:${i}${i}" />`);
            // Mock window.rendererApi.sendLeaveBy
            window.rendererApi = {
                sendLeaveBy: (value) =>
                {
                    assert.strictEqual(value, `${i}${i}:${i}${i}`);
                    done();
                }
            };
            searchLeaveByElement();
        }
    });
    it('Should return empty if invalid', done =>
    {
        $('body').append('<input id="leave-by" value="Beans" />');
        // Mock window.rendererApi.sendLeaveBy
        window.rendererApi = {
            sendLeaveBy: (value) =>
            {
                assert.strictEqual(value, '');
                done();
            }
        };
        searchLeaveByElement();
    });
});