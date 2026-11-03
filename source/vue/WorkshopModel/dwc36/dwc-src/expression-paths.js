'use strict'

// The path picker of the expression builder: model paths from the live model with a search, each with its kind and current value, and
// the value at a path for the chip next to the field. For the hole assistant: the leaves of one type (a hole that wants a number is
// offered number paths), the real items of a collection (the axes, heaters, tools or fans this board has), the names of the globals,
// and the closest real path to one that is not in the model (a typo gets a suggestion). Reuses model-tree.js (childrenOf, searchModel)
// and value-format.js. Pure: test/expression-builder.test.js, test/expression-guided.test.js.

import { childrenOf, searchModel, MAX_DEPTH } from './model-tree.js'
import { joinPath, getAtPath, splitPath, isMap } from './model-path.js'
import { kindOf, isBranch, formatValue } from './value-format.js'

export const PICK_LIMIT = 40
export const CHOICES_LIMIT = 12
const TYPE_OF_KIND = { int: 'number', float: 'number', bool: 'bool', string: 'string', array: 'array', object: 'object', null: 'null' }

function rowOf(path, value) {
	const branch = isBranch(value)
	return { path, kind: kindOf(value), text: branch ? '' : formatValue(value), branch, size: branch ? childrenOf(value).length : 0 }
}

// a kind of value-format.js -> a type of expression-types.js
export function typeOfKind(kind) {
	return TYPE_OF_KIND[kind] || 'any'
}

// no query: the first level of the model (a way in); a query: searchModel (key or whole path, and values) -> [{ path, kind, text, branch, size }]
export function pathChoices(model, query, limit) {
	const max = limit || PICK_LIMIT
	const q = String(query || '').trim()
	if (!model) return []
	if (!q) return childrenOf(model).slice(0, max).map(c => rowOf(joinPath('', c.key, c.index), c.value))
	return searchModel(model, q, max).map(r => rowOf(r.path, getAtPath(model, r.path)))
}

// the children of a branch path, to go down one level: [{ path, kind, text, branch, size }]
export function pathChildren(model, path, limit) {
	const v = getAtPath(model, path)
	if (!isBranch(v)) return []
	return childrenOf(v).slice(0, limit || PICK_LIMIT).map(c => rowOf(joinPath(path, c.key, c.index), c.value))
}

// the rows that fit a wanted type ('' keeps all): leaves of that type, arrays for 'array', and the branches to go down
export function filterRows(rows, wanted) {
	if (!wanted) return rows || []
	return (rows || []).filter(r => (wanted === 'array' ? r.kind === 'array' || r.kind === 'object' : r.branch || typeOfKind(r.kind) === wanted))
}

// true when a row can be put where a wanted type is expected
export function rowFits(row, wanted) {
	if (!wanted) return true
	return typeOfKind(row.kind) === wanted
}

// -> { found, kind, text, branch } for the chip: what the model has at the path now
export function valueAt(model, path) {
	const v = path ? getAtPath(model, path) : undefined
	if (v === undefined) return { found: false, kind: 'null', text: '', branch: false }
	const r = rowOf(path, v)
	return { found: true, kind: r.kind, text: r.text, branch: r.branch }
}

// the first paths of the model whose value has the type (number, string, bool or array), depth first, at most limit
export function pathsOfType(model, type, limit) {
	const out = []
	const max = limit || PICK_LIMIT
	if (!model || !type) return out
	const walk = (value, parent, depth) => {
		for (const c of childrenOf(value)) {
			if (out.length >= max) return
			const path = joinPath(parent, c.key, c.index)
			const kind = kindOf(c.value)
			if (typeOfKind(kind) === type) out.push(rowOf(path, c.value))
			if (isBranch(c.value) && depth < MAX_DEPTH) walk(c.value, path, depth + 1)
		}
	}
	walk(model, '', 0)
	return out
}

// the items of a collection of the model (move.axes, heat.heaters, tools, fans...) as choices for an index hole:
// [{ code: '0', label: 'X' }] with the letter or the name of the item when it has one; { choices, size }
export function collectionChoices(model, path, limit) {
	const list = model ? getAtPath(model, path) : undefined
	if (!Array.isArray(list)) return { choices: [], size: 0 }
	const max = limit || CHOICES_LIMIT
	const choices = []
	for (let i = 0; i < list.length && choices.length < max; i++) {
		const item = list[i]
		const label = item && typeof item === 'object' ? String(item.letter || item.name || '') : ''
		choices.push({ code: String(i), label })
	}
	return { choices, size: list.length }
}

// the names of the globals the board has now, at most limit
export function globalNames(model, limit) {
	const g = model && model.global
	const out = []
	for (const c of childrenOf(g)) {
		if (out.length >= (limit || CHOICES_LIMIT)) break
		out.push(c.key)
	}
	return out
}

function distance(a, b) {
	const m = a.length
	const n = b.length
	let prev = Array.from({ length: n + 1 }, (_, j) => j)
	for (let i = 1; i <= m; i++) {
		const cur = [i]
		for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
		prev = cur
	}
	return prev[n]
}

// the key of a branch closest to a wanted key (same letters apart from case, one contains the other when the wanted one is not
// tiny, or one changed letter per three), or ''
function closestKey(value, wanted) {
	const w = String(wanted).toLowerCase()
	let best = ''
	let bestScore = Infinity
	for (const c of childrenOf(value)) {
		if (c.index) continue
		const k = c.key.toLowerCase()
		const contains = w.length >= 3 && (k.indexOf(w) >= 0 || w.indexOf(k) >= 0)
		const score = k === w ? 0 : contains ? 1 : distance(k, w)
		if (score < bestScore) {
			bestScore = score
			best = c.key
		}
	}
	return bestScore <= Math.max(1, Math.floor(w.length / 3)) ? best : ''
}

// the closest real path to one the model does not have: the longest prefix that exists, then the most similar key (or the last
// index of the list); '' when nothing of it exists
export function closestPath(model, path) {
	if (!model) return ''
	let value = model
	let prefix = ''
	for (const seg of splitPath(path)) {
		if (value === null || typeof value !== 'object') return prefix
		const next = isMap(value) ? value.get(seg.key) : value[seg.index ? Number(seg.key) : seg.key]
		if (next !== undefined) {
			prefix = joinPath(prefix, seg.key, seg.index)
			value = next
			continue
		}
		if (seg.index) return Array.isArray(value) && value.length ? prefix + '[' + (value.length - 1) + ']' : prefix
		const key = closestKey(value, seg.key)
		return key ? joinPath(prefix, key, false) : prefix
	}
	return prefix
}
