'use strict';

const assert = require('assert');

const notificationChannel = require('../../renderer/notification-channel.js');

describe('Notifications channel',  () =>
{
    it('Should get content of #leave-by element', done =>
    {
        window.$ = require('jquery');
        $('body').append('<input id="leave-by" value="12:12" />');
        // Way to get the file considered for coverage
        notificationChannel.searchLeaveByElement({
            sender: {
                send: (channel, value) =>
                {
                    assert.strictEqual(channel, 'RECEIVE_LEAVE_BY');
                    assert.strictEqual(value, '12:12');
                    done();
                }
            }
        });
    });
});