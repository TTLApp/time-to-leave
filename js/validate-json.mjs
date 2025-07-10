'use strict';
import { Validator } from 'jsonschema';

const schema = {
    'id': '/singleEntry',
    'type': 'array',
    'items': {
        oneOf: [
            {'$ref': '/waivedEntry'},
            {'$ref': '/entry'}
        ]
    }
};

const schemaWaivedEntry = {
    'id': '/waivedEntry',
    'type': 'object',
    'properties': {
        'type':
            {'type': 'string', 'pattern': 'waived' }
        ,
        'date': {
            'type': 'string',
            'format': 'dateFormat',
            'pattern': /(1|2)[0-9]{3}-(0?[1-9]{1}|1[0-2]{1})-(0?[0-9]{1}|1[0-9]{1}|2[0-9]{1}|3[0-1]{1})/
        },
        'data': {
            'type': 'string'
        },
        'hours': {
            'type': 'string',
            'pattern': /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]|--:--$/
        }
    },
    'required': [
        'type',
        'date',
        'data',
        'hours'
    ]
};

const schemaEntry = {
    'id': '/entry',
    'type': 'object',
    'properties': {
        'type':
            {'type': 'string', 'pattern': 'flexible' }
        ,
        'date': {
            'type': 'string',
            'format': 'dateFormat',
            'pattern': /(1|2)[0-9]{3}-(0?[1-9]{1}|1[0-2]{1})-(0?[0-9]{1}|1[0-9]{1}|2[0-9]{1}|3[0-1]{1})/
        },
        'values': {
            'type': 'array',
            'format': 'timePointFormat',
            'items': {
                'type': 'string',
                'pattern': /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/
            }
        }
    },
    'required': [
        'type',
        'date',
        'values'
    ]
};

/**
 * Returns the number of days in the month of a specific year.
 *
 * @param {number} month
 * @param {number} year
 *
 * @return {number} number of days in month.
 */
function daysInMonth(month, year)
{
    switch (month)
    {
    case 1 :
        return (year % 4 === 0 && year % 100) || year % 400 === 0 ? 29 : 28;
    case 8 : case 3 : case 5 : case 10 :
        return 30;
    default :
        return 31;
    }
}

/**
 * Checks if date is valid.
 * Months are counted from 0.
 *
 * @param {number} year
 * @param {number} month
 * @param {number} day
 *
 * @return {boolean} true or false depending on if date is valid.
 */
function isValidDate(year, month, day)
{
    return month >= 0 && month < 12 && day > 0 && day <= daysInMonth(month, year);
}

/**
 * Adds custom format to validator that checks if date is valid.
 *
 * @param {String} dateStr
 *
 * @return {boolean} true or false depending on if date is valid.
 */
Validator.prototype.customFormats.dateFormat = function(dateStr)
{
    if (!(typeof(dateStr) === 'string') || !dateStr.includes('-'))
    {
        return false;
    }
    const dateArray = dateStr.split('-');
    const year = dateArray[0];
    const month = dateArray[1]-1; // isValidDate(..) counts months from 0
    const day = dateArray[2];

    return isValidDate(year, month, day);
};

/**
 * Adds custom format to validator that checks if values in entry are valid.
 * Items in timePointArray have to be in an ascending order.
 *
 * @param {Array} timePointArray
 *
 * @return {boolean} true or false depending on if timePointArray is valid.
 */
Validator.prototype.customFormats.timePointFormat = function(timePointArray)
{
    if (!Array.isArray(timePointArray))
    {
        return false;
    }
    let isValidTimePointArray = true;
    let timePointBefore = 0;
    timePointArray.forEach(function(timePoint)
    {
        if (timePointBefore > parseInt(timePoint))
        {
            isValidTimePointArray = false;
        }
        timePointBefore = parseInt(timePoint);
    });
    return isValidTimePointArray;
};

/**
 * Validate JSON to find out if it's in the correct format for TTl.
 *
 * @param {object} instance JSON instance that should be validated.
 *
 * @return {boolean} true or false depending on if JSON is valid TTL JSON.
 */
function validateJSON(instance)
{
    const v = new Validator();
    v.addSchema(schemaEntry, '/entry');
    v.addSchema(schemaWaivedEntry, '/waivedEntry');

    return v.validate(instance, schema).valid;
}

export {
    validateJSON
};