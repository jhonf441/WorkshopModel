'use strict'

// The small file viewer of the usage finder (FilePeek.vue): the text of a file as numbered lines with the line of the use marked and, inside
// it, the global itself. Pure: the page reads the file, this decides what is shown.

const WINDOW_BEFORE = 150
const WINDOW_AFTER = 150
export const PEEK_WHOLE_MAX = 600 // a file up to this many lines is shown whole; a longer one only around the line

// the lines of a text: CRLF and a last empty line do not count
export function textLines(text) {
	const src = String(text === undefined || text === null ? '' : text).split('\n').map(t => (t.charCodeAt(t.length - 1) === 13 ? t.slice(0, -1) : t))
	if (src.length && src[src.length - 1] === '') src.pop()
	return src
}

// What to show: { rows: [{ n, text, hit }], from, to, total, cut } with n 1-based. The row of `line` is the hit.
export function peekRows(text, line) {
	const all = textLines(text)
	const total = all.length
	const target = Number.isInteger(line) && line >= 1 ? line : 0
	let from = 1
	let to = total
	let cut = false
	if (total > PEEK_WHOLE_MAX) {
		cut = true
		const at = target || 1
		from = Math.max(1, at - WINDOW_BEFORE)
		to = Math.min(total, at + WINDOW_AFTER)
	}
	const rows = []
	for (let n = from; n <= to; n++) rows.push({ n, text: all[n - 1], hit: n === target })
	return { rows, from, to, total, cut }
}

// A line cut in pieces around the global: [{ text, mark }]. The global is written global.<name>, with or without the word boundary of
// a longer name next to it (global.laser does not mark inside global.laserFocus).
export function splitMark(lineText, name) {
	const text = String(lineText === undefined || lineText === null ? '' : lineText)
	const key = 'global.' + String(name || '')
	if (!name) return [{ text, mark: false }]
	const out = []
	let plainFrom = 0
	let i = 0
	for (;;) {
		const at = text.indexOf(key, i)
		if (at < 0) break
		const next = text.charAt(at + key.length)
		if (next && /[A-Za-z0-9_]/.test(next)) {
			i = at + key.length // a longer name: not this one, and its text stays plain
			continue
		}
		if (at > plainFrom) out.push({ text: text.slice(plainFrom, at), mark: false })
		out.push({ text: key, mark: true })
		plainFrom = i = at + key.length
	}
	if (plainFrom < text.length) out.push({ text: text.slice(plainFrom), mark: false })
	return out.length ? out : [{ text, mark: false }]
}
