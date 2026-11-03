'use strict'

// The expression tester: the person writes an RRF expression (or a path of the model) and the plugin builds ONE command that only
// reads: `echo <expression>` prints its value, `M409 K"<path>"` returns the node as JSON. The command goes through the command preview
// (command-preview.js: both are level 1, one tap) and the reply of the board comes back here to be shown in place. One line only: a
// line break could smuggle a second command, and an expression that starts with '>' is refused (`echo >"file"` writes a file on the
// SD card). Pure: test/expression-tester.test.js.

import { helpChoice } from './view-choices.js'
import { clip } from './value-format.js'
import { openPlaceholder } from './expression-insert.js'

export const TESTER_MODES = [helpChoice('tester', 'echo', { icon: 'mdi-function-variant' }), helpChoice('tester', 'm409', { icon: 'mdi-code-json' })]
export const TESTER_HISTORY = 10
export const RESULT_MAX = 4000
export const PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*|\[\d+\])*$/

export function isModelPath(text) {
	return PATH_RE.test(String(text || '').trim())
}

// mode + text (+ whether the path is a branch, for M409 to read all of it) -> { ok, code }
// or { ok: false, error: 'empty' | 'one_line' | 'redirect' | 'not_path' | 'placeholder' } (a <name> from the builder not filled in yet)
export function testerCommand(mode, text, branch) {
	const s = String(text === null || text === undefined ? '' : text)
	if (/[\r\n]/.test(s.trim())) return { ok: false, error: 'one_line' }
	// a leading `echo` typed by hand is the command the tester sends anyway: it is not doubled
	const e = mode === 'm409' ? s.trim() : s.trim().replace(/^echo(?=\s)\s*/i, '')
	if (!e) return { ok: false, error: 'empty' }
	if (e.startsWith('>')) return { ok: false, error: 'redirect' }
	if (openPlaceholder(e)) return { ok: false, error: 'placeholder' }
	if (mode === 'm409') {
		if (!isModelPath(e)) return { ok: false, error: 'not_path' }
		return { ok: true, code: 'M409 K"' + e + '"' + (branch ? ' F"d99"' : '') }
	}
	return { ok: true, code: 'echo ' + e }
}

// the reply of the board -> { ok, text, value } (M409: the result of the JSON, pretty printed; echo: the text as it is)
export function parseReply(mode, reply) {
	const r = String(reply === null || reply === undefined ? '' : reply).trim()
	if (/^error\b/i.test(r) || /^Error:/m.test(r)) return { ok: false, text: clip(r, RESULT_MAX), value: null }
	if (mode !== 'm409') return { ok: true, text: clip(r, RESULT_MAX), value: r }
	try {
		const o = JSON.parse(r)
		const value = o && Object.prototype.hasOwnProperty.call(o, 'result') ? o.result : o
		return { ok: true, text: clip(JSON.stringify(value, null, 2), RESULT_MAX), value }
	} catch (e) {
		return { ok: false, text: clip(r, RESULT_MAX), value: null }
	}
}

// the newest test first, at most TESTER_HISTORY
export function pushHistory(list, entry) {
	return [entry].concat((list || []).filter(x => x.code !== entry.code)).slice(0, TESTER_HISTORY)
}
