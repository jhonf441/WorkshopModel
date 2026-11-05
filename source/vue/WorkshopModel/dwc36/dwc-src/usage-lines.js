'use strict'

// Where a global is used, as the lines of ONE file for the chips of UsageLines.vue (ESTANDAR E3), and where it is set, for the "Set in" block of
// a global (E6). Pure (no Vue, no DWC): test/usage-lines.test.js. 3.6 line only: the modules of the other pieces stay equal to the 3.7 ones.

const KINDS = ['define', 'set', 'read']

// every use of a global in a file as one chip per line, in file order: f = { define: [n], set: [n], read: [n] } (usage-view.js usageOf) ->
// [{ kind, n }], at most `max` of them
export function linesOfFile(f, max) {
	const out = []
	for (const kind of KINDS) for (const n of (f && f[kind]) || []) out.push({ kind, n })
	return out.sort((x, y) => x.n - y.n).slice(0, max || 40)
}

// the chips of a list of { kind, line } (the refs of usage-view.js refsByFile) in the shape of linesOfFile
export function linesOfItems(items) {
	return (items || []).map(x => ({ kind: x.kind, n: x.line }))
}

// who gives a value to a global, from the memory of the usage finder (usage-runner.js cache: path -> { refs: [{ name, kind, line }] }): the files that
// create or set it with the first such line of each, by path -> { known: a scan was done, files: [{ path, line }] }
export function assignedSetters(cache, name) {
	const files = []
	const m = cache && typeof cache.forEach === 'function' ? cache : null
	if (!m || !m.size) return { known: false, files }
	m.forEach((entry, path) => {
		let found = false
		let line = 0
		for (const r of (entry && entry.refs) || []) {
			if (r.name !== name || (r.kind !== 'set' && r.kind !== 'define')) continue
			const n = typeof r.line === 'number' ? r.line : 0
			if (!found || (n && (!line || n < line))) line = n
			found = true
		}
		if (found) files.push({ path, line })
	})
	return { known: true, files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) }
}

// the block "Set in" of a global: { state: 'unknown' | 'none' | 'found', files: first three, more: how many are left }
export function assignedLine(setters) {
	const s = setters || { known: false, files: [] }
	if (!s.known) return { state: 'unknown', files: [], more: 0 }
	if (!s.files.length) return { state: 'none', files: [], more: 0 }
	return { state: 'found', files: s.files.slice(0, 3), more: Math.max(0, s.files.length - 3) }
}

// the short text of the list row: 'unknown' | 'none' | the file name (one file) | { key: 'globals_assigned_n', n } for several
export function assignedSummary(line) {
	if (line.state !== 'found') return { key: 'globals_assigned_' + line.state }
	const total = line.files.length + line.more
	if (total === 1) return { text: line.files[0].path.split('/').pop() }
	return { key: 'globals_assigned_n', params: { n: total } }
}

// the chips of one global inside ONE file (the macro map names the globals a macro uses; its lines come from the cache of the finder): [{ kind, n }]
export function linesInFile(cache, path, name) {
	const entry = cache && typeof cache.get === 'function' ? cache.get(path) : null
	const f = { define: [], set: [], read: [] }
	for (const r of (entry && entry.refs) || []) if (r.name === name && f[r.kind] && typeof r.line === 'number' && f[r.kind].indexOf(r.line) < 0) f[r.kind].push(r.line)
	return linesOfFile(f)
}
