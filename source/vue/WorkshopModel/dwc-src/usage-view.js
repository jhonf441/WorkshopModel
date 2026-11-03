'use strict'

// What the usage finder shows: one line per global (defined in N files, written in N, read in N) that opens to its files with the
// line numbers, the real problems (read but never created, and not on the machine, when every folder that could create it was read)
// apart from the uncertain ones (the same, but some folder was not read: `maybe`, with a button to read it) and the soft hints (created
// but no file reads it: a plugin, a panel of DWC or the console may read it), the filters (only problems, by kind, by file, by name)
// and the view by file (which globals a file touches). Pure: test/usage-scope.test.js.

import { usageSummary } from './usage-scan.js'

export const REF_KINDS = ['define', 'set', 'read']

function filesWith(refs, kind) {
	return new Set(refs.filter(r => r.kind === kind).map(r => r.file)).size
}

const byFileLine = (a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }) || a.line - b.line

// refs [{ name, file, line, kind }] + the names on the machine + { complete: every folder that could define a global was read }
// -> [{ name, live, definedIn, writtenIn, readIn, problem, maybe, hint, refs }]
export function globalRows(refs, liveNames, opts) {
	const complete = !opts || opts.complete !== false
	const s = usageSummary(refs, liveNames)
	const unused = new Set(s.unusedDefined)
	const undefinedUsed = new Set(s.undefinedUsed)
	const byName = new Map()
	for (const r of refs || []) {
		if (!byName.has(r.name)) byName.set(r.name, [])
		byName.get(r.name).push({ file: r.file, line: r.line, kind: r.kind })
	}
	return s.names.map(e => {
		const own = (byName.get(e.name) || []).sort(byFileLine)
		const missing = undefinedUsed.has(e.name)
		return { name: e.name, live: e.live, definedIn: filesWith(own, 'define'), writtenIn: filesWith(own, 'set'), readIn: filesWith(own, 'read'), problem: missing && complete, maybe: missing && !complete, hint: unused.has(e.name), refs: own }
	})
}

// f = { onlyProblems, kinds: [kind ids] (none = all), file: '' (all) or a path, query: part of the name }
export function filterRows(rows, f) {
	const o = f || {}
	const q = String(o.query || '').trim().toLowerCase()
	const kinds = new Set(o.kinds || [])
	return (rows || []).filter(r => {
		if (o.onlyProblems && !r.problem && !r.maybe) return false
		if (kinds.size && !r.refs.some(x => kinds.has(x.kind))) return false
		if (o.file && !r.refs.some(x => x.file === o.file)) return false
		return !q || r.name.toLowerCase().indexOf(q) >= 0
	})
}

export function problemCounts(rows) {
	const n = key => (rows || []).filter(r => r[key]).length
	return { problems: n('problem'), maybe: n('maybe'), hints: n('hint') }
}

// the files that touch a global, sorted
export function filesOf(refs) {
	return Array.from(new Set((refs || []).map(r => r.file))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// one file -> [{ name, define: [lines], set: [lines], read: [lines] }] sorted by name
export function fileView(refs, file) {
	const by = new Map()
	for (const r of refs || []) {
		if (r.file !== file) continue
		if (!by.has(r.name)) by.set(r.name, { name: r.name, define: [], set: [], read: [] })
		by.get(r.name)[r.kind].push(r.line)
	}
	return Array.from(by.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// how many files use each global, from the memory of the usage finder (usage-runner.js cache): Map name -> files; empty before a scan
export function usageCounts(cache) {
	const files = new Map()
	const m = cache || new Map()
	m.forEach((entry, path) => {
		for (const r of entry.refs || []) {
			if (!files.has(r.name)) files.set(r.name, new Set())
			files.get(r.name).add(path)
		}
	})
	const out = new Map()
	files.forEach((set, name) => out.set(name, set.size))
	return out
}
