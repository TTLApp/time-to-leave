'use strict';

import { _electron as electron } from 'playwright';
import assert from 'assert';

import { rootDir } from '../js/app-config.mjs';

// TODO: expose API from Calendar so this duplication is not needed
const months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
const weekDay = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

describe('Application launch', function()
{
    // Estimated pessimistic time taken for the app to the brought up/stopped in CI
    this.timeout(25000);

    let electronApp;

    beforeEach(async function()
    {
        electronApp = await electron.launch({ args: ['main.mjs'], env: process.env, cwd: rootDir});
    });

    afterEach(async function()
    {
        if (electronApp)
        {
            await (await electronApp.firstWindow()).close();
            await electronApp.close();
        }
    });

    // Unclear why, but this fails intermittently with PlayWright
    // TODO: fix this
    //
    // it('App opens correctly', async function()
    // {
    //     const window = await electronApp.firstWindow();
    //     const title = await window.title();
    //     assert.strictEqual(title, 'Time to Leave');
    // });

    it('Calendar opens on Current Month/Year', async function()
    {
        // TODO: Investigate why this takes such a long time (10s)
        const window = await electronApp.firstWindow();

        const monthYearLocator = window.locator('#month-year');
        const monthYearText = await monthYearLocator.evaluate(node => node.innerText);
        const today = new Date();
        assert.strictEqual(monthYearText, `${months[today.getMonth()]} ${today.getFullYear()}`);
    });

    it('Change to Day View', async function()
    {
        const window = await electronApp.firstWindow();

        const switchViewBtnLocator = window.locator('#switch-view');
        await switchViewBtnLocator.click();
        const headerDateLocator = window.locator('#header-date');
        const headerDateText = await headerDateLocator.evaluate(node => node.innerText);
        const today = new Date();
        assert.strictEqual(headerDateText, `${weekDay[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`);

        // Get back to month view, which is the default state for other tests
        await switchViewBtnLocator.click();
    });

    it('Calendar change to previous Month', async function()
    {
        const window = await electronApp.firstWindow();

        const prevMonthLocator = window.locator('#prev-month');
        await prevMonthLocator.click();
        const monthYearLocator = window.locator('#month-year');
        const monthYearText = await monthYearLocator.evaluate(node => node.innerText);
        const today = new Date();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), -1);
        assert.strictEqual(monthYearText, `${months[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`);
    });

    it('Calendar change to next Month', async function()
    {
        const window = await electronApp.firstWindow();

        const nextMonthLocator = window.locator('#next-month');
        await nextMonthLocator.click();
        const monthYearLocator = window.locator('#month-year');
        const monthYearText = await monthYearLocator.evaluate(node => node.innerText);
        const today = new Date();
        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        assert.strictEqual(monthYearText, `${months[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`);
    });

    it('Calendar change to previous Day', async function()
    {
        const window = await electronApp.firstWindow();

        const switchViewBtnLocator = window.locator('#switch-view');
        await switchViewBtnLocator.click();
        const prevDayLocator = window.locator('#prev-day');
        await prevDayLocator.click();
        const headerDateLocator = window.locator('#header-date');
        const headerDateText = await headerDateLocator.evaluate(node => node.innerText);
        const today = new Date();
        const previousDayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        assert.strictEqual(headerDateText, `${weekDay[previousDayDate.getDay()]}, ${months[previousDayDate.getMonth()]} ${previousDayDate.getDate()}, ${previousDayDate.getFullYear()}`);

        // Get back to month view, which is the default state for other tests
        await switchViewBtnLocator.click();
    });

    it('Calendar change to next Day', async function()
    {
        const window = await electronApp.firstWindow();

        const switchViewBtnLocator = window.locator('#switch-view');
        await switchViewBtnLocator.click();
        const nextDayLocator = window.locator('#next-day');
        await nextDayLocator.click();
        const headerDateLocator = window.locator('#header-date');
        const headerDateText = await headerDateLocator.evaluate(node => node.innerText);
        const today = new Date();
        const nextDayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        assert.strictEqual(headerDateText, `${weekDay[nextDayDate.getDay()]}, ${months[nextDayDate.getMonth()]} ${nextDayDate.getDate()}, ${nextDayDate.getFullYear()}`);

        // Get back to month view, which is the default state for other tests
        await switchViewBtnLocator.click();
    });
});
