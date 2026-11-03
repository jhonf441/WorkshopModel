'use strict'

// How a value of the object model is shown and copied: a short text for a row of the tree, and a plain JSON-able copy (Map to
// object, Array to array) for the presets and the exports. Pure: test/value-format.test.js.

import { isMap } from './model-path.js'

export const TEXT_MAX = 120
export const PLAIN_DEPTH = 12

export function kindOf(v) {
	if (v === null || v === undefined) return 'null'
	if (typeof v === 'boolean') return 'bool'
	if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float'
	if (typeof v === 'string') return 'string'
	if (Array.isArray(v)) return 'array'
	if (typeof v === 'object') return 'object'
	return 'other'
}

export function isBranch(v) {
	const k = kindOf(v)
	return k === 'array' || k === 'object'
}

export function clip(text, max) {
	const s = String(text)
	const n = max || TEXT_MAX
	return s.length > n ? s.slice(0, n - 3) + '...' : s
}

// one line for a row: null, true, 12, 1.5, "text", [3] for an array of 3, {5} for an object with 5 keys
export function formatValue(v) {
	const kind = kindOf(v)
	if (kind === 'null') return 'null'
	if (kind === 'bool') return v ? 'true' : 'false'
	if (kind === 'int' || kind === 'float') return Number.isFinite(v) ? String(v) : (isNaN(v) ? 'NaN' : (v > 0 ? 'Infinity' : '-Infinity'))
	if (kind === 'string') return clip(JSON.stringify(v))
	if (kind === 'array') return '[' + v.length + ']'
	if (kind === 'object') return '{' + (isMap(v) ? v.size : Object.keys(v).filter(k => !k.startsWith('__')).length) + '}'
	return String(v)
}

// a plain copy: numbers, strings, booleans and null as they are; arrays and objects copied; depth-limited (deeper levels become null)
export function toPlain(v, depth) {
	const d = depth === undefined ? PLAIN_DEPTH : depth
	const kind = kindOf(v)
	if (kind === 'null' || kind === 'bool' || kind === 'string') return kind === 'null' ? null : v
	if (kind === 'int' || kind === 'float') return Number.isFinite(v) ? v : null
	if (d <= 0) return null
	if (kind === 'array') return v.map(x => toPlain(x, d - 1))
	if (kind === 'object') {
		const out = {}
		if (isMap(v)) v.forEach((value, key) => { out[String(key)] = toPlain(value, d - 1) })
		else Object.keys(v).forEach(k => { if (!k.startsWith('__') && typeof v[k] !== 'function') out[k] = toPlain(v[k], d - 1) })
		return out
	}
	return null
}
