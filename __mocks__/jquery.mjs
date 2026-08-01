// Helper file sets global window and $ for renderer imports
import jsdom from 'jsdom';

global.window = new jsdom.JSDOM().window;
window.$ = global.$ = (await import('jquery')).default;

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
