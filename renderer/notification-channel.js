'use strict';

import IpcConstants from '../js/ipc-constants.mjs';

const searchLeaveByElement = (event) =>
{
    const leaveByElement = $('#leave-by').val();
    event.sender.send(IpcConstants.ReceiveLeaveBy, leaveByElement);
};

export {
    searchLeaveByElement
};
