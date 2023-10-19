const ElectronStore = require('electron-store');
const { getDateStr } = require('../../js/date-aux');
const {shouldCheckForUpdates, checkForUpdates} = require('../../js/update-manager');

jest.mock('electron', () =>
{
    const original = jest.requireActual('electron');
    return {
        __esModule: true,
        ...original,
        net: {
            ...original.net,
            request: jest.fn()
        }
    };
});

jest.mock('is-online', () => () => jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true));

const { net } = require('electron');

describe('js/update-manager.js', () =>
{
    const mocks = {};
    describe('shouldCheckForUpdates', () =>
    {
        test('Should return true when was never checked', () =>
        {
            const store = new ElectronStore();
            store.set('update-remind-me-after', false);
            expect(shouldCheckForUpdates()).toBe(true);
        });

        test('Should return true when was checked before today', () =>
        {
            const now = new Date();
            now.setDate(now.getDate() - 1);
            const store = new ElectronStore();
            store.set('update-remind-me-after', getDateStr(now));
            expect(shouldCheckForUpdates()).toBe(true);
        });

        test('Should return false when was checked today', () =>
        {
            const now = new Date();
            const store = new ElectronStore();
            store.set('update-remind-me-after', getDateStr(now));
            expect(shouldCheckForUpdates()).toBe(false);
        });
    });

    describe('checkForUpdates', () =>
    {
        test('should not execute when is offline', () =>
        {
            mocks.net = jest.spyOn(net, 'request').mockImplementation(() => {});
            checkForUpdates();
            expect(mocks.net).toBeCalledTimes(0);
        });

        test('should not execute when is online', (done) =>
        {
            mocks.net = jest.spyOn(net, 'request').mockImplementation(() =>
            {
                return {
                    on: () =>
                    {
                        expect(mocks.net).toBeCalledTimes(1);
                        done();
                    }
                };
            });
            checkForUpdates();
        });

    });

    afterEach(() =>
    {
        for (const mock of Object.values(mocks))
        {
            mock.mockClear();
        }
    });
});