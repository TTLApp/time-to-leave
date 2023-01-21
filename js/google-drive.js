const fs = require('fs').promises;
const path = require('path');
const process = require('process');

const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { getDatabaseAsJSON } = require('./import-export.js');
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist()
{
    try
    {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    }
    catch (err)
    {
        return null;
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client)
{
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request authorization to call APIs.
 */
async function authorize()
{
    let client = await loadSavedCredentialsIfExist();
    if (client)
    {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials)
    {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Upload database content as JSON to Google Drive.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param {String} path Path and name of the uploaded file.
 */
async function uploadData(authClient, path)
{
    const service = google.drive({ version: 'v3', auth: authClient });
    const jsonData = getDatabaseAsJSON();
    const fileMetadata = {
        name: path,
        mimeType: 'application/json',
    };
    const media = {
        mimeType: 'application/json',
        body: jsonData,
    };
    try
    {
        await service.files.create({
            resource: fileMetadata,
            media: media,
        });
    }
    catch (err)
    {
        throw new Error('Failed to upload data.');
    }
}

/**
 * Search file in drive location by filename.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param {String} fileName Name of the searched file.
 *
 * @return {String} fileId
 * */
async function searchFile(authClient, fileName)
{
    const service = google.drive({ version: 'v3', auth: authClient });
    const files = [];
    try
    {
        const res = await service.files.list({
            q: `name='${fileName}'` ,
            fields: 'nextPageToken, files(id, name)',
            spaces: 'drive',
        });
        // use first file that matches the given file name
        Array.prototype.push.apply(files, res.files);
        const fileId = res.data.files[0].id;
        return fileId;
    }
    catch (err)
    {
        throw new Error(`Failed to find file ${fileName} in Drive.`);
    }
}

/**
 * Download TTL-data file from Google Drive.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param {String} fileId of the file that should be downloaded.
 */
async function downloadFile(authClient, fileId)
{
    const service = google.drive({ version: 'v3', auth: authClient });
    try
    {
        const file = await service.files.get({
            fileId: fileId,
            alt: 'media',
        });
        const jsonData = JSON.stringify(file.data, null, '\t');
        return jsonData;
    }
    catch (err)
    {
        throw new Error('Failed to download file.');
    }
}

module.exports = {
    loadSavedCredentialsIfExist,
    saveCredentials,
    authorize,
    searchFile,
    downloadFile,
    uploadData
};