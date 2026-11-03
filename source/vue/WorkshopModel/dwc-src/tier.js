'use strict'

// The SBC tier of the Model Explorer: detected at run time from the object model, never a setting. The base tier (tree, globals,
// watch, presets, persistence macro, usage finder) works on a standalone Duet through DWC's machine file API. With a Duet in SBC
// mode (model.sbc with DSF SBC_MIN_DSF or newer and plugin support) the same code unlocks the extras that only make sense when the
// files live on the Pi's disk and DSF publishes more of the model: the watch history kept in a plugin-owned file (WATCH_FILE), the
// bigger budget of the usage finder, and the DSF-only branches (sbc.*, plugins.*). A companion plugin on the Pi (COMPANION_ID,
// designed in docs-internal/MODEL-EDITOR-DESIGN.md, not built) is reported when it is installed and running, so the page can offer
// its functions; nothing of the base tier needs it. Pure: test/tier.test.js.

import { compareVersions, parseVersion } from './rrf-version.js'

export const SBC_MIN_DSF = '3.4'
export const WATCH_FILE = '0:/sys/workshop-model-watch.json'
export const COMPANION_ID = 'WorkshopModelAgent'

// -> { sbc, dsfVersion, extras, reason, minimum, companion: { installed, running } }
// reason when the extras are off: 'no_sbc' (standalone Duet), 'no_dsf' (SBC without DSF data yet), 'old_dsf', 'no_plugin_support'
export function detectTier(model) {
	const sbc = model && model.sbc ? model.sbc : null
	const companion = companionState(model)
	if (!sbc) return off(false, null, 'no_sbc', companion)
	const dsf = sbc.dsf || null
	const version = dsf && typeof dsf.version === 'string' ? dsf.version : null
	if (!version || !parseVersion(version)) return off(true, version, 'no_dsf', companion)
	if (dsf.pluginSupport === false) return off(true, version, 'no_plugin_support', companion)
	if (compareVersions(version, SBC_MIN_DSF) < 0) return off(true, version, 'old_dsf', companion)
	return { sbc: true, dsfVersion: version, extras: true, reason: null, minimum: SBC_MIN_DSF, companion }
}

function off(sbc, version, reason, companion) {
	return { sbc, dsfVersion: version, extras: false, reason, minimum: SBC_MIN_DSF, companion }
}

// the companion plugin of the Pi, if the person installed it: model.plugins.get(COMPANION_ID) with a process (pid > 0)
export function companionState(model) {
	const plugins = model && model.plugins
	let entry = null
	if (plugins && typeof plugins.get === 'function') entry = plugins.get(COMPANION_ID) || null
	else if (plugins && typeof plugins === 'object') entry = plugins[COMPANION_ID] || null
	return { installed: !!entry, running: !!(entry && entry.pid > 0) }
}

// how much the usage finder may read: files and bytes per file. A standalone Duet serves every file through the board's own
// web server, so the budget is small there; on the Pi the files are local to DSF and the budget is wide.
export function scanBudget(tier) {
	return tier && tier.extras ? { files: 500, bytesPerFile: 1048576 } : { files: 80, bytesPerFile: 131072 }
}

// how many snapshots of the model the plugin keeps and how many values each may hold. On a standalone Duet the file goes through the
// board's own web server to its SD card, so it stays small; in SBC mode it is a file on the disk of the Pi and may be much bigger.
export function snapshotBudget(tier) {
	return tier && tier.extras ? { count: 20, leaves: 10000 } : { count: 4, leaves: 4000 }
}
