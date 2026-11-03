'use strict'

// Inserting a snippet in the expression field: the snippet replaces the selection (or goes at the cursor) and the first placeholder
// of it, written <name>, is selected so the next keystroke fills it. When something was selected and the snippet has a
// placeholder, the selection goes INTO the first placeholder (wrapping: select "x", pick abs(<x>), get abs(x)); a selection that is
// itself a placeholder is replaced, never wrapped (filling a hole with a form). Also lists the holes of a text and finds the model
// path under the cursor, for the chip that shows its live value. Pure: test/expression-builder.test.js, test/expression-guided.test.js.

export const PLACEHOLDER_RE = /<[a-z_]+>/
const WHOLE_PLACEHOLDER_RE = /^<[a-z_]+>$/
// what may stand right before a hole outside a text: nothing, an opening mark, a separator, an operator or the dot of global.<name>
// (never a word: a < b> is a comparison)
const BEFORE_HOLE_RE = /[(\[{,#!?:+\-*/^=<>&|.]$/
const PATH_CHARS = /[A-Za-z0-9_.\[\]]/

function clamp(n, max) {
	const v = Number.isFinite(n) ? Math.floor(n) : 0
	return Math.max(0, Math.min(max, v))
}

export function isPlaceholder(text) {
	return WHOLE_PLACEHOLDER_RE.test(String(text || ''))
}

// -> { text, start, end } the new text and the selection to restore
export function insertAt(text, selection, snippet) {
	const s = String(text === null || text === undefined ? '' : text)
	const a = clamp(selection && selection.start, s.length)
	const b = Math.max(a, clamp(selection && selection.end, s.length))
	const chosen = s.slice(a, b)
	let snip = String(snippet === null || snippet === undefined ? '' : snippet)
	if (chosen && !isPlaceholder(chosen) && PLACEHOLDER_RE.test(snip)) snip = snip.replace(PLACEHOLDER_RE, () => chosen)
	const out = s.slice(0, a) + snip + s.slice(b)
	const m = PLACEHOLDER_RE.exec(snip)
	if (m) return { text: out, start: a + m.index, end: a + m.index + m[0].length }
	return { text: out, start: a + snip.length, end: a + snip.length }
}

// every hole of the text, in order: [{ name, text, start, end, inString }]. Outside a text a hole stands where a value belongs
// (after an opening mark, a separator or an operator, or at the start); inside double quotes any <name> is a hole.
export function holesOf(text) {
	const s = String(text === null || text === undefined ? '' : text)
	const out = []
	let inString = false
	for (let i = 0; i < s.length; i++) {
		const c = s[i]
		if (c === '"') {
			inString = !inString
			continue
		}
		if (c !== '<') continue
		const m = /^<[a-z_]+>/.exec(s.slice(i))
		if (!m) continue
		if (!inString) {
			const before = s.slice(0, i).replace(/\s+$/, '')
			if (before && !BEFORE_HOLE_RE.test(before)) continue
		}
		out.push({ name: m[0].slice(1, -1), text: m[0], start: i, end: i + m[0].length, inString })
		i += m[0].length - 1
	}
	return out
}

// the first placeholder still in the text, or null
export function openPlaceholder(text) {
	const first = holesOf(text)[0]
	return first ? first.text : null
}

// the model path the cursor is in or touches ('1 + move.axes[0].min * 2' with the cursor inside the path) or '' (a word of a
// function such as abs, or a number, is not a path unless it has a dot or a bracket or is a plain key)
export function pathAtCursor(text, cursor) {
	const s = String(text || '')
	let a = clamp(cursor, s.length)
	let b = a
	while (a > 0 && PATH_CHARS.test(s[a - 1])) a--
	while (b < s.length && PATH_CHARS.test(s[b])) b++
	const word = s.slice(a, b).replace(/^[.\[\]]+|[.]+$/g, '')
	if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*|\[\d+\])*$/.test(word)) return ''
	if (s[b] === '(') return ''
	return word
}
