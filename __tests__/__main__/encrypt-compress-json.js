'use strict';

const {
    compressFile,
    decompressFile
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

    fs.writeFileSync(`${folder}/regular.ttldb`, entriesContent, 'utf8');

    describe('de/compress file', function()
    {
        test('should compress successfully', async() =>
        {
            const compressSuccess = await compressFile(filePath, filePathCompressed);
            expect(compressSuccess).toBeTruthy();
        });
        test('should decompress successfully', async() =>
        {
            const decompressSuccess = await decompressFile(filePathCompressed, filePathDecompressed);
            expect(decompressSuccess).toBeTruthy();
        });
        test('decompressed file should equal file before', async() =>
        {
            expect(fs.readFileSync(filePath)).toEqual(fs.readFileSync(path.join(filePathDecompressed, 'regular.ttldb')));
        });
    });

    afterAll(() =>
    {
        fs.rmdirSync(folder, {recursive: true});
    });

});