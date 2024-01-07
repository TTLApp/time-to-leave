'use strict';

import path from 'path';

function handleSquirrelEvent(application)
{
    if (process.argv.length === 1)
    {
        return false;
    }

    const ChildProcess = require('child_process');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args)
    {
        let spawnedProcess;

        try
        {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        }
        catch (error)
        {
            // eslint-disable-next-line no-empty
            // We don't need to do anything in this block.
        }

        return spawnedProcess;
    };

    const spawnUpdate = function(args)
    {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent)
    {
    case '--squirrel-install':
    case '--squirrel-updated':

        // Install start menu shortcuts
        spawnUpdate(['--createShortcut', exeName]);

        setTimeout(application.quit, 1000);
        return true;

    case '--squirrel-uninstall':
        // Undo anything you did in the --squirrel-install and --squirrel-updated handlers

        // Remove start menu shortcuts
        spawnUpdate(['--removeShortcut', exeName]);

        setTimeout(application.quit, 1000);
        return true;

    case '--squirrel-obsolete':
        // This is called on the outgoing version of your app before
        // we update to the new version - it's the opposite of
        // --squirrel-updated

        application.quit();
        return true;
    }
}

module.exports = {
    handleSquirrelEvent
};
