'use strict';

const searchLeaveByElement = (event) =>
{
    const leaveByElement = $('#leave-by').val();
    event.sender.send('RECEIVE_LEAVE_BY', leaveByElement);
};

export {
    searchLeaveByElement
};
