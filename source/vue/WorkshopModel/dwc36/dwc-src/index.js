'use strict'

// WorkshopModel -- "Model Explorer" page (2026-11-01), DWC 3.6 line: the object model of the board as a live tree with the globals
// as one of its branches, a typed editor of globals, a watch list with sparklines, the preview of every command before it is sent,
// presets, the persistence macro 0:/sys/workshop-globals.g and the usage finder over 0:/sys and 0:/macros. It needs no
// WorkshopService and no Raspberry: everything goes through DWC's own machine API, so it works on a standalone Duet; with an SBC
// it unlocks extras by itself (tier.js). Design: docs-internal/MODEL-EDITOR-DESIGN.md.

import './i18n-register.js'
import { registerRoute } from '../../routes'
import * as serviceProblem from './service-problem.js'

import page from './ModelExplorer.vue'
import './theme.css'

// HOOK (shared piece, outside this plugin): this plugin does not use the workshop service, so its page bar must not report a missing
// service, or a Duet without a Raspberry, as a fault. When vue/_shared36/service-problem.js exports markServiceOptional() -- a
// per-bundle switch that makes serviceProblemKind() answer null -- it is called here; until then the bar shows the shared notice.
if (typeof serviceProblem.markServiceOptional === 'function') serviceProblem.markServiceOptional()

registerRoute(page, {
	Plugins: {
		WorkshopModel: {
			icon: 'mdi-file-tree',
			caption: 'plugins.WorkshopModel.common.menu_caption',
			path: '/Plugins/Model'
		}
	}
})
