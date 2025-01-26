'use strict';

function getOriginalUserPreferences()
{
    const preferences = process.argv.filter((arg) => arg.startsWith('--preferences='))[0]?.split('=')?.[1];
    console.log(preferences);
    return JSON.parse(preferences || '{}');
}

const rendererApi = {
    getOriginalUserPreferences
};

export {
    rendererApi
};
