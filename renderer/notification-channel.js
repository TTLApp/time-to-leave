'use strict';

const searchLeaveByElement = () =>
{
    const leaveByElement = $('#leave-by').val();
    window.rendererApi.sendLeaveBy(leaveByElement);
};

export {
    searchLeaveByElement
};
