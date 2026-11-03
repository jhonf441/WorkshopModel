'use strict'

// Path helper: the snippets a person copies into a macro or a panel from a selected node. M409 reads the node from the console,
// M291 shows it in a message box (M292 only acknowledges one), echo prints it, the expression form goes inside any G-code.
// Pure: test/path-snippets.test.js.

import { rrfLiteral } from './globals-typing.js'
import { globalNameOf } from './model-path.js'
import { isBranch } from './value-format.js'

// -> [{ id, code }]; the ids are keys of plugins.WorkshopModel.model.snippet_<id>
export function pathSnippets(path, value) {
	const p = String(path || '')
	if (!p) return []
	const out = [
		{ id: 'path', code: p },
		{ id: 'expression', code: '{' + p + '}' },
		{ id: 'm409', code: 'M409 K"' + p + '"' }
	]
	if (isBranch(value)) {
		out.push({ id: 'm409_full', code: 'M409 K"' + p + '" F"d99"' })
	} else {
		out.push({ id: 'echo', code: 'echo ' + p })
		out.push({ id: 'm291', code: 'M291 P{"' + p + ': " ^ ' + p + '} T5' })
		out.push({ id: 'condition', code: 'if ' + p + ' == ' + rrfLiteral(value) })
	}
	const g = globalNameOf(p)
	if (g) {
		out.push({ id: 'set', code: 'set global.' + g + ' = ' + rrfLiteral(value) })
		out.push({ id: 'exists', code: 'if !exists(global.' + g + ')' })
	}
	return out
}
