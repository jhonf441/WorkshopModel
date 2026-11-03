'use strict'

// Command preview: what is about to be sent, line by line, and how it has to be confirmed (DESIGN.md section 5). A meta command
// (set, global, var, echo, if...) or a read (M409, M117, M118) changes nothing that cannot be set back: level 1, one tap. Any other
// G or M code may move the machine, heat or run a macro the plugin cannot judge: level 2, double tap. Pure: test/command-preview.test.js.

const LEVEL1_RE = /^(set\s|global\s|var\s|echo\b|if\b|elif\b|else\b|while\b|break\b|continue\b|abort\b|M409\b|M117\b|M118\b)/i
export const PERSIST_MACRO_RE = /^M98\s+P"0:\/sys\/workshop-globals\.g"\s*$/i

// the lines that are sent: no comments, no empty lines
export function commandLines(code) {
	return String(code || '').split(/\r?\n/).map(l => l.replace(/;.*$/, '').trim()).filter(l => l !== '')
}

export function lineLevel(line) {
	const l = String(line || '').trim()
	if (l === '') return 1
	if (LEVEL1_RE.test(l) || PERSIST_MACRO_RE.test(l)) return 1
	return 2
}

// -> { lines, level: 1 | 2, count }
export function previewOf(code) {
	const lines = commandLines(code)
	let level = 1
	for (const l of lines) {
		if (lineLevel(l) === 2) level = 2
	}
	return { lines, level, count: lines.length }
}
