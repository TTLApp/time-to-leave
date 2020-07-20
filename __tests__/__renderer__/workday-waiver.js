/* eslint-disable no-undef */
const Store = require('electron-store');
/* eslint-disable-next-line no-global-assign */
$ = require('jquery');
const { 
    addWaiver,
    setDates,
    setHours 
} = require('../../src/workday-waiver');

function prepareMockup() {
    const waivedWorkdays = new Store({ name: 'waived-workdays' });
    waivedWorkdays.clear();
    // There gotta be a bettwe way of doing this, but I just not getting it :(
    document.body.innerHTML = `
        <body id="workday-waiver-window" class="common-window">
            <div class="container">
                <div class="header-title">
                    Workday Waiver Manager
                    <p class="header-help">Changes take effect when closing this window</p>
                </div>

                <section>
                    <div class="section-title">Add Waiver</div>
                    <form>
                        <table>
                            <tbody>
                                <tr>
                                    <td></td>
                                    <th>Start date</th>
                                    <td></td>
                                    <th>End date</th>
                                </tr>
                                <tr>
                                    <th>From</th>
                                    <td><input id="start-date" type="date"></td>
                                    <th>to</th>
                                    <td><input id="end-date" type="date"></td>
                                </tr>
                                <tr>
                                    <th>Hours</th>
                                    <td>
                                        <input type="text" id="hours" maxlength=8 pattern="^\\d+:\\d+$" placeholder="HH:mm" size=8>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Reason</th>
                                    <td colspan="3"><input id="reason" type="text" maxlength="30" size="60" placeholder="Reason for the waiver"></td>
                                </tr>
                            </tbody>
                        </table>
                        <br>
                        <button class="waive-button" id="waive-button" type="button">
                            Waive
                        </button>
                    </form>
                </section>

                <section>
                    <div class="section-title">Waived workday list</div>
                    <table id="waiver-list-table">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Waiver Reason</th>
                                <th>Hours Waived</th>
                                <th>Delete</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </section>
            </div>
        </body>
    `;
}

function addTestWaiver(day, hours, reason) {
    $('#reason').val(reason);
    setDates(day);
    setHours(hours);

    addWaiver();
}

function testWaiverCount(expected) {
    const waivedWorkdays = new Store({ name: 'waived-workdays' });
    expect(waivedWorkdays.size).toBe(expected);
    expect($('#waiver-list-table tbody')[0].rows.length).toBe(expected);
}

describe('Test Workday Waiver Window', function() {
    process.env.NODE_ENV = 'test';

    describe('Adding new waivers update the db and the page', function() {
        test('One Waiver', () => {
            prepareMockup();

            testWaiverCount(0);
            addTestWaiver('2020-07-16', '08:00', 'some reason');
            testWaiverCount(1);
        });

        test('Three Waivers', () => {
            prepareMockup();

            testWaiverCount(0);
            addTestWaiver('2020-07-16', '08:00', 'some reason');
            addTestWaiver('2020-07-20', '08:00', 'some other reason');
            addTestWaiver('2020-07-21', '08:00', 'yet another reason');
            testWaiverCount(3);
        });
    });
});