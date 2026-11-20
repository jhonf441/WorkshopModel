'use strict'

// The options of the path select of the alert form (3.6 line): the paths of the live model the person can pick for a rule, in two groups. The
// watched paths come first (the ones the person already follows), then the rest of the model. Only values, never a branch: an alert compares
// one value. A rule on a number (above, below) is offered the number paths only. With a text the search runs over the names, the whole paths
// and the values (searchModel); with none the select opens on the watched paths and the first numbers or values of the model. Pure:
// test/alert-path-select.test.js.

import { searchModel } from './model-tree.js'
import { getAtPath } from './model-path.js'
import { kindOf, isBranch, formatValue } from './value-format.js'
import { typeOfKind } from './expression-paths.js'
import { flattenModel } from './flat-list.js'

export const OPTIONS_LIMIT = 60

const fits = (kind, numeric) => !numeric || typeOfKind(kind) === 'number'
const leaf = (path, kind, text) => ({ path, kind, text })

// -> { watched: [{ path, kind, text }], model: [{ path, kind, text }], more } ; `more` is true when the list was cut at the limit
export function pathOptions(model, query, opts) {
	const o = Object.assign({ numeric: false, watched: [], limit: OPTIONS_LIMIT }, opts)
	const q = String(query || '').trim().toLowerCase()
	const out = { watched: [], model: [], more: false }
	if (!model) return out
	const seen = new Set()
	for (const path of o.watched) {
		const v = getAtPath(model, path)
		if (v === undefined || isBranch(v)) continue
		const kind = kindOf(v)
		if (!fits(kind, o.numeric) || (q && path.toLowerCase().indexOf(q) < 0)) continue
		out.watched.push(leaf(path, kind, formatValue(v)))
		seen.add(path)
	}
	let found
	if (q) {
		found = searchModel(model, q, o.limit * 4).filter(r => !seen.has(r.path) && fits(r.kind, o.numeric)).map(r => leaf(r.path, r.kind, r.text))
	} else {
		found = flattenModel(model, o.limit * 8).leaves.filter(l => !seen.has(l.path) && l.kind !== 'array' && l.kind !== 'object' && fits(l.kind, o.numeric)).map(l => leaf(l.path, l.kind, l.text))
	}
	out.more = found.length > o.limit
	out.model = found.slice(0, o.limit)
	return out
}

// a path chosen or typed -> what the model has there now: { found, kind, text } (a branch is not a value to compare)
export function currentOf(model, path) {
	const v = path ? getAtPath(model, path) : undefined
	if (v === undefined) return { found: false, kind: 'null', text: '', branch: false }
	return { found: true, kind: kindOf(v), text: isBranch(v) ? '' : formatValue(v), branch: isBranch(v) }
}
