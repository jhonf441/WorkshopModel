'use strict'

// Checks of an expression BEFORE anything is sent, so the builder can say what is wrong while it is being written, with no call to
// the board: unbalanced brackets or quotes, a global that does not exist (and is not guarded by exists()). A hole left in is not
// reported here: the hole assistant (expression-holes.js) is the one place that says so, with the hole marked.
// -> [{ kind, what }] (kind keys the text lint_<kind>). Pure: test/expression-builder.test.js.

import { getAtPath } from './model-path.js'

const PAIRS = { ')': '(', ']': '[', '}': '{' }
const GLOBAL_RE = /(exists\s*\(\s*)?\bglobal\.([A-Za-z_][A-Za-z0-9_]*)/g

// the outside of the quoted strings ("" inside a string is an escaped quote); null when a string is left open
function withoutStrings(text) {
	let out = ''
	let open = false
	for (let i = 0; i < text.length; i++) {
		const c = text[i]
		if (c === '"') open = !open
		else if (!open) out += c
	}
	return open ? null : out
}

function bracketIssue(code) {
	const stack = []
	for (const c of code) {
		if (c === '(' || c === '[' || c === '{') stack.push(c)
		else if (PAIRS[c] && stack.pop() !== PAIRS[c]) return { kind: 'unbalanced', what: c }
	}
	return stack.length ? { kind: 'unbalanced', what: stack[stack.length - 1] } : null
}

// the globals the expression reads that the model does not have, leaving out the ones it guards with exists() anywhere
function missingGlobals(code, model) {
	const guarded = new Set()
	const named = []
	for (const m of code.matchAll(GLOBAL_RE)) {
		if (m[1]) guarded.add(m[2])
		else if (named.indexOf(m[2]) < 0) named.push(m[2])
	}
	return named.filter(n => !guarded.has(n) && getAtPath(model, 'global.' + n) === undefined)
}

export function lintExpression(text, model) {
	const s = String(text || '').trim()
	const out = []
	if (!s) return out
	const code = withoutStrings(s)
	if (code === null) {
		out.push({ kind: 'quote', what: '"' })
		return out
	}
	const issue = bracketIssue(code)
	if (issue) out.push(issue)
	if (model && model.global) for (const name of missingGlobals(code, model)) out.push({ kind: 'global_missing', what: name })
	return out
}

// true when the structure is broken (an open text or an unpaired bracket): the type checker is not worth running then
export function lintBlocks(warnings) {
	return (warnings || []).some(w => w.kind === 'quote' || w.kind === 'unbalanced')
}
