const notificationChannel = require('../../js/notification-channel.js');

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
                    expect(channel).toBe('RECEIVE_LEAVE_BY');
                    expect(value).toBe('12:12');
                    done();
                }
            }
        });
    });
});