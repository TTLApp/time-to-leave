'use strict';

import '../../__mocks__/jquery.mjs';

import assert from 'assert';

import { searchLeaveByElement } from '../../renderer/notification-channel.js';
import IpcConstants from '../../js/ipc-constants.mjs';

describe('Notifications channel',  () =>
{
    it('Should get content of #leave-by element', done =>
    {
        $('body').append('<input id="leave-by" value="12:12" />');
        // Way to get the file considered for coverage
        searchLeaveByElement({
            sender: {
                send: (channel, value) =>
                {
                    assert.strictEqual(channel, IpcConstants.ReceiveLeaveBy);
                    assert.strictEqual(value, '12:12');
                    done();
                }
            }
        });
    });
});
