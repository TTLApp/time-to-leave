'use strict';

const searchLeaveByElement = () =>
{
    const leaveByElement = $('#leave-by').val();
    // If leaveByElement is invalid (does not match the time format HH:MM), do nothing
    if (!leaveByElement.match(/^\d{1,2}:\d{2}$/))
    {
        return;
    }
    window.rendererApi.sendLeaveBy(leaveByElement);
};

export {
    searchLeaveByElement
};
