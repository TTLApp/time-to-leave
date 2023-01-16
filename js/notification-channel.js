const { ipcRenderer } = require('electron');

const searchLeaveByElement = (event) =>
{
    const leaveByElement = $('#leave-by').val();
    event.sender.send('RECEIVE_LEAVE_BY', leaveByElement);
};

// Event handler to search for #leave-by element, not accesible through main process
ipcRenderer.on('GET_LEAVE_BY', searchLeaveByElement);

module.exports = {
    searchLeaveByElement
};