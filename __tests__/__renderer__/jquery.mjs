// Helper file sets global window and $ for renderer imports
import jQuery from 'jquery';
import jsdom from 'jsdom';

global.window = new jsdom.JSDOM().window;
global.$ = jQuery(window);

// Mocking matchMedia since it's not usually defined but we use it
window.matchMedia = window.matchMedia || function()
{
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};
