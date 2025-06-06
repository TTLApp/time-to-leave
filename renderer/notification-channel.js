'use strict';

import IpcConstants from '../js/ipc-constants.mjs';

const searchLeaveByElement = (event) =>
{
    const leaveByElement = $('#leave-by').val();
    window.electronAPI.sendLeaveBy(IpcConstants.ReceiveLeaveBy, leaveByElement);
};

export {
    searchLeaveByElement
};
