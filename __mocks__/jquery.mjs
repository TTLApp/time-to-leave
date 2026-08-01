// Helper file sets global window and $ for renderer imports
import { createRequire } from 'module';
import jsdom from 'jsdom';

const require = createRequire(import.meta.url);
global.window = new jsdom.JSDOM().window;
window.$ = global.$ = require('jquery');

// Mocking matchMedia since it's not usually defined but we use it
window.matchMedia = window.matchMedia || function()
{
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

// Mocking requestAnimationFrame since it's not usually defined but we use it
global.requestAnimationFrame = callback => callback();

// Mocking resizeTo since it's not implemented by JSDOM but used by the calendar
window.resizeTo = () => {};
