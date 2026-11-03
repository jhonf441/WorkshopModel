// Official DWC plugin localization: plugins.WorkshopModel.* (see src/i18n/index.ts of DuetWebControl).
// Import this file FIRST in index.js so the texts exist before any module that reads them at load time.
import { registerPluginLocalization } from '../../i18n'
import es from './i18n/es.json'
import en from './i18n/en.json'
import './language-reload.js' // the page loads again when the DWC language changes (vue/_shared36)

registerPluginLocalization('WorkshopModel', 'es', es)
registerPluginLocalization('WorkshopModel', 'en', en)
