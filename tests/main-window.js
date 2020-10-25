const Application = require('spectron').Application;
const assert = require('assert');
const electronPath = require('electron');
const path = require('path');

// TODO: expose API from Calendar so this duplication is not needed
const months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
const weekDay = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

describe('Application launch', function()
{
    //  deepcode ignore UseArrowFunction: => will not work on here
    beforeEach(function()
    {
        this.timeout(25000); // Estimated pessimistic time taken for the app to the brought up in CI
        this.app = new Application({
            path: electronPath,
            args: [path.join(__dirname, '..')]
        });
        return this.app.start();
    });

    afterEach(function()
    {
        this.timeout(10000); // Estimated pessimistic time taken for the app to be stopped in CI
        if (this.app && this.app.isRunning())
        {
            return this.app.stop();
        }
    });

    it('App opens correctly', async function()
    {
        const { client, browserWindow } = this.app;
        await client.waitUntilWindowLoaded();
        const title = await browserWindow.getTitle();
        return assert.equal(title, 'Time to Leave');
    });

    it('Calendar opens on Current Month/Year', async function()
    {
        const { client } = this.app;
        await client.waitUntilWindowLoaded();

        const monthYear = await client.$('#month-year');
        const monthYearText = await monthYear.getText();
        const today = new Date();
        return assert.equal(monthYearText, `${months[today.getMonth()]} ${today.getFullYear()}`);
    });

    it('Change to Day View', async function()
    {
        const { client } = this.app;
        await client.waitUntilWindowLoaded();

        const switchViewBtn = await client.$('#switch-view');
        await switchViewBtn.click();
        const headerDate = await client.$('#header-date');
        const headerDateText = await headerDate.getText();
        const today = new Date();
        return assert.equal(headerDateText, `${weekDay[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`);
    });
});
