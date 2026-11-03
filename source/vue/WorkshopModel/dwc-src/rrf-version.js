'use strict'

// Firmware version checks of the Model Explorer. Global variables (global.*, set, exists()) need RepRapFirmware GLOBALS_MIN_RRF or
// newer. On an older board the plugin keeps the tree, the watch list and the path helper and switches the globals features off with
// one line saying why: the manifest carries no rrfVersion on purpose, so the plugin degrades instead of refusing to install.
// Pure (no imports): test/rrf-version.test.js.

export const GLOBALS_MIN_RRF = '3.4'

// "3.6.0-rc.1+2" -> [3, 6, 0]; null when the text does not start with a number
export function parseVersion(text) {
	const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(text === null || text === undefined ? '' : text))
	if (!m) return null
	return [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)]
}

// -1, 0 or 1 like a comparator (arrays or texts); a version that cannot be read counts as the lowest
export function compareVersions(a, b) {
	const pa = Array.isArray(a) ? a : parseVersion(a)
	const pb = Array.isArray(b) ? b : parseVersion(b)
	if (!pa && !pb) return 0
	if (!pa) return -1
	if (!pb) return 1
	for (let i = 0; i < 3; i++) {
		const x = pa[i] || 0
		const y = pb[i] || 0
		if (x !== y) return x < y ? -1 : 1
	}
	return 0
}

// model.boards[0].firmwareVersion, or null while the board has not reported it
export function firmwareVersionOf(model) {
	const boards = model && model.boards
	const first = boards && typeof boards.length === 'number' && boards.length > 0 ? boards[0] : null
	const v = first && first.firmwareVersion
	return typeof v === 'string' && v.trim() ? v.trim() : null
}

// { known: the board reported a version, ok: globals can be used, version: the text or null, minimum: GLOBALS_MIN_RRF }
export function globalsSupport(firmwareVersion) {
	const parsed = parseVersion(firmwareVersion)
	return {
		known: !!parsed,
		ok: !!parsed && compareVersions(parsed, GLOBALS_MIN_RRF) >= 0,
		version: parsed ? String(firmwareVersion).trim() : null,
		minimum: GLOBALS_MIN_RRF
	}
}
