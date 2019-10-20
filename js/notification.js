const notifier = require('node-notifier');
const path = require('path');

const title = 'Time to Leave';

function notify(msg) {
    notifier.notify(
        {
            title: title,
            message: msg,
            icon: path.join(path.dirname(require.main.filename), 'assets/timer.png'), // Absolute path (doesn't work on balloons)
            sound: true, // Only Notification Center or Windows Toasters
            wait: true
        },
      );
}

module.exports = {
    notify
};
