/*eslint-disable no-global-assign*/
'use strict';

// Using esm module to be able to mix node 'require' and ES6 'import' statements
// while we don't move to a newer electron+node system that has this by default
// See https://github.com/electron/electron/issues/21457.

require = require('esm')(module);
module.exports = require('./esm-workday-waiver-bridge.js');
