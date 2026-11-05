// Official DWC plugin localization: plugins.WorkshopModel.* (see src/i18n/index.ts of DuetWebControl).
// Import this file FIRST in index.js so the texts exist before any module that reads them at load time.
import { registerPluginLocalization } from '../../i18n'
import es from './i18n/es.json'
import en from './i18n/en.json'
import standardEs from './i18n/standard-es.json' // the texts of the session and help standard (3.6 only: the main catalogs stay equal to the 3.7 ones)
import standardEn from './i18n/standard-en.json'
import './language-reload.js' // the page loads again when the DWC language changes (vue/_shared36)

// ONE registration per language: DWC throws "Plugin i18n for the given plugin already exists" on a second one, and the plugin then does not load at all
const withStandard = (main, standard) => ({ ...main, model: { ...main.model, ...standard.model } })
registerPluginLocalization('WorkshopModel', 'es', withStandard(es, standardEs))
registerPluginLocalization('WorkshopModel', 'en', withStandard(en, standardEn))
