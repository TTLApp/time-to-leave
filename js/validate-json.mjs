'use strict';

import { Validator } from 'jsonschema';

const schema = {
    id: '/singleEntry',
    type: 'array',
    items: {
        oneOf: [
            { $ref: '/waivedEntry' },
            { $ref: '/entry' }
        ]
    }
};

const schemaWaivedEntry = {
    id: '/waivedEntry',
    type: 'object',
    properties: {
        type: { type: 'string', pattern: '^waived$' },
        date: {
            type: 'string',
            format: 'dateFormat',
            pattern: '^(1|2)[0-9]{3}-(0?[1-9]|1[0-2])-(0?[0-9]|1[0-9]|2[0-9]|3[0-1])$'
        },
        data: { type: 'string' },
        hours: {
            type: 'string',
            pattern: '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]|--:--$'
        }
    },
    required: ['type', 'date', 'data', 'hours']
};

const schemaEntry = {
    id: '/entry',
    type: 'object',
    properties: {
        type: { type: 'string', pattern: '^flexible$' },
        date: {
            type: 'string',
            format: 'dateFormat',
            pattern: '^(1|2)[0-9]{3}-(0?[1-9]|1[0-2])-(0?[0-9]|1[0-9]|2[0-9]|3[0-1])$'
        },
        values: {
            type: 'array',
            format: 'timePointFormat',
            items: {
                type: 'string',
                pattern: '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$'
            }
        }
    },
    required: ['type', 'date', 'values']
};

// Utility to get number of days in a month for a given year
function daysInMonth(month, year)
{
    switch (month)
    {
    case 1:
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
    case 8: case 3: case 5: case 10:
        return 30;
    default:
        return 31;
    }
}

// Checks if date is valid. Months are 0-indexed.
function isValidDate(year, month, day)
{
    return month >= 0 && month < 12 && day > 0 && day <= daysInMonth(month, year);
}

// Add custom format for date validation
Validator.prototype.customFormats.dateFormat = function(dateStr)
{
    if (typeof dateStr !== 'string' || !dateStr.includes('-')) return false;
    const dateArray = dateStr.split('-');
    const year = Number(dateArray[0]);
    const month = Number(dateArray[1]) - 1; // months 0-based
    const day = Number(dateArray[2]);
    return isValidDate(year, month, day);
};

// Add custom format for validating ordered time points
Validator.prototype.customFormats.timePointFormat = function(timePointArray)
{
    if (!Array.isArray(timePointArray)) return false;
    let prev = '';
    for (const timePoint of timePointArray)
    {
        if (prev && prev > timePoint) return false;
        prev = timePoint;
    }
    return true;
};

/**
 * Validate JSON to find out if it's in the correct format for TTL.
 * @param {object} instance JSON instance to be validated.
 * @returns {boolean} True if valid TTL JSON, else false.
 */
export function validateJSON(instance)
{
    const v = new Validator();
    v.addSchema(schemaEntry, '/entry');
    v.addSchema(schemaWaivedEntry, '/waivedEntry');
    return v.validate(instance, schema).valid;
}