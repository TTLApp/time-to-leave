/* eslint-disable no-undef */
'use strict';

const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
/* eslint-disable-next-line no-global-assign */
window.$ = require('jquery');
const {
    addWaiver,
    populateList,
    setDates,
    setHours
} = require('../../src/workday-waiver');

function prepareMockup() 
{
    const waivedWorkdays = new Store({ name: 'waived-workdays' });
    waivedWorkdays.clear();
    const workdayWaiverHtml = path.join(__dirname, '../../src/workday-waiver.html');
    const content = fs.readFileSync(workdayWaiverHtml);
    let parser = new DOMParser();
    let htmlDoc = parser.parseFromString(content, 'text/html');
    document.body.innerHTML = htmlDoc.body.innerHTML;
    populateList();
}

function addTestWaiver(day, reason) 
{
    $('#reason').val(reason);
    setDates(day);
    setHours();

    addWaiver();
}

function testWaiverCount(expected) 
{
    const waivedWorkdays = new Store({ name: 'waived-workdays' });
    expect(waivedWorkdays.size).toBe(expected);
    expect($('#waiver-list-table tbody')[0].rows.length).toBe(expected);
}

describe('Test Workday Waiver Window', function() 
{
    process.env.NODE_ENV = 'test';

    describe('Adding new waivers update the db and the page', function() 
    {
        test('One Waiver', () => 
        {
            prepareMockup();

            testWaiverCount(0);
            addTestWaiver('2020-07-16', 'some reason');
            testWaiverCount(1);
        });

        test('One + two Waivers', () => 
        {
            prepareMockup();
            //Start with none
            testWaiverCount(0);

            // Add one waiver and update the table on the page
            addTestWaiver('2020-07-16', 'some reason');
            populateList();
            testWaiverCount(1);

            // Add two more waiver
            addTestWaiver('2020-07-20', 'some other reason');
            addTestWaiver('2020-07-21', 'yet another reason');
            testWaiverCount(3);
        });
    });
});