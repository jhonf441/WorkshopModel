'use strict'

// Path helper: the snippets a person copies into a macro or a panel from a selected node. M409 reads the node from the console,
// M291 shows it in a message box (M292 only acknowledges one), echo prints it, the expression form goes inside any G-code.
// Pure: test/path-snippets.test.js.

import { rrfLiteral } from './globals-typing.js'
import { globalNameOf } from './model-path.js'
import { isBranch } from './value-format.js'

// -> [{ id, code, send? }]; the ids are keys of plugins.WorkshopModel.model.snippet_<id>. `send` marks the snippets that are a command on their own
// (a read, an echo, a message box, a set): the detail offers to send those from there, with the exact command shown and the confirmation of
// command-preview.js. The others are pieces to paste into a macro (a path, an expression in braces, a condition).
export function pathSnippets(path, value) {
	const p = String(path || '')
	if (!p) return []
	const out = [
		{ id: 'path', code: p },
		{ id: 'expression', code: '{' + p + '}' },
		{ id: 'm409', code: 'M409 K"' + p + '"', send: true }
	]
	if (isBranch(value)) {
		out.push({ id: 'm409_full', code: 'M409 K"' + p + '" F"d99"', send: true })
	} else {
		out.push({ id: 'echo', code: 'echo ' + p, send: true })
		out.push({ id: 'm291', code: 'M291 P{"' + p + ': " ^ ' + p + '} T5', send: true })
		out.push({ id: 'condition', code: 'if ' + p + ' == ' + rrfLiteral(value) })
	}
	const g = globalNameOf(p)
	if (g) {
		out.push({ id: 'set', code: 'set global.' + g + ' = ' + rrfLiteral(value), send: true })
		out.push({ id: 'exists', code: 'if !exists(global.' + g + ')' })
	}
	return out
}
