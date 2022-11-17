const languages = {
    'bn':'বাংলা',
    'ca-CA': 'Catalàn',
    'de-DE': 'Deutsch',
    'en': 'English',
    'es': 'Español',
    'fr-FR': 'Français - France',
    'gu': 'ગુજરાતી',
    'he':'עברית',
    'hi': 'हिंदी',
    'id': 'Bahasa Indonesia',
    'it': 'Italiano',
    'ja': '日本語',
    'ko': '한국어',
    'mr': 'मराठी',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'pt-BR': 'Português - Brasil',
    'pt-MI': 'Português - Minerês',
    'pt-PT': 'Português - Portugal',
    'ru-RU': 'Русский',
    'sv-SE': 'Svenska',
    'ta': 'தமிழ்',
    'th-TH': 'ไทย',
    'tr-TR':'Türkçe',
    'zh-TW': '繁體中文'
};

/**
* Get supported language map
* @return {Map<String,String>}
*/
function getLanguageMap()
{
    return languages;
}

/**
* Get supported language codes
* @return {Array}
*/
function getLanguagesCodes()
{
    return Object.keys(languages);
}

/**
* Returns the name of a given language code
* @param {String} code Locale for the language
* @return {String}
*/
function getLanguageName(code)
{
    return languages[code];
}

const fallbackLng = 'es';
const namespace = 'translation';

export {
    fallbackLng,
    namespace,
    getLanguageMap,
    getLanguagesCodes,
    getLanguageName
};
