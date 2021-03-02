const languages = {
    'ca-CA': 'Catalàn',
    'de-DE': 'Deutsch',
    'en': 'English',
    'es': 'Español',
    'fr-FR': 'Français - France',
    'hi': 'हिंदी',
    'id': 'Bahasa Indonesia',
    'ko': '한국어',
    'it': 'Italiano',
    'mr': 'मराठी',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'pt-BR': 'Português - Brasil',
    'dev' : 'Português - Minerês',
    'th-TH': 'ไทย',
    'zh-TW': '繁體中文',
    'ta': 'தமிழ்'
};

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

module.exports = {
    languages: ['en', 'pt-BR', 'es', 'it', 'zh-TW', 'de-DE', 'hi', 'mr', 'pl', 'nl', 'th-TH', 'dev', 'ta'],
    fallbackLng: 'en',
    namespace: 'translation',
    getLanguagesCodes,
    getLanguageName
};
