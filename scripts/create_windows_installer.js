const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller;

getInstallerConfig()
    .then(createWindowsInstaller)
    .catch((error) =>
    {
        console.error(error.message || error);
        process.exit(1);
    });

function getInstallerConfig()
{
    console.log('creating windows installer');

    return Promise.resolve({
        appDirectory: 'release-builds/Time to Leave-win32-ia32',
        outputDirectory: 'packages',
        exe: 'Time To Leave.exe',
        setupIcon: 'assets/icon-win.ico',
        setupExe: 'TimeToLeaveInstaller.exe',
        noMsi: true,
        loadingGif: 'assets/installer.gif',
        iconUrl: 'https://raw.githubusercontent.com/thamara/time-to-leave/main/assets/icon-win.ico',
    });
}
