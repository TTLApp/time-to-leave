'use strict';
import Cryptify from 'cryptify';
const compressing = require('compressing');

async function compressEncryptFile(filePathOriginal, filePathCompressed, passPhrase)
{
    try
    {
        await compressing.tgz.compressFile(filePathOriginal, filePathCompressed);
        const instance = new Cryptify(filePathCompressed, passPhrase, 'aes-256-cbc', 'utf8', true);
        await instance.encrypt();
        return true;
    }
    catch (e)
    {
        console.log(`compression and encryption failed: ${e}`);
        return false;
    }
}

async function decryptDecompressFile(filePathCompressed, filePathDecompressed, passPhrase)
{
    try
    {
        const instance = new Cryptify(filePathCompressed, passPhrase, 'aes-256-cbc', 'utf8', true);
        await instance.decrypt();
        await compressing.tgz.uncompress(filePathCompressed, filePathDecompressed);
        return true;
    }
    catch (e)
    {
        console.log(`decryption and decompression failed: ${e}`);
        return false;
    }
}

module.exports = {
    compressEncryptFile,
    decryptDecompressFile
};
