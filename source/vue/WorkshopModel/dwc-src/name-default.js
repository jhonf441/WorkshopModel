'use strict'

// The name something is saved under is always shown BEFORE it is stored (2026-11-03): a snapshot and a preset get a default name the
// field shows pre-filled and the page repeats in one line ("It will be saved as: ..."); what the person types wins, and a cleared
// field falls back to the default. An exported file shows its name the same way (the components ask data-exchange.js exchangeFileName
// before the button is pressed). Pure (no Vue, no DWC): test/name-default.test.js.

import { defaultSnapshotName } from './snapshots.js'

// typed text + the default -> { name: what will be stored, custom: the person wrote it, valid: it passes the rule }
export function resolveName(typed, fallback, re) {
	const own = String(typed === null || typed === undefined ? '' : typed).trim()
	const name = own || String(fallback || '')
	return { name, custom: !!own && own !== String(fallback || ''), valid: re instanceof RegExp ? re.test(name) : !!name }
}

// what the field keeps after the person types: the text as typed, or nothing when it is the default again (so the default follows the
// scope and the clock until the person writes something of their own)
export function typedName(value, fallback) {
	const v = String(value === null || value === undefined ? '' : value)
	return v.trim() === String(fallback || '') ? '' : v
}

// the default name of a preset: "<prefix> yyyy-mm-dd hh:mm", numbered when that name is taken (the same rule as the snapshots)
export function defaultPresetName(prefix, now, taken) {
	return defaultSnapshotName(prefix, '', now, taken)
}
