function generateKey(year, month, day, key) {
    const dbKey = year + '-' + month + '-' + day;
    return key === undefined ? dbKey : dbKey + '-' + key;
}

module.exports = {
    generateKey,
};