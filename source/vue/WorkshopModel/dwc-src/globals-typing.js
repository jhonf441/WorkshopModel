'use strict'

// Typed values for RepRapFirmware global variables. The person picks a type and writes the value; the plugin writes the RRF literal
// (quotes doubled inside strings, arrays in braces) and the command: `global name = literal` to create, `set global.name = literal`
// to change. RRF has no map type for variables, so the types are int, float, bool, string, array and a raw expression. RRF cannot
// delete a global until the next reboot: there is no command for that here on purpose. Pure: test/globals-typing.test.js.

export const GLOBAL_TYPES = ['int', 'float', 'bool', 'string', 'array', 'expression']
export const GLOBAL_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export function isValidGlobalName(name) {
	return GLOBAL_NAME_RE.test(String(name || ''))
}

// the type of a live value, for the editor to start with
export function typeOfValue(v) {
	if (v === null || v === undefined) return 'null'
	if (typeof v === 'boolean') return 'bool'
	if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float'
	if (typeof v === 'string') return 'string'
	if (Array.isArray(v)) return 'array'
	return 'object'
}

// an RRF string literal: double quotes, a double quote inside is doubled
export function rrfString(s) {
	return '"' + String(s).replace(/"/g, '""') + '"'
}

// the RRF literal of a plain value: 12, 1.5, true, "text", {1,2,3}; one-element arrays take the trailing comma of the RRF syntax
export function rrfLiteral(v) {
	if (v === null || v === undefined) return 'null'
	if (typeof v === 'boolean') return v ? 'true' : 'false'
	if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null'
	if (typeof v === 'string') return rrfString(v)
	if (Array.isArray(v)) return v.length === 1 ? '{' + rrfLiteral(v[0]) + ',}' : '{' + v.map(rrfLiteral).join(',') + '}'
	return 'null'
}

// the text the editor shows for a live value (what parseTyped reads back): strings without quotes, arrays comma separated
export function editText(v) {
	if (v === null || v === undefined) return ''
	if (typeof v === 'string') return v
	if (Array.isArray(v)) return v.map(x => (typeof x === 'string' ? rrfString(x) : rrfLiteral(x))).join(', ')
	return rrfLiteral(v)
}

// splits "1, 2.5, "a,b", true" at the commas outside quotes and braces
function splitItems(text) {
	const out = []
	let cur = ''
	let quote = false
	let depth = 0
	for (const ch of String(text)) {
		if (ch === '"') quote = !quote
		if (!quote && (ch === '{' || ch === '[')) depth++
		if (!quote && (ch === '}' || ch === ']')) depth--
		if (ch === ',' && !quote && depth === 0) {
			out.push(cur)
			cur = ''
		} else cur += ch
	}
	out.push(cur)
	return out.map(s => s.trim()).filter(s => s !== '')
}

function parseItem(text) {
	const s = text.trim()
	if (/^[+-]?\d+$/.test(s)) return { ok: true, value: Number(s) }
	if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(s)) return { ok: true, value: Number(s) }
	if (/^(true|false)$/i.test(s)) return { ok: true, value: s.toLowerCase() === 'true' }
	if (/^".*"$/.test(s)) return { ok: true, value: s.slice(1, -1).replace(/""/g, '"') }
	if (/^'.*'$/.test(s)) return { ok: true, value: s.slice(1, -1) }
	return { ok: false, error: 'array_item' }
}

// -> { ok: true, value, literal } or { ok: false, error: 'empty' | 'int' | 'float' | 'bool' | 'array_item' | 'array_empty' }
export function parseTyped(kind, text) {
	const s = String(text === null || text === undefined ? '' : text).trim()
	if (kind === 'string') return { ok: true, value: String(text || ''), literal: rrfString(String(text || '')) }
	if (s === '') return { ok: false, error: 'empty' }
	if (kind === 'int') return /^[+-]?\d+$/.test(s) ? done(Number(s)) : { ok: false, error: 'int' }
	if (kind === 'float') return /^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(s) ? done(Number(s)) : { ok: false, error: 'float' }
	if (kind === 'bool') {
		if (/^(true|1|yes|on)$/i.test(s)) return done(true)
		if (/^(false|0|no|off)$/i.test(s)) return done(false)
		return { ok: false, error: 'bool' }
	}
	if (kind === 'array') return parseArray(s)
	return { ok: true, value: s, literal: s } // expression: sent as written
}

function done(value) {
	return { ok: true, value, literal: rrfLiteral(value) }
}

function parseArray(s) {
	const inner = /^[[{].*[\]}]$/.test(s) ? s.slice(1, -1) : s
	const items = splitItems(inner).map(parseItem)
	if (!items.length) return { ok: false, error: 'array_empty' }
	const bad = items.find(i => !i.ok)
	if (bad) return { ok: false, error: bad.error }
	return done(items.map(i => i.value))
}

// the command that creates (exists false) or changes (exists true) a global
export function globalCommand(name, literal, exists) {
	return exists ? 'set global.' + name + ' = ' + literal : 'global ' + name + ' = ' + literal
}

// name + typed text -> { ok, code } or { ok: false, error }
export function editCommand(name, kind, text, exists) {
	if (!isValidGlobalName(name)) return { ok: false, error: 'name' }
	const p = parseTyped(kind, text)
	if (!p.ok) return p
	return { ok: true, code: globalCommand(name, p.literal, !!exists), literal: p.literal, value: p.value }
}
