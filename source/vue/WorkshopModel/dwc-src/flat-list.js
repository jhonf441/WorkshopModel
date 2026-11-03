'use strict'

// The flat list of the object model: every leaf (a value that is not a branch, or a branch with nothing inside) with its path, its
// kind and its one-line text, plus the filters (text, kind group, changed recently, watched) and the sort of the Flat list view.
// The same leaves feed every view through the view contract (VIEW-CONTRACT.md). Pure: test/flat-list.test.js.

import { joinPath } from './model-path.js'
import { childrenOf, MAX_DEPTH } from './model-tree.js'
import { kindOf, isBranch, formatValue } from './value-format.js'

export const FLAT_MAX = 6000
export const FLAT_PAGE = 200
export const RECENT_MS = 60000
export const SORT_KEYS = ['path', 'value', 'type', 'changed']

// the kind groups the Flat list filters by: id -> the kinds of value-format.js kindOf in it
export const KIND_GROUPS = [
	{ id: 'number', kinds: ['int', 'float'] },
	{ id: 'bool', kinds: ['bool'] },
	{ id: 'string', kinds: ['string'] },
	{ id: 'null', kinds: ['null', 'other'] },
	{ id: 'empty', kinds: ['array', 'object'] }
]

export function kindGroup(kind) {
	const g = KIND_GROUPS.find(x => x.kinds.indexOf(kind) >= 0)
	return g ? g.id : 'null'
}

function leafOf(c, path, kind) {
	const plain = kind === 'array' || kind === 'object' ? null : c.value
	return { path, key: c.key, kind, text: formatValue(c.value), value: plain === undefined ? null : plain }
}

// root -> { leaves: [{ path, key, kind, text, value }], truncated } in the order of the model, depth first, at most `limit` leaves
export function flattenModel(root, limit) {
	const leaves = []
	const max = limit || FLAT_MAX
	let truncated = false
	const walk = (node, parent, depth) => {
		for (const c of childrenOf(node)) {
			if (leaves.length >= max) {
				truncated = true
				return
			}
			const path = joinPath(parent, c.key, c.index)
			const kind = kindOf(c.value)
			const open = isBranch(c.value) && childrenOf(c.value).length > 0
			if (open && depth < MAX_DEPTH) walk(c.value, path, depth + 1)
			else if (!open) leaves.push(leafOf(c, path, kind))
		}
	}
	walk(root, '', 0)
	return { leaves, truncated }
}

function asSet(list) {
	if (list instanceof Set) return list
	return new Set(list || [])
}

function changedAt(times, path) {
	if (!times) return 0
	const t = typeof times.get === 'function' ? times.get(path) : times[path]
	return typeof t === 'number' ? t : 0
}

// f = { query, groups: [group ids] (none = all), onlyChanged, onlyWatched, times (Map path -> ms), watched (paths), now, recentMs }
export function filterLeaves(leaves, f) {
	const o = f || {}
	const q = String(o.query || '').trim().toLowerCase()
	const groups = asSet(o.groups)
	const watched = asSet(o.watched)
	const since = (o.now || 0) - (o.recentMs || RECENT_MS)
	return (leaves || []).filter(l => {
		if (groups.size && !groups.has(kindGroup(l.kind))) return false
		if (o.onlyWatched && !watched.has(l.path)) return false
		if (o.onlyChanged && changedAt(o.times, l.path) < since) return false
		if (q && l.path.toLowerCase().indexOf(q) < 0 && l.text.toLowerCase().indexOf(q) < 0) return false
		return true
	})
}

const naturalOrder = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })

function compareValues(a, b) {
	const na = typeof a.value === 'number'
	const nb = typeof b.value === 'number'
	if (na && nb) return a.value - b.value
	if (na !== nb) return na ? -1 : 1
	return naturalOrder(a.text, b.text)
}

function comparator(by, times) {
	if (by === 'value') return compareValues
	if (by === 'type') return (a, b) => naturalOrder(a.kind, b.kind) || naturalOrder(a.path, b.path)
	if (by === 'changed') return (a, b) => changedAt(times, b.path) - changedAt(times, a.path) || naturalOrder(a.path, b.path)
	return (a, b) => naturalOrder(a.path, b.path)
}

// a sorted copy; by one of SORT_KEYS ('changed' puts the newest change first), desc reverses it
export function sortLeaves(leaves, by, desc, times) {
	const key = SORT_KEYS.indexOf(by) >= 0 ? by : 'path'
	const out = (leaves || []).slice().sort(comparator(key, times))
	return desc ? out.reverse() : out
}

// the first `pages` pages of `size` rows -> { rows, more: how many are left }
export function pageOf(list, pages, size) {
	const n = Math.max(1, pages || 1) * (size || FLAT_PAGE)
	const all = list || []
	return { rows: all.slice(0, n), more: Math.max(0, all.length - n) }
}
