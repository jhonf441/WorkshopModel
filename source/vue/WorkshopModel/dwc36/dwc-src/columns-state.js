'use strict'

// The Columns view, like a file browser: the keys of the model in the first column; picking a branch opens its keys in the next
// column, and so on down to the selected path. The columns are rebuilt from the live model and the selected path on every tick
// (nothing else is kept), and the arrow keys move through them (stepColumns). Pure (no Vue, no DWC): test/views2-columns.test.js.

import { splitPath, joinPath, getAtPath } from './model-path.js'
import { childrenOf } from './model-tree.js'
import { formatValue, isBranch } from './value-format.js'
import { kindInfo } from './value-kind.js'
import { pageOf, FLAT_PAGE } from './flat-list.js'
import { humanize } from './value-human.js'

// a column builds at most COLUMN_MAX items (the view shows them FLAT_PAGE at a time, flat-list.js pageOf)
export const COLUMN_MAX = 2000
export const COLUMNS_MAX_DEPTH = 24

// what the wiring puts in view-choices.js VIEW_CHOICES: choice('columns', 'mdi-view-column-outline', 'full'); its help keys
// (view_columns, view_columns_what, _why, _missing, _help) are in i18n/views2.*.json
export const VIEW = { id: 'columns', icon: 'mdi-view-column-outline', layout: 'full' }

// one child as a line of a column or of a level: { key, label, index, path, branch, info, count, text }
export function itemOf(child, parent) {
	const branch = isBranch(child.value)
	const path = joinPath(parent, child.key, child.index)
	const info = kindInfo(child.value, path)
	return {
		key: child.key,
		label: child.index ? '[' + child.key + ']' : child.key,
		index: child.index,
		path,
		branch,
		info,
		count: info.size,
		text: branch ? '' : formatValue(child.value)
	}
}

// the children of a value as items, at most `max`; the key `keep` is added when it falls past the limit (the open one stays visible)
export function childItems(value, parent, max, keep) {
	const all = childrenOf(value)
	const cap = max || COLUMN_MAX
	const items = all.slice(0, cap).map(c => itemOf(c, parent))
	if (keep !== null && keep !== undefined && all.length > cap && !items.some(i => i.key === keep)) {
		const c = all.find(x => x.key === keep)
		if (c) items.push(itemOf(c, parent))
	}
	return { items, total: all.length, truncated: all.length > cap }
}

// one segment down: the child of a value by a segment of splitPath
function childValue(value, seg) {
	return getAtPath(value, joinPath('', seg.key, seg.index))
}

// -> [{ path, items, total, truncated, active }]: the root column, then one per branch on the way to `path` (the path itself
// included when it is a branch); `active` is the key open in that column (null in the last one)
export function columnsFor(root, path, max) {
	const segs = splitPath(path)
	const cols = []
	let value = root
	let parent = ''
	for (let i = 0; i <= segs.length && i <= COLUMNS_MAX_DEPTH; i++) {
		if (!isBranch(value)) break
		const seg = segs[i] || null
		cols.push(Object.assign({ path: parent, active: seg ? seg.key : null }, childItems(value, parent, max, seg ? seg.key : null)))
		if (!seg) break
		value = childValue(value, seg)
		parent = joinPath(parent, seg.key, seg.index)
	}
	return cols
}

// the rows of a column on screen: `pages` pages of FLAT_PAGE (flat-list.js pageOf), more when needed to show the open key
// -> { rows, more }
export function visibleItems(column, pages, size) {
	const n = size || FLAT_PAGE
	const at = column.items.findIndex(it => it.key === column.active)
	return pageOf(column.items, Math.max(pages || 1, at >= 0 ? Math.floor(at / n) + 1 : 1), n)
}

// the selected path when it is a leaf: { path, info, text, human (value-human.js humanize: null or { key, params, color }) };
// null for a branch, the root or a path that is not in the model
export function leafOf(root, path) {
	if (!path) return null
	const value = getAtPath(root, path)
	if (value === undefined || isBranch(value)) return null
	return { path, info: kindInfo(value, path), text: formatValue(value), human: humanize(path, value) }
}

// the column that holds `path` as one of its items (the deepest one), or -1
export function columnIndexOf(columns, path) {
	for (let i = columns.length - 1; i >= 0; i--) {
		if (columns[i].items.some(it => it.path === path)) return i
	}
	return -1
}

function stepInColumn(items, i, key) {
	if (key === 'ArrowDown') return items[Math.min(items.length - 1, i + 1)]
	if (key === 'ArrowUp') return items[Math.max(0, i - 1)]
	if (key === 'Home') return items[0]
	if (key === 'End') return items[items.length - 1]
	return null
}

// The path an arrow key leads to from `path`, or null when the key does nothing there. Up / Down / Home / End move in the column of
// the path, Left goes to the parent, Right opens a branch on its first key. With nothing selected, Down or Right picks the first key.
export function stepColumns(columns, path, key) {
	const first = columns.length && columns[0].items.length ? columns[0].items[0].path : null
	const ci = columnIndexOf(columns, path)
	if (ci < 0) return key === 'ArrowDown' || key === 'ArrowRight' ? first : null
	const items = columns[ci].items
	const here = items.findIndex(it => it.path === path)
	if (key === 'ArrowLeft') return ci > 0 ? columns[ci].path : null
	if (key === 'ArrowRight') {
		const next = columns[ci + 1]
		return items[here].branch && next && next.items.length ? next.items[0].path : null
	}
	const to = stepInColumn(items, here, key)
	return to && to.path !== path ? to.path : null
}
