'use strict';

const compressing = require('compressing');

async function compressFile(filePathOriginal, filePathCompressed)
{
    try
    {
        await compressing.tgz.compressFile(filePathOriginal, filePathCompressed);
        return true;
    }
    catch (e)
    {
        console.log(`compression failed: ${e}`);
        return false;
    }
}

async function decompressFile(filePathCompressed, filePathDecompressed)
{
    try
    {
        await compressing.tgz.uncompress(filePathCompressed, filePathDecompressed);
        return true;
    }
    catch (e)
    {
        console.log(`compression failed: ${e}`);
        return false;
    }
}

module.exports = {
    compressFile,
    decompressFile
};
