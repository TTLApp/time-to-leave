'use strict';

const searchLeaveByElement = () =>
{
    const leaveByElement = $('#leave-by').val();
    if (!leaveByElement.match(/^\d{1,2}:\d{2}$/))
    {
        // If the value is not a valid time, return empty
        window.rendererApi.sendLeaveBy('');
        return;
    }
    // If the value is valid, send it to the renderer API
    window.rendererApi.sendLeaveBy(leaveByElement);
};

export {
    searchLeaveByElement
};
