const Application = require('spectron').Application;
const assert = require('assert');
const electronPath = require('electron'); // Require Electron from the binaries included in node_modules.
const path = require('path');

var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;
var beforeEach = mocha.beforeEach;
var afterEach = mocha.afterEach;

describe('Application launch', function () {
    this.timeout(120000);

    beforeEach(function () {
        this.app = new Application({
            path: electronPath,
            args: [path.join(__dirname, '..')],
            chromeDriverArgs: ['remote-debugging-port=9222']
        });
        return this.app.start();
    });

    afterEach(function () {
        if (this.app && this.app.isRunning()) {
            return this.app.stop();
        }
    });

    it('App window is loaded correcly', function () {
        return this.app.client.getWindowCount().then(function (count) {
            assert.equal(count, 1);
        });
    });

    // GitHub issue #6
    it('Window displays a calendar, on the current month/year', function () {
        return this.app.client.getText('#month-year').then(function (monthYear) {
        // Check that has any content
            assert(monthYear && monthYear.length > 0, true);
            // Check that the month/year is the current
            const months = [ 'January', 'February', 'March', 'April', 
                'May', 'June', 'July', 'August', 'September', 
                'October', 'November', 'December' ];
            
            var today = new Date();
            var [month, year] = monthYear.split(' ');
            assert.equal(year, today.getFullYear());
            assert.equal(month, months[today.getMonth()]);
        });
    });
});