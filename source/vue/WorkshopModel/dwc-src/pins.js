'use strict'

// Favourites ("pins"): a small list of paths of the object model the person keeps at hand, stored in this browser under its own key.
// The page owns the list and hands it to every view as the `pinned` prop (VIEW-CONTRACT.md); a view shows a star (FavoriteStar.vue)
// and emits pin / unpin, and the section toolbar shows the list (PinnedStrip.vue). Lists are never changed in place: every function
// returns a new one. Pure (the storage is passed in, any object with getItem / setItem): test/views2-density-pins.test.js.

import { splitPath } from './model-path.js'

export const PINS_KEY = 'workshopModelPins'
export const PINS_FORMAT = 'workshop-model-pins'
export const PINS_VERSION = 1
export const PINS_MAX = 24
export const PATH_MAX = 300

// the row the page shows about the list (help of DESIGN.md section 7): keys of plugins.WorkshopModel.model.*
export const PINS_ROW = {
	id: 'pins',
	label: 'pins_row',
	what: 'pins_row_what',
	why: 'pins_row_why',
	ifMissing: 'pins_row_missing',
	help: 'pins_row_help'
}

function validPath(p) {
	return typeof p === 'string' && p.trim() !== '' && p.length <= PATH_MAX
}

// unique, valid paths in their order, at most PINS_MAX
export function cleanPins(list) {
	const out = []
	for (const p of Array.isArray(list) ? list : []) {
		if (validPath(p) && out.indexOf(p.trim()) < 0) out.push(p.trim())
	}
	return out.slice(0, PINS_MAX)
}

export function isPinned(list, path) {
	return (list || []).indexOf(path) >= 0
}

export function isFull(list) {
	return (list || []).length >= PINS_MAX
}

// what a tap on the star of `path` asks: 'unpin', 'pin', or null (no path, or the list is full)
export function pinAction(list, path) {
	if (!validPath(path)) return null
	if (isPinned(list, path)) return 'unpin'
	return isFull(list) ? null : 'pin'
}

// at the end; a full list does not grow (the star says why)
export function addPin(list, path) {
	const l = cleanPins(list)
	return pinAction(l, path) === 'pin' ? l.concat([path.trim()]) : l
}

export function removePin(list, path) {
	return cleanPins(list).filter(p => p !== path)
}

// one place up (-1) or down (+1); out of range leaves the list as it is
export function movePin(list, path, delta) {
	const l = cleanPins(list)
	const i = l.indexOf(path)
	const j = i + delta
	if (i < 0 || j < 0 || j >= l.length) return l
	l.splice(i, 1)
	l.splice(j, 0, path)
	return l
}

// the short name of a pinned path: its last key, with the key before it when the last one is an index ('move.axes[0]' -> 'axes[0]')
export function pinLabel(path) {
	const segs = splitPath(path)
	if (!segs.length) return String(path || '')
	const last = segs[segs.length - 1]
	if (!last.index) return last.key
	const before = segs.length > 1 && !segs[segs.length - 2].index ? segs[segs.length - 2].key : ''
	return before + '[' + last.key + ']'
}

export function serializePins(list) {
	return JSON.stringify({ format: PINS_FORMAT, version: PINS_VERSION, paths: cleanPins(list) })
}

export function parsePins(text) {
	let o = null
	try {
		o = typeof text === 'string' ? JSON.parse(text) : text
	} catch (e) {
		return []
	}
	if (!o || o.format !== PINS_FORMAT || !Array.isArray(o.paths)) return []
	return cleanPins(o.paths)
}

export function loadPins(storage) {
	try {
		return parsePins(storage ? storage.getItem(PINS_KEY) : null)
	} catch (e) {
		return []
	}
}

// true when it was stored (a browser without storage keeps the list while the page is open)
export function savePins(storage, list) {
	try {
		storage.setItem(PINS_KEY, serializePins(list))
		return true
	} catch (e) {
		return false
	}
}
