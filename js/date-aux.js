/*
 * Given a JS Date, return the string in the format YYYY-MM-DD.
 */
function getDateStr(date) {
    try {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().substr(0, 10);
    } catch (err) {
        return new Error(err);
    }
}

module.exports = {
    getDateStr
};
