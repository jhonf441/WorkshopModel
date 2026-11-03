'use strict'

// The globals in groups by the start of their name: the part before the first underscore (probe_offset -> probe) or before the first
// capital letter (laserFocus -> laser). A group needs at least GROUP_MIN members; the rest go to Other. Which groups are folded is
// remembered in this browser. Pure: test/globals-groups.test.js.

export const GROUP_MIN = 2
export const OTHER = '__other__'
export const FOLDED_KEY = 'workshopModelGlobalsFolded'

// 'probe_offset' -> 'probe', 'laserFocus' -> 'laser', 'X1' -> null (nothing to group by)
export function prefixOf(name) {
	const s = String(name || '')
	const u = s.indexOf('_')
	if (u > 0) return s.slice(0, u).toLowerCase()
	const m = /^([a-z0-9]+)[A-Z]/.exec(s)
	return m ? m[1].toLowerCase() : null
}

// names -> [{ id (the prefix, or OTHER), names }] with the groups in name order and Other last; names keep their order inside
export function groupNames(names) {
	const by = new Map()
	for (const n of names || []) {
		const p = prefixOf(n)
		const key = p || OTHER
		if (!by.has(key)) by.set(key, [])
		by.get(key).push(n)
	}
	const groups = []
	const other = (by.get(OTHER) || []).slice()
	by.forEach((list, key) => {
		if (key === OTHER) return
		if (list.length >= GROUP_MIN) groups.push({ id: key, names: list })
		else other.push(...list)
	})
	groups.sort((a, b) => a.id.localeCompare(b.id))
	if (other.length) groups.push({ id: OTHER, names: other })
	return groups
}

export function readFolded(storage) {
	try {
		const v = JSON.parse((storage && storage.getItem(FOLDED_KEY)) || '[]')
		return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
	} catch (e) {
		return []
	}
}

export function saveFolded(storage, list) {
	try {
		storage.setItem(FOLDED_KEY, JSON.stringify(list || []))
		return true
	} catch (e) {
		return false
	}
}

export function toggleFolded(list, id) {
	const l = list || []
	return l.indexOf(id) >= 0 ? l.filter(x => x !== id) : l.concat([id])
}
