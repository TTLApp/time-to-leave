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
            'pattern': /(1|2)[0-9]{3}-(0[1-9]{1}|1[0-1]{1})-(0[0-9]{1}|1[0-9]{1}|2[0-9]{1}|3[0-1]{1})$/
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
            'pattern': /(1|2)[0-9]{3}-(0[1-9]{1}|1[0-1]{1})-(0[0-9]{1}|1[0-9]{1}|2[0-9]{1}|3[0-1]{1})$/
        },
        'values': {
            'type': 'array',
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