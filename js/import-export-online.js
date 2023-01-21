const { authorize, searchFile, downloadFile, uploadData } = require('./google-drive.js');
const { importDatabaseFromBuffer } = require('./import-export.js');

/**
 * Authorize and upload database content as JSON to Google Drive.
 * @param {String} path Path and name of the uploaded file.
 */
async function exportDatabaseToGoogleDrive(path)
{
    const client = await authorize();
    await uploadData(client, path);
}

/**
 * Import the database from Google Drive by downloading a JSON file that contains TTL data.
 *
 * @return {Promise<object>} result of the import in form {'result': false, 'total': 0, 'failed': 0} if failed
 * and {'result': true} if import succeeded.
 */
async function importDatabaseFromGoogleDrive()
{
    console.log('importDatabaseFromGoogleDrive');
    // TODO: file name hardcoded at the moment, add user input
    const client = await authorize();
    const fileId = await searchFile(client, 'time_to_leave_export');
    const jsonData = await downloadFile(client, fileId);
    const importResult = importDatabaseFromBuffer(jsonData);
    return importResult;
}

module.exports = {
    importDatabaseFromGoogleDrive,
    exportDatabaseToGoogleDrive
};