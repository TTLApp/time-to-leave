const languages = {
    'ca-CA': 'Catalàn',
    'de-DE': 'Deutsch',
    'en': 'English',
    'es': 'Español',
    'fr-FR': 'Français - France',
    'hi': 'हिंदी',
    'gu': 'ગુજરાતી',
    'id': 'Bahasa Indonesia',
    'ko': '한국어',
    'it': 'Italiano',
    'ja': '日本語',
    'mr': 'मराठी',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'pt-BR': 'Português - Brasil',
    'ru-RU': 'Русский',
    'dev' : 'Português - Minerês',
    'th-TH': 'ไทย',
    'zh-TW': '繁體中文',
    'ta': 'தமிழ்',
    'tr-TR':'Türkçe',
    'bn':'বাংলা',
    'he':'עברית'
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
