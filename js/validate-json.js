'use strict';

const Validator = require('jsonschema').Validator;

const schema = {
    'id': '/singleEntry',
    'type': 'array',
    'items': {
        oneOf: [
            {'$ref': '/waivedEntry'},
            {'$ref': '/flexibleEntry'}
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
            'format': 'dateFormat'
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

const schemaFlexibleEntry = {
    'id': '/flexibleEntry',
    'type': 'object',
    'properties': {
        'type':
            {'type': 'string', 'pattern': 'flexible' }
        ,
        'date': {
            'type': 'string',
            'format': 'dateFormat'
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

function daysInMonth(m, y)
{
    switch (m)
    {
    case 1 :
        return (y % 4 === 0 && y % 100) || y % 400 === 0 ? 29 : 28;
    case 8 : case 3 : case 5 : case 10 :
        return 30;
    default :
        return 31;
    }
}

function isValidDate(y, m, d)
{
    return m >= 0 && m < 12 && d > 0 && d <= daysInMonth(m, y);
}

Validator.prototype.customFormats.dateFormat = function(dateStr)
{
    if (!typeof(dateStr) === 'String' || !dateStr.includes('-'))
    {
        return false;
    }
    const dateArray = dateStr.split('-');
    const date = new Date(dateArray[0],dateArray[1], dateArray[2]);
    const validDate = (date instanceof(Date) && isFinite(date.getTime()) && isValidDate(dateArray[0],dateArray[1]-1, dateArray[2]));
    return validDate;
};

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

function validateJSON(instance)
{
    const v = new Validator();
    v.addSchema(schemaFlexibleEntry, '/flexibleEntry');
    v.addSchema(schemaWaivedEntry, '/waivedEntry');

    return v.validate(instance, schema).valid;

}

export {
    validateJSON
};