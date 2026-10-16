'use strict';

import TimeMath from '../js/time-math.mjs';

const searchLeaveByElement = () =>
{
    const leaveByElement = $('#leave-by').val();
    if (!TimeMath.validateTime(leaveByElement))
    {
        return;
    }
    window.rendererApi.sendLeaveBy(leaveByElement);
};

export {
    searchLeaveByElement
};
