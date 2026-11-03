'use strict'

// Favourite expressions: the ones the person keeps, stored in this browser under their own key (like the pins of pins.js). An entry
// is { mode, text, name } (mode 'echo' or 'm409'; name is optional, the text is the name when empty). Lists are never changed in
// place. Pure (the storage is passed in, any object with getItem / setItem): test/expression-builder.test.js.

export const EXPRESSIONS_KEY = 'workshopModelExpressions'
export const EXPRESSIONS_FORMAT = 'workshop-model-expressions'
export const EXPRESSIONS_VERSION = 1
export const EXPRESSIONS_MAX = 30
export const TEXT_MAX = 400
export const NAME_MAX = 60

function clean(x) {
	if (!x || typeof x.text !== 'string') return null
	const text = x.text.trim()
	if (!text || text.length > TEXT_MAX || /[\r\n]/.test(text)) return null
	const name = typeof x.name === 'string' ? x.name.trim().slice(0, NAME_MAX) : ''
	return { mode: x.mode === 'm409' ? 'm409' : 'echo', text, name }
}

// valid entries, no repeats of mode + text, at most EXPRESSIONS_MAX
export function cleanFavorites(list) {
	const out = []
	for (const x of Array.isArray(list) ? list : []) {
		const c = clean(x)
		if (c && !out.some(o => o.mode === c.mode && o.text === c.text)) out.push(c)
	}
	return out.slice(0, EXPRESSIONS_MAX)
}

export function hasFavorite(list, mode, text) {
	return (list || []).some(o => o.mode === mode && o.text === String(text || '').trim())
}

export function isFavoritesFull(list) {
	return (list || []).length >= EXPRESSIONS_MAX
}

// at the top (the newest first); one already there moves to the top; a full list drops the oldest
export function addFavorite(list, entry) {
	const c = clean(entry)
	if (!c) return cleanFavorites(list)
	return cleanFavorites([c].concat((list || []).filter(o => !(o.mode === c.mode && o.text === c.text))))
}

export function removeFavorite(list, mode, text) {
	return cleanFavorites((list || []).filter(o => !(o.mode === mode && o.text === text)))
}

export function serializeFavorites(list) {
	return JSON.stringify({ format: EXPRESSIONS_FORMAT, version: EXPRESSIONS_VERSION, items: cleanFavorites(list) })
}

export function parseFavorites(text) {
	let o = null
	try {
		o = typeof text === 'string' ? JSON.parse(text) : text
	} catch (e) {
		return []
	}
	if (!o || o.format !== EXPRESSIONS_FORMAT || !Array.isArray(o.items)) return []
	return cleanFavorites(o.items)
}

export function loadFavorites(storage) {
	try {
		return parseFavorites(storage ? storage.getItem(EXPRESSIONS_KEY) : null)
	} catch (e) {
		return []
	}
}

// true when it was stored (a browser without storage keeps the list while the page is open)
export function saveFavorites(storage, list) {
	try {
		storage.setItem(EXPRESSIONS_KEY, serializeFavorites(list))
		return true
	} catch (e) {
		return false
	}
}
