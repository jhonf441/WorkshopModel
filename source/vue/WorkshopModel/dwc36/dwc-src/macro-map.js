'use strict'

// The macro and parameter map: for each macro file the parameters it reads (param.S, with the guards and defaults it uses: exists(param.S),
// a ternary default, an abort or a default set when it is missing), the globals it reads, writes or defines, the macros it calls with M98
// and the parameters it passes, and a one-line example of how to call it. The text of a file is read once by the usage finder
// (usage-runner.js keeps macroInfo in its cache entry); this module only parses. Comments and texts in quotes are left out like the
// usage finder does (usage-scan.js). Pure: test/macro-map.test.js.

import { scanUsage, stripComment, stripStrings } from './usage-scan.js'
import { resolveMacro } from './usage-scope.js'
import { helpChoice } from './view-choices.js'

export const MACRO_MAP_SETTING = helpChoice('macromap', 'view')
export const MACRO_CALLS_MAX = 60
export const MACRO_NAMES_MAX = 200

const PARAM_RE = /\bparam\.([A-Za-z])\b/g
const EXISTS_RE = /exists\(\s*param\.([A-Za-z])\s*\)/g
const TERNARY_RE = /exists\(\s*param\.([A-Za-z])\s*\)\s*\?\s*param\.\1\s*:\s*([^;}]+?)\s*(?:\}|$)/g
const NOT_EXISTS_RE = /^\s*(?:if|elif)\b.*(?:!\s*exists\(\s*param\.([A-Za-z])\s*\)|exists\(\s*param\.([A-Za-z])\s*\)\s*==\s*false)/
const SET_VAR_RE = /^\s*set\s+var\.[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.+?)\s*$/

const indentOf = line => String(line).match(/^[ \t]*/)[0].replace(/\t/g, '    ').length

function paramEntry(map, name) {
	if (!map.has(name)) map.set(name, { name, reads: 0, lines: [], guarded: false, required: false, defaults: [] })
	return map.get(name)
}

// the first line of the block under lines[i] (more indented), as code ('' when there is none)
function firstBodyLine(lines, i) {
	const base = indentOf(lines[i])
	for (let j = i + 1; j < lines.length; j++) {
		const code = stripComment(lines[j])
		if (!code.trim()) continue
		return indentOf(lines[j]) > base ? code : ''
	}
	return ''
}

function addDefault(entry, text) {
	if (text && entry.defaults.indexOf(text) < 0) entry.defaults.push(text)
}

// the params of the file: [{ name, reads, lines, guarded, required, defaults }] by letter
function scanParams(lines) {
	const map = new Map()
	for (let i = 0; i < lines.length; i++) {
		const code = stripComment(lines[i])
		if (code.indexOf('param.') < 0) continue
		const plain = stripStrings(code)
		for (const m of plain.matchAll(EXISTS_RE)) paramEntry(map, m[1].toUpperCase()).guarded = true
		for (const m of code.matchAll(TERNARY_RE)) addDefault(paramEntry(map, m[1].toUpperCase()), m[2].trim())
		for (const m of plain.replace(EXISTS_RE, '').matchAll(PARAM_RE)) {
			const e = paramEntry(map, m[1].toUpperCase())
			e.reads++
			if (e.lines.length < 5 && e.lines.indexOf(i + 1) < 0) e.lines.push(i + 1)
		}
		const neg = NOT_EXISTS_RE.exec(plain)
		if (neg) {
			const e = paramEntry(map, (neg[1] || neg[2]).toUpperCase())
			const body = firstBodyLine(lines, i)
			if (/^\s*abort\b/.test(body)) e.required = true
			const set = SET_VAR_RE.exec(body)
			if (set) addDefault(e, set[1])
		}
	}
	return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)).map(e => Object.assign(e, { need: e.required || (!e.guarded && !e.defaults.length) ? 'required' : 'optional' }))
}

// the arguments of an M98 line after the file: A5 B{param.B} C"text" -> [{ name, value }]
function m98Args(rest) {
	const out = []
	const re = /\s*([A-Za-z])(\{[^}]*\}|"(?:[^"]|"")*"|[^\s;{"]*)/y
	let m
	while ((m = re.exec(rest))) {
		if (m[1].toUpperCase() !== 'P') out.push({ name: m[1].toUpperCase(), value: m[2] })
		if (re.lastIndex >= rest.length) break
	}
	return out
}

function m98Call(code, line, indent) {
	const m = /^\s*M98\s+(.*)$/i.exec(code)
	if (!m) return null
	const quoted = /\bP\s*"((?:[^"]|"")*)"/i.exec(m[1])
	const expr = quoted ? null : /\bP\s*(\{[^}]*\})/i.exec(m[1])
	if (!quoted && !expr) return null
	const rest = m[1].replace(quoted ? quoted[0] : expr[0], '')
	return { target: quoted ? resolveMacro(quoted[1].replace(/""/g, '"')) : null, expr: expr ? expr[1] : null, line, args: m98Args(rest), conditional: indent > 0 }
}

function scanCalls(lines) {
	const out = []
	for (let i = 0; i < lines.length && out.length < MACRO_CALLS_MAX; i++) {
		const call = m98Call(stripComment(lines[i]), i + 1, indentOf(lines[i]))
		if (call) out.push(call)
	}
	return out
}

function scanAborts(lines) {
	const out = []
	lines.forEach((l, i) => { if (/^\s*abort\b/.test(stripComment(l))) out.push(i + 1) })
	return out.slice(0, 20)
}

const names = (refs, kind) => Array.from(new Set(refs.filter(r => r.kind === kind).map(r => r.name))).sort().slice(0, MACRO_NAMES_MAX)

// what one macro file uses: { file, params, calls, globalsRead, globalsWritten, globalsDefined, aborts }
export function macroInfo(file, text) {
	const lines = String(text || '').split(/\r?\n/)
	const refs = scanUsage(file, text)
	return { file, params: scanParams(lines), calls: scanCalls(lines), globalsRead: names(refs, 'read'), globalsWritten: names(refs, 'set'), globalsDefined: names(refs, 'define'), aborts: scanAborts(lines) }
}

// how to call the macro in one line: required parameters as S<value>, optional ones in square brackets
export function macroExample(info) {
	const parts = (info.params || []).map(p => (p.need === 'required' ? p.name + '<value>' : '[' + p.name + '<value>]'))
	return 'M98 P"' + info.file + '"' + (parts.length ? ' ' + parts.join(' ') : '')
}

const baseName = path => path.slice(path.lastIndexOf('/') + 1)

// the memory of the usage finder (Map path -> { map }) -> the rows of the view, by file; calledBy is filled from the calls of the others
export function macroRows(cache) {
	const rows = []
	;(cache || new Map()).forEach((entry, path) => {
		if (entry && entry.map) rows.push(Object.assign({ name: baseName(path), example: macroExample(entry.map), calledBy: [] }, entry.map, { file: path }))
	})
	const byFile = new Map(rows.map(r => [r.file, r]))
	for (const r of rows) for (const c of r.calls) if (c.target && byFile.has(c.target) && byFile.get(c.target).calledBy.indexOf(r.file) < 0) byFile.get(c.target).calledBy.push(r.file)
	return rows.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }))
}

// the words a row answers to: its file, param.S, the globals, the macros it calls
function haystack(r) {
	const parts = [r.file].concat(r.params.map(p => 'param.' + p.name), r.globalsRead, r.globalsWritten, r.globalsDefined, r.globalsRead.concat(r.globalsWritten, r.globalsDefined).map(n => 'global.' + n), r.calls.map(c => c.target || c.expr || ''), r.calledBy)
	return parts.join('\n').toLowerCase()
}

// query: words that must all be found; onlyParams: only macros that read a parameter; onlyCalls: only macros that call another
export function filterMacroRows(rows, f) {
	const o = f || {}
	const words = String(o.query || '').toLowerCase().split(/\s+/).filter(Boolean)
	return (rows || []).filter(r => {
		if (o.onlyParams && !r.params.length) return false
		if (o.onlyCalls && !r.calls.length) return false
		const h = words.length ? haystack(r) : ''
		return words.every(w => h.indexOf(w) >= 0)
	})
}
