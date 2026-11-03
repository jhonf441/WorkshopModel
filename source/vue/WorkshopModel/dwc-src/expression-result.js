'use strict'

// What the board answered, read for a person: the type of the value (number, bool, string, array, object, null) and, when the
// answer is an error, what it means in plain words with a hint. The raw text stays available. echo prints a value as text
// (strings without quotes, arrays as [1,2], objects as {a:1}); M409 answers JSON, so its type is exact. Pure: test/expression-builder.test.js.

import { parseReply } from './expression-tester.js'
import { kindOf } from './value-format.js'

export const RESULT_TYPES = ['number', 'bool', 'string', 'array', 'object', 'null']
const NUMBER_RE = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$|^[-+]?(nan|inf)$/i

// the type of a JS value from the model or from JSON
export function typeOfValue(v) {
	const k = kindOf(v)
	if (k === 'int' || k === 'float') return 'number'
	if (k === 'bool' || k === 'string' || k === 'array' || k === 'object' || k === 'null') return k
	return 'string'
}

// the text echo printed -> { type, size } (size: how many items, for an array or an object that reads as JSON, else null)
export function typeOfEcho(text) {
	const s = String(text === null || text === undefined ? '' : text).trim()
	if (s === 'null') return { type: 'null', size: null }
	if (s === 'true' || s === 'false') return { type: 'bool', size: null }
	if (NUMBER_RE.test(s)) return { type: 'number', size: null }
	if (/^\[[\s\S]*\]$/.test(s)) return { type: 'array', size: sizeOfJson(s) }
	if (/^\{[\s\S]*\}$/.test(s)) return { type: 'object', size: sizeOfJson(s) }
	return { type: 'string', size: null }
}

function sizeOfJson(s) {
	try {
		const v = JSON.parse(s)
		return Array.isArray(v) ? v.length : Object.keys(v).length
	} catch (e) {
		return null
	}
}

// the patterns of the error texts of RepRapFirmware, most specific first: kind -> the key lint-like texts error_<kind> and error_<kind>_hint
const ERROR_PATTERNS = [
	['index', /index|out of range|out of bounds|subscript/i],
	['divide', /divi(de|sion) by zero/i],
	['function', /unknown function|undefined function|bad function/i],
	['name', /unknown (value|variable|identifier|property|name|object)|not found|no such|undefined (value|variable)|doesn't exist|does not exist/i],
	['operator', /operator/i],
	['type', /cannot convert|wrong type|type mismatch|bad type|expected (a )?(number|string|bool|integer|array)|non-numeric|not a number/i],
	['quote', /unterminated|missing (closing )?quote|string.*(not|un)closed/i],
	['syntax', /expected|missing|unexpected|unbalanced|bad expression|syntax|invalid expression|bracket|parenthes/i]
]

// the token the board named, between quotes, if any
function namedToken(text) {
	const m = /['"]([^'"]+)['"]/.exec(text)
	return m ? m[1] : ''
}

// an error reply of the board and the expression that caused it -> { kind, what, guard } (guard: the name is a global, var or param
// the expression should have wrapped in exists(), which changes the hint)
export function explainError(reply, expression) {
	const text = String(reply === null || reply === undefined ? '' : reply)
	let kind = 'generic'
	for (const [k, re] of ERROR_PATTERNS) {
		if (re.test(text)) {
			kind = k
			break
		}
	}
	const what = namedToken(text)
	const source = what + ' ' + String(expression || '')
	const guard = kind === 'name' && /\b(global|var|param)\./.test(source) && !/\bexists\s*\(/.test(String(expression || ''))
	return { kind, what, guard }
}

// mode + the raw reply + the expression sent -> { ok, text, value, type, size, problem }
// problem is null, or { kind, what, guard } when the board answered with an error
export function describeReply(mode, reply, expression) {
	const r = parseReply(mode, reply)
	if (!r.ok) return Object.assign({}, r, { type: null, size: null, problem: explainError(r.text, expression) })
	if (mode === 'm409') {
		const type = typeOfValue(r.value)
		const size = type === 'array' ? r.value.length : type === 'object' ? Object.keys(r.value).length : null
		return Object.assign({}, r, { type, size, problem: null })
	}
	return Object.assign({}, r, typeOfEcho(r.text), { problem: null })
}
