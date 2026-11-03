'use strict'

// Usage finder: which files of the SD card define, set or read each global. usage-runner.js picks the files (usage-scope.js) within the
// budget (tier.js scanBudget) and gives each text to scanUsage; comments are left out and so are the texts in quotes outside braces
// (a message that names a global does not read it). usageSummary joins the references with the globals that exist on the machine now:
// undefinedUsed is a real problem (a macro reads what nothing creates); unusedDefined is only a hint, since a plugin, a panel of DWC
// or the console may read a global no file reads. Pure: test/presets-persist.test.js, test/usage-scope.test.js.

export const SCAN_DIRS = ['0:/sys', '0:/macros']
export const SCAN_MAX_DEPTH = 4

// a definition at the start of a line (indented or not), or after a condition on the same line: if !exists(global.x) global x = 0
const DEFINE_RE = /^\s*(?:if\b.*?\s)?global\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/
const SET_RE = /^\s*set\s+global\.([A-Za-z_][A-Za-z0-9_]*)/
const READ_RE = /global\.([A-Za-z_][A-Za-z0-9_]*)/g

export function scanFileAllowed(name) {
	return /\.g$/i.test(String(name || ''))
}

// the line with every text in double quotes emptied (""), except inside braces {...}, where a quoted text is part of an
// expression: `echo "global.x is set"` reads nothing, `echo {"v=" ^ global.x}` reads global.x. A doubled quote is a quote inside.
export function stripStrings(line) {
	const s = String(line || '')
	let out = ''
	let depth = 0
	let quote = false
	for (let i = 0; i < s.length; i++) {
		const ch = s[i]
		if (quote) {
			if (ch === '"' && s[i + 1] === '"') i++
			else if (ch === '"') {
				quote = false
				out += '"'
			}
			continue
		}
		if (ch === '"' && depth === 0) {
			quote = true
			out += '"'
			continue
		}
		if (ch === '{') depth++
		else if (ch === '}' && depth > 0) depth--
		out += ch
	}
	return out
}

// the part of a line before the comment (a ';' inside double quotes is text)
export function stripComment(line) {
	let quote = false
	const s = String(line || '')
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '"') quote = !quote
		else if (s[i] === ';' && !quote) return s.slice(0, i)
	}
	return s
}

// -> [{ name, file, line (1-based), kind: 'define' | 'set' | 'read' }]
export function scanUsage(file, text) {
	const out = []
	const lines = String(text || '').split(/\r?\n/)
	for (let i = 0; i < lines.length; i++) {
		const code = stripStrings(stripComment(lines[i]))
		if (code.indexOf('global') < 0) continue
		const def = DEFINE_RE.exec(code)
		const set = SET_RE.exec(code)
		const written = def ? def[1] : (set ? set[1] : null)
		if (def) out.push({ name: def[1], file, line: i + 1, kind: 'define' })
		if (set) out.push({ name: set[1], file, line: i + 1, kind: 'set' })
		const seen = new Set()
		let m
		READ_RE.lastIndex = 0
		while ((m = READ_RE.exec(code))) {
			if (m[1] === written && !seen.has(m[1]) && set) {
				seen.add(m[1])
				continue
			}
			if (!seen.has(m[1]) && m[1] !== written) {
				seen.add(m[1])
				out.push({ name: m[1], file, line: i + 1, kind: 'read' })
			}
		}
	}
	return out
}

// refs of every file + the names that exist on the machine -> the table by name and the two warnings
export function usageSummary(refs, liveNames) {
	const live = new Set(liveNames || [])
	const byName = new Map()
	for (const r of refs || []) {
		if (!byName.has(r.name)) byName.set(r.name, { name: r.name, defines: 0, sets: 0, reads: 0, files: [], live: live.has(r.name) })
		const e = byName.get(r.name)
		if (r.kind === 'define') e.defines++
		else if (r.kind === 'set') e.sets++
		else e.reads++
		if (e.files.indexOf(r.file) < 0) e.files.push(r.file)
	}
	live.forEach(name => {
		if (!byName.has(name)) byName.set(name, { name, defines: 0, sets: 0, reads: 0, files: [], live: true })
	})
	const names = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
	return {
		names,
		unusedDefined: names.filter(e => (e.defines > 0 || e.live) && e.reads === 0).map(e => e.name),
		undefinedUsed: names.filter(e => e.reads > 0 && e.defines === 0 && !e.live).map(e => e.name)
	}
}

// the files to read from a listing: [{ name, isDirectory, size }] of a folder -> { files: [paths], dirs: [paths] } within the budget
export function pickFiles(dir, listing, budget) {
	const files = []
	const dirs = []
	for (const item of listing || []) {
		if (!item || typeof item.name !== 'string') continue
		const path = dir.replace(/\/$/, '') + '/' + item.name
		if (item.isDirectory) dirs.push(path)
		else if (scanFileAllowed(item.name) && (typeof item.size !== 'number' || item.size <= budget.bytesPerFile)) files.push(path)
	}
	return { files, dirs }
}
