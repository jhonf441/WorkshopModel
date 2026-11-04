'use strict'

// The Browse view: one level of the model at a time, with the path as a breadcrumb, a back button that remembers where you were,
// a filter and a sort for the keys of the level. The state is one plain object { path, history } that every function returns new
// (browseState, openLevel, goBack, goUp); the level itself is read from the live model on every tick (levelOf).
// Pure (no Vue, no DWC): test/views2-browse.test.js.

import { splitPath, joinPath, getAtPath, parentPath } from './model-path.js'
import { isBranch } from './value-format.js'
import { naturalCompare } from './natural-order.js'
import { childItems } from './columns-state.js'
import { KINDS } from './value-kind.js'

// a level builds at most LEVEL_MAX items (the view shows them FLAT_PAGE at a time, flat-list.js pageOf)
export const LEVEL_MAX = 2000
export const HISTORY_MAX = 50
export const SORTS = ['model', 'name', 'kind']

// what the wiring puts in view-choices.js VIEW_CHOICES: choice('browse', 'mdi-folder-open-outline', 'split'); its help keys
// (view_browse, view_browse_what, _why, _missing, _help) are in i18n/views2.*.json
export const VIEW = { id: 'browse', icon: 'mdi-folder-open-outline', layout: 'split' }

// the sort choices, each with the help of DESIGN.md section 7 (keys of plugins.WorkshopModel.model.*)
export const SORT_CHOICES = SORTS.map(id => ({
	id,
	label: 'browse_sort_' + id,
	what: 'browse_sort_' + id + '_what',
	why: 'browse_sort_' + id + '_why',
	ifMissing: 'browse_sort_' + id + '_missing',
	help: 'browse_sort_' + id + '_help'
}))

// 'move.axes[0]' -> [{ label: '', path: '' } (the root, named by the page), { label: 'move', path: 'move' },
// { label: 'axes', path: 'move.axes' }, { label: '[0]', path: 'move.axes[0]' }]
export function crumbsOf(path) {
	const out = [{ label: '', path: '' }]
	let p = ''
	for (const s of splitPath(path)) {
		p = joinPath(p, s.key, s.index)
		out.push({ label: s.index ? '[' + s.key + ']' : s.key, path: p })
	}
	return out
}

// -> { path, exists, items, total, truncated }: the keys under `path` ('' is the root); a leaf or a missing path has no items
export function levelOf(root, path, max) {
	const value = path ? getAtPath(root, path) : root
	if (!isBranch(value)) return { path, exists: value !== undefined, items: [], total: 0, truncated: false }
	return Object.assign({ path, exists: true }, childItems(value, path, max || LEVEL_MAX))
}

// the level to show for a path chosen elsewhere: the path when it is a branch, else the level that holds it
export function levelForPath(root, path) {
	if (!path) return ''
	return isBranch(getAtPath(root, path)) ? path : parentPath(path)
}

// the items whose key or value text has the query (case-insensitive)
export function filterItems(items, query) {
	const q = String(query || '').trim().toLowerCase()
	if (!q) return items
	return items.filter(it => it.label.toLowerCase().indexOf(q) >= 0 || it.text.toLowerCase().indexOf(q) >= 0)
}

// names compare as words, indices as numbers ('2' before '10')
function byName(a, b) {
	if (a.index && b.index) return Number(a.key) - Number(b.key)
	return naturalCompare(a.key, b.key)
}

export function sortItems(items, sort) {
	if (sort === 'name') return items.slice().sort(byName)
	if (sort === 'kind') return items.slice().sort((a, b) => KINDS.indexOf(a.info.kind) - KINDS.indexOf(b.info.kind) || byName(a, b))
	return items
}

// ---- the state: { path, history } ----
export function browseState(path) {
	return { path: path || '', history: [] }
}

export function openLevel(state, path) {
	const p = path || ''
	if (p === state.path) return state
	return { path: p, history: state.history.concat([state.path]).slice(-HISTORY_MAX) }
}

export function canGoBack(state) {
	return state.history.length > 0
}

export function goBack(state) {
	if (!canGoBack(state)) return state
	return { path: state.history[state.history.length - 1], history: state.history.slice(0, -1) }
}

export function goUp(state) {
	return state.path ? openLevel(state, parentPath(state.path)) : state
}
