const notifier = require('node-notifier');
const path = require('path');

/**
 * Notify user it's time to leave.
 */
function notifyUser() {
    console.log(path.dirname(__filename));
    notifier.notify(
        {
            title: 'Time to leave',
            message: 'Hey there! I think it\'s time to leave.',
            icon: path.join(path.dirname(require.main.filename), 'assets/timer.png'), // Absolute path (doesn't work on balloons)
            sound: true, // Only Notification Center or Windows Toasters
            wait: true
        },
      );
}

function notify(msg) {
    notifier.notify(
        {
            title: 'Time to leave',
            message: msg,
            icon: path.join(path.dirname(require.main.filename), 'assets/timer.png'), // Absolute path (doesn't work on balloons)
            sound: true, // Only Notification Center or Windows Toasters
            wait: true
        },
      );
}

module.exports = {
    notifyUser,
    notify
};
