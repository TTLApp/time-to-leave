'use strict';

var Validator = require('jsonschema').Validator;

var schema = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "array",
    "items": [
        {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string"
                },
                "date": {
                    "type": "string"
                },
                "data": {
                    "type": "string"
                },
                "hours": {
                    "type": "string"
                }
            },
            "required": [
                "type",
                "date",
                "data",
                "hours"
            ]
        }
    ]
}

function validateJSON(instance){
    var v = new Validator();
    return v.validate(instance, schema);

}

export {
    validateJSON
};