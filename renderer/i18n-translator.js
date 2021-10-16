'use strict';

function translatePage(language)
{
    const languageData = window.mainApi.getDataByLanguage(language)['translation'];
    $('html').attr('lang', language);

    function getDataRecursive(array, keyList)
    {
        if (keyList.length === 0)
        {
            throw new Error('Empty key list');
        }
        if (keyList.length === 1)
        {
            return array[keyList];
        }
        else
        {
            return getDataRecursive(array[keyList[0]], keyList.splice(1));
        }
    }

    function getDataInMap(key)
    {
        const keyList = key.split('.');
        return getDataRecursive(languageData, keyList);
    }

    function translateElement(element)
    {
        const attr = $(element).attr('data-i18n');
        if (typeof attr !== 'undefined' && attr !== false && attr.length > 0)
        {
            $(element).html(getDataInMap(attr));
        }
    }

    const callback = (key, value) => { translateElement(value); };
    $('title').each(callback);
    $('body').each(callback);
    $('p').each(callback);
    $('label').each(callback);
    $('div').each(callback);
    $('span').each(callback);
    $('option').each(callback);
}

export { translatePage };