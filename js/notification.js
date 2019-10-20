const notifier = require('node-notifier');
const path = require('path');

const title = 'Time to Leave';
const defaultMessage = 'Hey there! I think it\'s time to leave.';

function notify(msg) {
    notifier.notify(
        {
            title: title,
            message: msg || defaultMessage,
            icon: path.join(path.dirname(require.main.filename), 'assets/timer.png'), // Absolute path (doesn't work on balloons)
            sound: true, // Only Notification Center or Windows Toasters
            wait: !msg // Wait with callback, until user action is taken against notification
        },
      );
}

module.exports = {
    notify
};
