'use strict';

import IpcConstants from '../js/ipc-constants.mjs';

const searchLeaveByElement = () =>
{
    const leaveByElement = $('#leave-by').val();
    window.electronAPI.sendLeaveBy(IpcConstants.ReceiveLeaveBy, leaveByElement);
};

export {
    searchLeaveByElement
};
