'use strict'

// Change highlight: which of the rows on screen changed since the last tick, and the list of recent changes with before and after.
// Pure: test/change-diff.test.js.

export const CHANGES_CAP = 100

// rows [{ path, text }] -> Map path -> text (branches, whose text is empty, are left out)
export function textMap(rows) {
	const m = new Map()
	for (const r of rows || []) {
		if (r && r.text !== '') m.set(r.path, r.text)
	}
	return m
}

// the paths present in both maps whose text differs -> [{ path, before, after }]
export function diffTexts(prev, next) {
	const out = []
	if (!prev || !next) return out
	next.forEach((after, path) => {
		if (prev.has(path)) {
			const before = prev.get(path)
			if (before !== after) out.push({ path, before, after })
		}
	})
	return out
}

// every difference between two maps path -> text, sorted by path in natural order:
// [{ path, before, after, state: 'changed' | 'added' | 'removed' }] (before is null for an added path, after for a removed one)
export function diffMaps(prev, next) {
	const out = []
	const a = prev || new Map()
	const b = next || new Map()
	b.forEach((after, path) => {
		if (!a.has(path)) out.push({ path, before: null, after, state: 'added' })
		else if (a.get(path) !== after) out.push({ path, before: a.get(path), after, state: 'changed' })
	})
	a.forEach((before, path) => {
		if (!b.has(path)) out.push({ path, before, after: null, state: 'removed' })
	})
	return out.sort((x, y) => x.path.localeCompare(y.path, undefined, { numeric: true }))
}

// newest first, capped at `cap` entries; t is the time of the tick
export function recordChanges(list, changes, t, cap) {
	const max = cap || CHANGES_CAP
	if (!changes || !changes.length) return list || []
	const fresh = changes.map(c => ({ path: c.path, before: c.before, after: c.after, t }))
	return fresh.concat(list || []).slice(0, max)
}
