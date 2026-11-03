'use strict'

// The type checker of the expression builder: reads an RRF expression (expression-tokens.js), follows the rules of RepRapFirmware
// expressions the plugin is sure about and says, before anything is sent, what makes no sense: a text or a boolean where a number
// is needed (+ - * / < <= > >=, the math and angle functions), a text compared with a number, && or || on something that is not
// true or false, # of something that is not a list or a text, [ ] on something that is not a list or with a position that is not a
// number or past the end, a function the catalog does not have, a wrong number of arguments, exists() on something that is not a
// path, dividing by 0, an operator RRF does not have, a lone operator, something left over. Model paths are typed from the live
// model (a value that is null now counts as unknown, never as wrong) and a path the model does not have is a warning with the
// closest real path, never a block, because the copy DWC keeps may lag. Rules the plugin is not sure about only warn (joining a
// list into a text, the two results of ? : of different types).
//
// The version rule: the firmware of the board decides. A function name the catalog lacks is an ERROR only when the board runs a
// firmware the catalog covers (its major.minor is not newer than the newest `since` of the catalog); on a newer firmware it is a
// neutral note, because the function may be newer than this plugin knows, and the expression is sent as written.
//
// Every hole <name> takes whatever its place asks for and records it (`holes`: the expected type and where it sits), which is what the
// hole assistant (expression-holes.js) tells the person. -> { type, findings: [{ kind, level, what, start, end, ... }], holes }
// with kind one of CHECK_KINDS (texts guided_check_<kind>) and level 'error' (blocks), 'warn' or 'note'. Pure:
// test/expression-guided.test.js.

import { tokenize } from './expression-tokens.js'
import { getAtPath } from './model-path.js'
import { kindOf } from './value-format.js'
import { typeOfKind, closestPath } from './expression-paths.js'
import { functionInfo, beyondCatalog } from './expression-catalog.js'
import { compareVersions, parseVersion } from './rrf-version.js'

export const TYPES = ['number', 'string', 'bool', 'array', 'object', 'null', 'any']
export const LEVELS = ['error', 'warn', 'note']
export const CHECK_KINDS = ['type_mismatch', 'concat_type', 'compare_types', 'hash_type', 'index_not_list', 'index_not_number', 'index_out_of_range', 'function_unknown', 'function_maybe_newer', 'function_needs', 'arg_count', 'exists_not_path', 'path_missing', 'macro_only', 'divide_zero', 'bad_operator', 'bad_char', 'single_quote', 'incomplete', 'leftover', 'branches_differ']
export const WHERE_ROLES = ['alone', 'operand', 'arg', 'index', 'cond', 'branch', 'hash', 'member']

const KEYWORDS = { true: 'bool', false: 'bool', null: 'null', pi: 'number', iterations: 'number', result: 'number' }
const BINARY_LEVELS = [['||'], ['&&'], ['=', '==', '!=', '<', '<=', '>', '>='], ['+', '-', '^'], ['*', '/']]
const ARITH = ['+', '-', '*', '/']
const ORDER = ['<', '<=', '>', '>=']
const EQUALITY = ['=', '==', '!=']
const WHAT_MAX = 40

function peek(st) {
	return st.toks[st.i] || null
}
function at(st, type, text) {
	const t = peek(st)
	return !!t && t.type === type && (text === undefined || t.text === text)
}
function take(st) {
	return st.toks[st.i++]
}
function what(st, start, end) {
	const s = st.text.slice(start, end).trim()
	return s.length > WHAT_MAX ? s.slice(0, WHAT_MAX - 3) + '...' : s
}
function node(kind, type, start, end, extra) {
	return Object.assign({ kind, type, start, end }, extra || {})
}
function concrete(type) {
	return type !== 'any' && type !== 'hole'
}

// one finding per kind and place; extra fields (need, got, op, closest...) are the parameters of its text
function report(st, kind, level, start, end, extra) {
	if (st.findings.some(f => f.kind === kind && f.start === start)) return
	st.findings.push(Object.assign({ kind, level, what: what(st, start, end), start, end }, extra || {}))
}

// does a type fit what a place needs? ('scalar': anything but a list or an object; 'list_or_text': what # counts)
export function fits(type, need) {
	if (!concrete(type) || need === 'any') return true
	if (need === 'scalar') return type !== 'array' && type !== 'object'
	if (need === 'list_or_text') return type === 'array' || type === 'string'
	return type === need
}

// a hole takes what the place needs (recorded for the assistant); anything else must fit
function demand(st, n, need, where) {
	if (n.kind === 'hole') {
		st.expectations.set(n.start, { expect: need, where })
		return true
	}
	return fits(n.type, need)
}

function closeBracket(st, open, fallbackEnd) {
	const closer = { '(': ')', '[': ']', '{': '}' }[open.text]
	if (at(st, 'close', closer)) return take(st).end
	report(st, 'incomplete', 'error', open.start, open.end)
	return fallbackEnd
}

function parseExpression(st) {
	return parseTernary(st)
}

function parseTernary(st) {
	const cond = parseBinary(st, 0)
	if (!at(st, 'op', '?')) return cond
	const q = take(st)
	const then = parseTernary(st)
	let other
	if (at(st, 'op', ':')) {
		take(st)
		other = parseTernary(st)
	} else {
		report(st, 'incomplete', 'error', q.start, q.end)
		other = node('missing', 'any', then.end, then.end)
	}
	if (!demand(st, cond, 'bool', { role: 'cond', what: '? :' })) report(st, 'type_mismatch', 'error', cond.start, cond.end, { op: '? :', need: 'bool', got: cond.type })
	if (then.kind === 'hole') demand(st, then, concrete(other.type) ? other.type : 'any', { role: 'branch', what: '? :', other: what(st, other.start, other.end) })
	if (other.kind === 'hole') demand(st, other, concrete(then.type) ? then.type : 'any', { role: 'branch', what: '? :', other: what(st, then.start, then.end) })
	let type = 'any'
	if (concrete(then.type) && concrete(other.type)) {
		if (then.type === other.type) type = then.type
		else report(st, 'branches_differ', 'warn', q.start, other.end, { left: then.type, right: other.type })
	}
	return node('ternary', type, cond.start, other.end)
}

function parseBinary(st, level) {
	if (level >= BINARY_LEVELS.length) return parseUnary(st)
	let left = parseBinary(st, level + 1)
	while (at(st, 'op') && BINARY_LEVELS[level].indexOf(peek(st).text) >= 0) {
		const op = take(st)
		const right = parseBinary(st, level + 1)
		left = binaryNode(st, op, left, right)
	}
	return left
}

function binaryNode(st, op, left, right) {
	const t = op.text
	const start = left.start
	const end = right.end
	const sides = [[left, right], [right, left]]
	const where = (n, o) => ({ role: 'operand', what: t, other: what(st, o.start, o.end) })
	if (ARITH.indexOf(t) >= 0 || ORDER.indexOf(t) >= 0) {
		for (const [n, o] of sides) if (!demand(st, n, 'number', where(n, o))) report(st, 'type_mismatch', 'error', n.start, n.end, { op: t, need: 'number', got: n.type })
		if (t === '/' && right.kind === 'number' && right.value === 0) report(st, 'divide_zero', 'error', right.start, right.end)
		return node('binary', ARITH.indexOf(t) >= 0 ? 'number' : 'bool', start, end)
	}
	if (t === '^') {
		for (const [n, o] of sides) if (!demand(st, n, 'scalar', where(n, o))) report(st, 'concat_type', 'warn', n.start, n.end, { got: n.type })
		return node('binary', 'string', start, end)
	}
	if (EQUALITY.indexOf(t) >= 0) {
		if (left.kind === 'hole') demand(st, left, concrete(right.type) ? right.type : 'any', where(left, right))
		if (right.kind === 'hole') demand(st, right, concrete(left.type) ? left.type : 'any', where(right, left))
		if (concrete(left.type) && concrete(right.type) && left.type !== right.type && left.type !== 'null' && right.type !== 'null') {
			report(st, 'compare_types', 'error', start, end, { op: t, left: left.type, right: right.type })
		}
		return node('binary', 'bool', start, end)
	}
	for (const [n, o] of sides) if (!demand(st, n, 'bool', where(n, o))) report(st, 'type_mismatch', 'error', n.start, n.end, { op: t, need: 'bool', got: n.type })
	return node('binary', 'bool', start, end)
}

function parseUnary(st) {
	const t = peek(st)
	if (!t || t.type !== 'op' || ['!', '-', '+', '#'].indexOf(t.text) < 0) return parsePostfix(st)
	take(st)
	const operand = parseUnary(st)
	if (t.text === '#') {
		if (!demand(st, operand, 'list_or_text', { role: 'hash', what: '#' })) report(st, 'hash_type', 'error', operand.start, operand.end, { got: operand.type })
		return node('unary', 'number', t.start, operand.end)
	}
	const need = t.text === '!' ? 'bool' : 'number'
	if (!demand(st, operand, need, { role: 'operand', what: t.text })) report(st, 'type_mismatch', 'error', operand.start, operand.end, { op: t.text, need, got: operand.type })
	return node('unary', need, t.start, operand.end)
}

// [ ] after something that is not a path (a group, a call): the base must be a list, the position a number
function parsePostfix(st) {
	let n = parsePrimary(st)
	while (at(st, 'open', '[')) {
		const open = take(st)
		const idx = parseExpression(st)
		const end = closeBracket(st, open, idx.end)
		if (!demand(st, idx, 'number', { role: 'index', what: what(st, n.start, n.end) })) report(st, 'index_not_number', 'error', idx.start, idx.end, { got: idx.type })
		if (concrete(n.type) && n.type !== 'array' && n.type !== 'string') report(st, 'index_not_list', 'error', n.start, n.end, { got: n.type })
		n = node('index', 'any', n.start, end)
	}
	return n
}

function parsePrimary(st) {
	const t = peek(st)
	if (!t) {
		const prev = st.toks[st.i - 1]
		report(st, 'incomplete', 'error', prev ? prev.start : 0, prev ? prev.end : 0)
		return node('missing', 'any', prev ? prev.end : 0, prev ? prev.end : 0)
	}
	if (t.type === 'number') return node('number', 'number', take(st).start, t.end, { value: t.value })
	if (t.type === 'string') return node('string', 'string', take(st).start, t.end, { value: t.value })
	if (t.type === 'hole') {
		const h = node('hole', 'hole', take(st).start, t.end, { name: t.name })
		st.holes.push(h)
		return h
	}
	if (t.type === 'open' && t.text !== '[') {
		take(st)
		const inner = parseExpression(st)
		return node('group', inner.type, t.start, closeBracket(st, t, inner.end))
	}
	if (t.type === 'word') {
		take(st)
		return at(st, 'open', '(') && peek(st).start === t.end ? parseCall(st, t) : parsePath(st, t)
	}
	if (t.type === 'bad') {
		take(st)
		report(st, /[&|%~]/.test(t.text) ? 'bad_operator' : t.text === "'" ? 'single_quote' : 'bad_char', 'error', t.start, t.end)
		return peek(st) ? parsePrimary(st) : node('missing', 'any', t.end, t.end)
	}
	report(st, 'incomplete', 'error', t.start, t.end)
	return node('missing', 'any', t.start, t.start)
}

function parseCall(st, word) {
	const open = take(st)
	const args = []
	if (word.text === 'exists') st.quiet++
	if (!at(st, 'close', ')')) {
		args.push(parseExpression(st))
		while (at(st, 'comma')) {
			take(st)
			args.push(parseExpression(st))
		}
	}
	if (word.text === 'exists') st.quiet--
	const end = closeBracket(st, open, args.length ? args[args.length - 1].end : open.end)
	return checkCall(st, word, args, end)
}

function checkCall(st, word, args, end) {
	const name = word.text
	const info = functionInfo(name)
	if (!info) {
		if (beyondCatalog(st.firmware) || !parseVersion(st.firmware)) report(st, 'function_maybe_newer', 'note', word.start, word.end, { version: st.firmware || '' })
		else report(st, 'function_unknown', 'error', word.start, word.end, { version: st.firmware })
		args.forEach((a, i) => demand(st, a, 'any', { role: 'arg', what: name, n: i + 1 }))
		return node('call', 'any', word.start, end)
	}
	if (parseVersion(st.firmware) && compareVersions(st.firmware, info.since) < 0) report(st, 'function_needs', 'error', word.start, word.end, { version: info.since })
	const min = info.args.length
	if (args.length < min || (!info.more && args.length > min)) report(st, 'arg_count', 'error', word.start, end, { need: info.more ? min + '+' : String(min), got: args.length })
	args.forEach((a, i) => {
		const need = info.args[Math.min(i, info.args.length - 1)]
		const where = { role: 'arg', what: name, n: i + 1 }
		if (need === 'path') {
			if (a.kind === 'hole') demand(st, a, 'path', where)
			else if (a.kind !== 'path') report(st, 'exists_not_path', 'error', a.start, a.end)
		} else if (!demand(st, a, need, where)) {
			report(st, 'type_mismatch', 'error', a.start, a.end, { op: name, need, got: a.type })
		}
	})
	return node('call', info.returns, word.start, end)
}

// a word and what continues it without a space: [index], .member or .<hole> (a name still to type), any number of times
function parsePath(st, word) {
	const parts = []
	let end = word.end
	for (;;) {
		if (at(st, 'open', '[') && peek(st).start === end) {
			const open = take(st)
			const idx = parseExpression(st)
			end = closeBracket(st, open, idx.end)
			parts.push({ index: idx })
		} else if (at(st, 'member') && peek(st).start === end) {
			const m = take(st)
			end = m.end
			parts.push({ member: m.text })
		} else if (at(st, 'dot') && peek(st).start === end && st.toks[st.i + 1] && st.toks[st.i + 1].type === 'hole') {
			take(st)
			const h = take(st)
			st.holes.push(node('hole', 'hole', h.start, h.end, { name: h.name }))
			st.expectations.set(h.start, { expect: 'word', where: { role: 'member', what: word.text } })
			end = h.end
			parts.push({ hole: h.name })
		} else break
	}
	if (!parts.length && KEYWORDS[word.text]) return node('literal', KEYWORDS[word.text], word.start, end, { value: word.text })
	return resolvePath(st, node('path', 'any', word.start, end, { base: word.text, parts }))
}

// the type of a path from the live model, and what is wrong with its indexes; var.* and param.* only exist inside a macro
function resolvePath(st, n) {
	const root = n.base.split('.')[0]
	if (root === 'var' || root === 'param') {
		report(st, 'macro_only', 'note', n.start, n.end)
		for (const p of n.parts) if (p.index) demand(st, p.index, 'number', { role: 'index', what: n.base })
		return n
	}
	let known = !!st.model
	let value = known ? getAtPath(st.model, n.base) : undefined
	let path = n.base
	for (const p of n.parts) {
		if (p.hole) {
			path += '.<' + p.hole + '>'
			known = false
			continue
		}
		if (p.member) {
			path += p.member
			if (known && value !== undefined) value = getAtPath(value, p.member.slice(1))
			continue
		}
		const idx = p.index
		if (!demand(st, idx, 'number', { role: 'index', what: path })) report(st, 'index_not_number', 'error', idx.start, idx.end, { got: idx.type })
		if (known && value !== undefined) {
			const type = typeOfKind(kindOf(value))
			if (!Array.isArray(value)) {
				report(st, 'index_not_list', type === 'string' ? 'warn' : 'error', n.start, idx.start - 1, { what: path, got: type })
				known = false
			} else if (idx.kind !== 'number') {
				known = false
			} else if (!Number.isInteger(idx.value) || idx.value < 0 || idx.value >= value.length) {
				if (!st.quiet) report(st, 'index_out_of_range', 'error', n.start, idx.end, { what: path, n: value.length, max: value.length - 1 })
				known = false
			} else value = value[idx.value]
		}
		path += '[' + (idx.kind === 'number' ? idx.value : '?') + ']'
	}
	if (known && value === undefined && root !== 'global' && !st.quiet) report(st, 'path_missing', 'warn', n.start, n.end, { what: path, closest: closestPath(st.model, path) })
	n.type = known && value !== undefined && value !== null ? typeOfKind(kindOf(value)) : 'any'
	return n
}

// text + { model, firmware } -> { type, findings, holes: [{ name, start, end, expect, where }] }
export function checkExpression(text, ctx) {
	const c = ctx || {}
	const st = { text: String(text === null || text === undefined ? '' : text), toks: [], i: 0, findings: [], holes: [], expectations: new Map(), model: c.model || null, firmware: c.firmware || null, quiet: 0 }
	// a leading `echo` is the command the tester adds itself, not a path: it is blanked (same length, so the positions stay) before reading
	st.text = st.text.replace(/^(\s*)echo(?=\s)/i, (m, sp) => sp + '    ')
	st.toks = tokenize(st.text)
	if (!st.toks.length) return { type: 'any', findings: [], holes: [] }
	const root = parseExpression(st)
	if (st.i < st.toks.length) {
		const t = st.toks[st.i]
		if (!st.findings.some(f => f.start === t.start)) report(st, 'leftover', 'error', t.start, st.toks[st.toks.length - 1].end)
	}
	const holes = st.holes.map(h => Object.assign({ name: h.name, start: h.start, end: h.end, expect: 'any', where: { role: 'alone' } }, st.expectations.get(h.start) || {}))
	return { type: root.type, findings: st.findings, holes }
}

export function hasErrors(findings) {
	return (findings || []).some(f => f.level === 'error')
}
