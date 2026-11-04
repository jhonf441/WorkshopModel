'use strict'

// What an expression being written needs NEXT, worked out from the text before the cursor (no call to the board): which brackets are open and
// what closes them, whether a value or an operator goes now, the buttons that fit (and, for the ones that do not, why), and a step by step
// review of the whole text. It reads the tokens of expression-tokens.js, so a "<" is a hole or a comparison the same way the type checker
// sees it. Pure: test/expression-flow.test.js.

import { tokenize, CLOSER_OF } from './expression-tokens.js'

export const FLOW_CHECKS = ['quotes', 'brackets', 'ending', 'blanks']
// the operators the "after a value" buttons offer, in the order a person reaches for them
export const FLOW_OPERATORS = ['+', '-', '*', '/', '^', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '?', ':']

// the text before the cursor (all of it when there is no cursor)
function before(text, cursor) {
	const s = String(text === null || text === undefined ? '' : text)
	return Number.isFinite(cursor) ? s.slice(0, Math.max(0, Math.min(s.length, cursor))) : s
}

// -> { tokens, stack: [{ open, closer, start }], mismatch: { found, wanted, start } | null, inString, expect: 'value' | 'operator', last }
// `last` is the last token before the cursor. expect is what comes now: at the start, after an operator, an opening bracket or a comma a VALUE
// goes; after a word, a number, a text, a hole or a closing bracket an OPERATOR (or a closing bracket, or a comma) goes.
export function structureAt(text, cursor) {
	const s = before(text, cursor)
	const tokens = tokenize(s)
	const stack = []
	let mismatch = null
	for (const t of tokens) {
		if (t.type === 'open') stack.push({ open: t.text, closer: CLOSER_OF[t.text], start: t.start })
		else if (t.type === 'close') {
			const top = stack[stack.length - 1]
			if (top && top.closer === t.text) stack.pop()
			else if (!mismatch) mismatch = { found: t.text, wanted: top ? top.closer : '', start: t.start }
		}
	}
	const last = tokens.length ? tokens[tokens.length - 1] : null
	const inString = !!(last && last.type === 'string' && last.open)
	const valueTypes = ['op', 'open', 'comma', 'dot', 'bad']
	const expect = !last || valueTypes.indexOf(last.type) >= 0 ? 'value' : 'operator'
	return { tokens, stack, mismatch, inString, expect, last }
}

// one button: { id, group: 'close' | 'open' | 'operator' | 'value', insert, ok, reason? }. `reason` is the key of the text guided_flow_why_<reason>.
function chip(group, id, insert, ok, reason) {
	return ok ? { id, group, insert, ok: true } : { id, group, insert, ok: false, reason }
}

// what can go at the cursor: every button of the kinds, each one enabled or disabled with its reason
export function nextSteps(text, cursor) {
	const st = structureAt(text, cursor)
	const out = []
	const top = st.stack.length ? st.stack[st.stack.length - 1] : null
	if (st.inString) {
		return { structure: st, chips: [chip('close', 'quote', '"', true)], inString: true }
	}
	const afterValue = st.expect === 'operator'
	const afterOpen = !!(st.last && st.last.type === 'open')
	// closing: the innermost open bracket, once there is something inside it (or it is a call with no arguments: abs() is wrong but now() is not)
	for (const c of [')', ']', '}']) {
		const wanted = top ? top.closer : ''
		let reason = ''
		if (!top) reason = 'close_none'
		else if (c !== wanted) reason = 'close_other'
		else if (!afterValue && !(afterOpen && c === ')')) reason = 'close_value'
		out.push(chip('close', 'close' + c, c, !reason, reason))
	}
	// opening: where a value goes, a bracket opens a group; after a value only [ (an index) and ( (a call right after a function name) fit
	const afterWord = !!(st.last && st.last.type === 'word')
	const afterIndexable = !!(st.last && (st.last.type === 'word' || (st.last.type === 'close' && st.last.text !== ')') || st.last.type === 'member'))
	out.push(chip('open', 'open(', '(', st.expect === 'value' || afterWord, 'open_after_value'))
	out.push(chip('open', 'open[', '[', afterIndexable, 'index_needs_value'))
	out.push(chip('open', 'open{', '{', st.expect === 'value', 'open_after_value'))
	// operators need a value before them
	for (const op of FLOW_OPERATORS) out.push(chip('operator', 'op' + op, ' ' + op + ' ', afterValue, 'operator_needs_value'))
	// a comma separates arguments or items: only inside ( or {, after a value
	out.push(chip('operator', 'comma', ', ', afterValue && !!top && top.open !== '[', top ? 'comma_needs_value' : 'comma_outside'))
	// a value: a text, a unary sign, a length, a not
	out.push(chip('value', 'string', '"', st.expect === 'value', 'value_after_value'))
	out.push(chip('value', 'not', '!', st.expect === 'value', 'value_after_value'))
	out.push(chip('value', 'length', '#', st.expect === 'value', 'value_after_value'))
	return { structure: st, chips: out, inString: false }
}

// the brackets still open at the end of the text, as the string that closes them all: "(" and "[" open -> "])"
export function closeAll(text) {
	const st = structureAt(text)
	if (st.inString || st.mismatch) return ''
	return st.stack.slice().reverse().map(b => b.closer).join('')
}

// the review of the whole text, one line per check: { id, state: 'ok' | 'todo' | 'bad', what? }. todo = not finished yet (what it still needs),
// bad = something is wrong and has to change. An empty text has nothing to review.
export function reviewSteps(text) {
	const s = String(text === null || text === undefined ? '' : text)
	if (!s.trim()) return []
	const st = structureAt(s)
	const out = []
	out.push({ id: 'quotes', state: st.inString ? 'todo' : 'ok', what: st.inString ? '"' : '' })
	if (st.mismatch) out.push({ id: 'brackets', state: 'bad', what: st.mismatch.found, wanted: st.mismatch.wanted })
	else if (st.stack.length) out.push({ id: 'brackets', state: 'todo', what: closeAll(s) })
	else out.push({ id: 'brackets', state: 'ok', what: '' })
	const last = st.last
	const dangling = !!last && (last.type === 'op' || last.type === 'comma' || last.type === 'dot') && last.text !== '!' ? last.text : ''
	out.push({ id: 'ending', state: dangling ? 'todo' : 'ok', what: dangling })
	const blanks = st.tokens.filter(t => t.type === 'hole').length
	out.push({ id: 'blanks', state: blanks ? 'todo' : 'ok', what: String(blanks || '') })
	return out
}

// the reason to refuse a catalog form that needs its own left side (a < b, a + b) where a value already stands: the cursor is right after a value
// and nothing is selected. null when the form fits there.
export function positionRefusal(text, cursor, hasSelection) {
	if (hasSelection) return null
	const st = structureAt(text, cursor)
	if (st.inString) return null
	return st.expect === 'operator' ? 'after_value' : null
}
