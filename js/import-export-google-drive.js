const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { getDbAsJSON } = require('./import-export.js');


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    }
    catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
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
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Upload Db content as JSON to Google Drive
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param {String} path Path and name of the uploaded file
 */
async function uploadWithConversion(authClient, path) {
    const fs = require('fs');
    const service = google.drive({ version: 'v3', auth: authClient });
    fs.writeFileSync('tmp', getDbAsJSON());
    const fileMetadata = {
        name: path,
        mimeType: 'application/json',
    };
    const media = {
        mimeType: 'application/json',
        body: fs.createReadStream('tmp'),
    };
    try {
        const file = await service.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });
        fs.unlinkSync('tmp');
        console.log('File Id:', file.data.id);
        return file.data.id;
    }
    catch (err) {
        // TODO(developer) - Handle error
        console.log('This should handle error');
        throw err;
    }

}

/**
 * Search file in drive location
 * @return{obj} data file
 * */
async function searchFile(authClient, fileName) {
    const service = google.drive({ version: 'v3', auth: authClient });
    const fs = require('fs');
    const files = [];
    try {
        const res = await service.files.list({
            q: 'name=\'' + fileName + '\'',
            fields: 'nextPageToken, files(id, name)',
            spaces: 'drive',
        });
        Array.prototype.push.apply(files, res.files);
        const fileId = res.data.files[0].id;
        res.data.files.forEach(function (file) {
            console.log('Found file:', file.name, file.id);

        });
        return fileId;
    }
    catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

async function downloadFile(authClient, realFileId) {
    // Get credentials and build service
    // TODO (developer) - Use appropriate auth mechanism for your app
    console.log('DOWNLOAD ID', realFileId);
    const service = google.drive({ version: 'v3', auth: authClient });
    const fs = require('fs');
    var dest = fs.createWriteStream("tmp");
    fileId = realFileId;
    try {
        const file = await service.files.get(
            {fileId: realFileId, alt: 'media',},
            {responseType: "stream"},
            (err, {data}) => {
                if (err) {
                  console.log(err);
                  return;
                }
                data
                  .on("end", () => console.log("Done."))
                  .on("error", (err) => {
                    console.log(err);
                    return process.exit();
                  })
                  .pipe(dest);
              }
            );
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}



module.exports = {
    loadSavedCredentialsIfExist,
    saveCredentials,
    authorize,
    uploadWithConversion,
    searchFile,
    downloadFile
};
