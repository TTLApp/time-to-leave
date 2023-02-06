'use strict';

const {
    compressEncryptFile,
    decryptDecompressFile
} = require('../../js/encrypt-compress-json');

const path = require('path');
const fs = require('fs');


describe('Encrypt compress JSON', function()
{
    process.env.NODE_ENV = 'test';

    const entriesContent =
    `[{"type": "flexible","date": "2020-4-1","values": ["08:00","12:00","13:00","17:00"]},
    {"type": "flexible","date": "2020-4-2","values": ["07:00","11:00","14:00","18:00"]},
    {"type": "waived","date": "2019-12-31","data": "New Year's eve","hours": "08:00"},
    {"type": "waived","date": "2020-01-01","data": "New Year's Day","hours": "08:00"},
    {"type": "waived","date": "2020-04-10","data": "Good Friday","hours": "08:00"}]`;

    const folder = fs.mkdtempSync('encrypt-decrypt');
    const filePath = path.join('.', folder, 'regular.ttldb');
    const filePathCompressed = path.join('.',folder, 'compressed.tgz');
    const filePathDecompressed = path.join('.',folder, 'decompressed');

    const filePathCompressedFail = path.join('.',folder, 'compressed-fail.tgz');

    const password = 'Password_123';
    const wrongPassword = 'NOTpassword_123';
    const invalidPassword = '123';

    fs.writeFileSync(`${folder}/regular.ttldb`, entriesContent, 'utf8');

    describe('de/compress and de/encrypt file', function()
    {
        test('should compress and encrypt successfully', async() =>
        {
            const compressSuccess = await compressEncryptFile(filePath, filePathCompressed, password);
            expect(compressSuccess).toBeTruthy();
        });

        test('should NOT compress and encrypt successfully', async() =>
        {
            // invalid password, see cryptify documentation for password rules
            const compressFail = await compressEncryptFile(filePath, filePathCompressedFail, invalidPassword);
            expect(compressFail).not.toBeTruthy();
            // invalid path
            const compressFail2 = await compressEncryptFile('invalid/path', filePathCompressedFail, password);
            expect(compressFail2).not.toBeTruthy();
        });

        test('should decompress successfully', async() =>
        {
            const decompressSuccess = await decryptDecompressFile(filePathCompressed, filePathDecompressed, password);
            expect(decompressSuccess).toBeTruthy();
        });

        test('should NOT decompress successfully', async() =>
        {
            // wrong password
            const decompressFail = await decryptDecompressFile(filePathCompressed, filePathDecompressed, wrongPassword);
            expect(decompressFail).not.toBeTruthy();
            // invalid path
            const decompressFail2 = await decryptDecompressFile('invalid/path', filePathDecompressed, password);
            expect(decompressFail2).not.toBeTruthy();
        });

        test('decompressed file should equal file before', async() =>
        {
            expect(fs.readFileSync(filePath)).toEqual(fs.readFileSync(path.join(filePathDecompressed, 'regular.ttldb')));
        });

        test('compressed file should NOT equal file before', async() =>
        {
            expect(fs.readFileSync(filePath)).not.toEqual(fs.readFileSync(filePathCompressed));
        });
    });

    afterAll(() =>
    {
        fs.rmdirSync(folder, {recursive: true});
    });

});