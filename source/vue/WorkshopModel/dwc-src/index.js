'use strict'

// WorkshopModel -- "Model Explorer" page (2026-11-01): the object model of the board as a live tree with the globals as one of its
// branches, a typed editor of globals, a watch list with sparklines, the preview of every command before it is sent, presets, the
// persistence macro 0:/sys/workshop-globals.g and the usage finder over 0:/sys and 0:/macros. It needs no WorkshopService and no
// Raspberry: everything goes through DWC's own machine API, so it works on a standalone Duet; with an SBC it unlocks extras by
// itself (tier.js). Design: docs-internal/MODEL-EDITOR-DESIGN.md.

import './i18n-register.js'
import { registerRoute } from 'DuetWebControl'
import { onPluginUnload, removePluginRoute } from './dwc-host.js'
import * as serviceProblem from './service-problem.js'
import './language-reload.js' // the page loads again when the DWC language changes (vue/_shared)

import page from './ModelExplorer.vue'
import './theme.css'
import './look.css' // the friendlier look of this plugin (mo-* classes only, on top of the family)

// HOOK (shared piece, outside this plugin): this plugin does not use the workshop service, so its page bar must not report a missing
// service, or a Duet without a Raspberry, as a fault. When vue/_shared/service-problem.js (and _shared36) exports markServiceOptional()
// -- a per-bundle switch that makes serviceProblemKind() answer null -- it is called here; until then the bar shows the shared notice.
if (typeof serviceProblem.markServiceOptional === 'function') serviceProblem.markServiceOptional()

registerRoute(page, {
	Plugins: {
		WorkshopModel: {
			icon: 'mdi-telescope',
			caption: 'plugins.WorkshopModel.common.menu_caption',
			path: '/Plugins/Model'
		}
	}
})

// DWC 3.7 does not undo anything when the plugin is stopped: take the page out so that a later start registers the new component
onPluginUnload('WorkshopModel', () => {
	removePluginRoute('/Plugins/Model')
})
