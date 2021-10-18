const i18n = require('i18next');
const i18nextBackend = require('i18next-node-fs-backend');
const config = require('../configs/app.config');
const path = require('path');
const { appConfig } = require('../../js/app-config');

const i18nextOptions = {
    backend:{
        // path where resources get loaded from
        loadPath: path.join(appConfig.appPath, 'locales/{{lng}}/{{ns}}.json'),
        // path to post missing resources
        addPath: path.join(appConfig.appPath, 'locales/{{lng}}/{{ns}}.missing.json'),
        // jsonIndent to use when storing json files
        jsonIndent: 2,
    },
    interpolation: {
        escapeValue: false
    },
    saveMissing: true,
    fallbackLng: config.fallbackLng,
    supportedLngs: config.getLanguagesCodes(),
    locales: config.getLanguagesCodes(),
    react: {
        wait: false
    }
};

i18n.use(i18nextBackend);

// initialize if not already initialized
if (!i18n.isInitialized)
{
    i18n.init(i18nextOptions);
}

module.exports = i18n;