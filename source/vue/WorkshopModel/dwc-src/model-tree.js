'use strict'

// Reading the object model as a tree: the children of a node, the rows of the expanded nodes as the page draws them, and the search
// by key and by value. Pure (no Vue, no DWC): it works on DWC's model classes (ModelObject, ModelCollection = Array, ModelDictionary
// = Map), on plain objects and on the fakes of the tests. test/model-tree.test.js.

import { joinPath, isMap } from './model-path.js'
import { kindOf, isBranch, formatValue } from './value-format.js'

export const MAX_DEPTH = 24
export const MAX_ROWS = 3000
export const SEARCH_LIMIT = 200

// -> [{ key, index, value }] in the order of the model; functions and private keys left out
export function childrenOf(v) {
	if (v === null || v === undefined || typeof v !== 'object') return []
	if (Array.isArray(v)) return v.map((value, i) => ({ key: String(i), index: true, value }))
	if (isMap(v)) return Array.from(v.entries(), e => ({ key: String(e[0]), index: false, value: e[1] }))
	return Object.keys(v).filter(k => !k.startsWith('__') && typeof v[k] !== 'function').map(key => ({ key, index: false, value: v[key] }))
}

export function childCount(v) {
	if (v === null || v === undefined || typeof v !== 'object') return 0
	if (Array.isArray(v)) return v.length
	if (isMap(v)) return v.size
	return Object.keys(v).filter(k => !k.startsWith('__') && typeof v[k] !== 'function').length
}

function rowOf(c, path, depth, expanded) {
	const kind = kindOf(c.value)
	const branch = isBranch(c.value)
	return { path, key: c.key, depth, kind, branch, text: branch ? '' : formatValue(c.value), count: branch ? childCount(c.value) : 0, open: branch && expanded.has(path) }
}

// The rows of the tree: the keys of the root and, under each expanded node (paths in `expanded`, a Set), its children, depth first.
// -> { rows: [{ path, key, depth, kind, branch, text, count, open }], truncated }
export function visibleRows(root, expanded, limit) {
	const rows = []
	const max = limit || MAX_ROWS
	let truncated = false
	const walk = (value, parent, depth) => {
		for (const c of childrenOf(value)) {
			if (rows.length >= max) {
				truncated = true
				return
			}
			const row = rowOf(c, joinPath(parent, c.key, c.index), depth, expanded)
			rows.push(row)
			if (row.open && depth < MAX_DEPTH) walk(c.value, row.path, depth + 1)
		}
	}
	walk(root, '', 0)
	return { rows, truncated }
}

// Search by key and by value, case-insensitive. A query with a dot or a bracket is matched against the whole path, a plain word
// against the key; the value text of a leaf is always searched. -> [{ path, kind, text, inKey, inValue }], at most `limit` results
export function searchModel(root, query, limit) {
	const q = String(query || '').trim().toLowerCase()
	const out = []
	if (!q) return out
	const max = limit || SEARCH_LIMIT
	const wholePath = q.indexOf('.') >= 0 || q.indexOf('[') >= 0
	const walk = (value, parent, depth) => {
		for (const c of childrenOf(value)) {
			if (out.length >= max) return
			const path = joinPath(parent, c.key, c.index)
			const branch = isBranch(c.value)
			const text = branch ? '' : formatValue(c.value)
			const inKey = (wholePath ? path : c.key).toLowerCase().indexOf(q) >= 0
			const inValue = !branch && text.toLowerCase().indexOf(q) >= 0
			if (inKey || inValue) out.push({ path, kind: kindOf(c.value), text, inKey, inValue })
			if (branch && depth < MAX_DEPTH) walk(c.value, path, depth + 1)
		}
	}
	walk(root, '', 0)
	return out
}

// the paths of a row and of every parent above it (to open the tree down to a search result)
export function ancestorsOf(path) {
	const out = []
	const s = String(path || '')
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '.' || s[i] === '[') out.push(s.slice(0, i))
	}
	return out
}
