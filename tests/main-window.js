// file deepcode ignore no-invalid-this: the this keyword is being used for testing purposes only in this file
'use strict';

const Application = require('spectron').Application;
const assert = require('assert');
const electronPath = require('electron');
const path = require('path');

process.env.NODE_ENV = 'test';

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
        assert.equal(title, 'Time to Leave');
    });

    it('Calendar opens on Current Month/Year', async function()
    {
        const { client } = this.app;
        await client.waitUntilWindowLoaded();

        const monthYear = await client.$('#month-year');
        const monthYearText = await monthYear.getText();
        const today = new Date();
        assert.equal(monthYearText, `${months[today.getMonth()]} ${today.getFullYear()}`);
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
        assert.equal(headerDateText, `${weekDay[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`);
    });

    it('Calendar change to previous Month', async function()
    {
        const { client } = this.app;
        await client.waitUntilWindowLoaded();

        const prevMonth = await client.$('#prev-month');
        prevMonth.click();
        const monthYear = await client.$('#month-year');
        const monthYearText = await monthYear.getText();
        const today = new Date();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), -1);
        assert.equal(monthYearText, `${months[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`);
    });

    it('Calendar change to next Month', async function()
    {
        const { client } = this.app;
        await client.waitUntilWindowLoaded();

        const nextMonth = await client.$('#next-month');
        nextMonth.click();
        const monthYear = await client.$('#month-year');
        const monthYearText = await monthYear.getText();
        const today = new Date();
        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        assert.equal(monthYearText, `${months[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`);
    });

    it('Calendar change to pervious Day', async function()
    {
        const { client } = this.app;
        await client.waitUntilWindowLoaded();
        const switchViewBtn = await client.$('#switch-view');
        await switchViewBtn.click();
        const prevDay = await client.$('#prev-day');
        prevDay.click();
        const headerDate = await client.$('#header-date');
        const headerDateText = await headerDate.getText();
        const today = new Date();
        const previousDayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        assert.equal(headerDateText, `${weekDay[previousDayDate.getDay()]}, ${months[previousDayDate.getMonth()]} ${previousDayDate.getDate()}, ${previousDayDate.getFullYear()}`);
    });

    it('Calendar change to next Day', async function()
    {
        const { client } = this.app;
        await client.waitUntilWindowLoaded();
        const switchViewBtn = await client.$('#switch-view');
        await switchViewBtn.click();
        const nextDay = await client.$('#next-day');
        nextDay.click();
        const headerDate = await client.$('#header-date');
        const headerDateText = await headerDate.getText();
        const today = new Date();
        const nextDayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        assert.equal(headerDateText, `${weekDay[nextDayDate.getDay()]}, ${months[nextDayDate.getMonth()]} ${nextDayDate.getDate()}, ${nextDayDate.getFullYear()}`);
    });
});
