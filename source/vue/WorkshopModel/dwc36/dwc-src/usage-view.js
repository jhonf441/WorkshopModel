'use strict'

// What the usage finder shows: one line per global (defined in N files, written in N, read in N) that opens to its files with the
// line numbers, the real problems (read but never created, and not on the machine, when every folder that could create it was read)
// apart from the uncertain ones (the same, but some folder was not read: `maybe`, with a button to read it) and the soft hints (created
// but no file reads it: a plugin, a panel of DWC or the console may read it), the three cards that sort them (problems, to check, everything) with
// the one that opens first, the filters (card, by kind, by file, one search for a name or a file), the bars of a row, the references of a
// global grouped by file and the view by file (which globals a file touches). Pure: test/usage-scope.test.js.

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

export const CARDS = ['problems', 'check', 'all']

// card -> does the row belong to it: problems = sure problems, check = a maybe (a folder was not read) or a hint (nobody reads it)
export function inCard(r, card) {
	if (card === 'problems') return r.problem
	if (card === 'check') return r.maybe || r.hint
	return true
}

// the number on each card
export function cardCounts(rows) {
	const list = rows || []
	return { problems: list.filter(r => inCard(r, 'problems')).length, check: list.filter(r => inCard(r, 'check')).length, all: list.length }
}

// the card that opens first: the problems, else what is to check, else everything (the all-clear look)
export function defaultCard(counts) {
	if (counts.problems) return 'problems'
	return counts.check ? 'check' : 'all'
}

// how each card looks: its color (tone), icon and the key of its one plain sentence, which changes when there is nothing in it
export function cardLooks(counts) {
	const c = counts || { problems: 0, check: 0, all: 0 }
	return [
		{ id: 'problems', tone: c.problems ? 'err' : 'ok', icon: c.problems ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline', say: c.problems ? 'usage_card_problems_say' : 'usage_card_problems_none' },
		{ id: 'check', tone: c.check ? 'warn' : 'ok', icon: 'mdi-help-circle-outline', say: c.check ? 'usage_card_check_say' : 'usage_card_check_none' },
		{ id: 'all', tone: 'info', icon: 'mdi-format-list-bulleted', say: 'usage_card_all_say' }
	]
}

// a search or one file means "look at everything"; clearing them goes back to the card that opens first
export function cardAfterFilter(f, counts) {
	return f && (String(f.query || '').trim() || f.file) ? 'all' : defaultCard(counts)
}

// f = { card: 'problems' | 'check' | 'all', kinds: [kind ids] (none = all), file: '' (all) or a path, query: part of a global name or of a file path }
export function filterRows(rows, f) {
	const o = f || {}
	const q = String(o.query || '').trim().toLowerCase()
	const kinds = new Set(o.kinds || [])
	return (rows || []).filter(r => {
		if (o.card && !inCard(r, o.card)) return false
		if (kinds.size && !r.refs.some(x => kinds.has(x.kind))) return false
		if (o.file && !r.refs.some(x => x.file === o.file)) return false
		return !q || r.name.toLowerCase().indexOf(q) >= 0 || r.refs.some(x => x.file.toLowerCase().indexOf(q) >= 0)
	})
}

export function problemCounts(rows) {
	const n = key => (rows || []).filter(r => r[key]).length
	return { problems: n('problem'), maybe: n('maybe'), hints: n('hint') }
}

// the widest count of the list: the bars of every row are drawn against it
export function maxCount(rows) {
	return (rows || []).reduce((m, r) => Math.max(m, r.definedIn, r.writtenIn, r.readIn), 0)
}

// the width of one bar in percent: nothing for zero, at least a visible stub for any other number
export function barWidth(n, max) {
	if (!n || !max) return 0
	return Math.max(8, Math.round((n / max) * 100))
}

// the references of one global grouped by file, in order: [{ file, items: [{ line, kind }] }]
export function refsByFile(refs) {
	const out = []
	for (const r of refs || []) {
		let g = out[out.length - 1]
		if (!g || g.file !== r.file) {
			g = { file: r.file, items: [] }
			out.push(g)
		}
		g.items.push({ line: r.line, kind: r.kind })
	}
	return out
}

// the files read with how many globals each touches and how many of those are problems: the list of the view by file
export function fileList(refs, rows) {
	const bad = new Set((rows || []).filter(r => r.problem).map(r => r.name))
	const by = new Map()
	for (const r of refs || []) {
		if (!by.has(r.file)) by.set(r.file, { file: r.file, names: new Set(), problems: new Set() })
		const e = by.get(r.file)
		e.names.add(r.name)
		if (bad.has(r.name)) e.problems.add(r.name)
	}
	return Array.from(by.values()).map(e => ({ file: e.file, globals: e.names.size, problems: e.problems.size, names: Array.from(e.names) })).sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }))
}

// the files that touch a global, sorted
export function filesOf(refs) {
	return Array.from(new Set((refs || []).map(r => r.file))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// the search of the page over the list of files: part of the path or part of the name of a global the file touches
export function filterFiles(list, query) {
	const q = String(query || '').trim().toLowerCase()
	if (!q) return list || []
	return (list || []).filter(f => f.file.toLowerCase().indexOf(q) >= 0 || f.names.some(n => n.toLowerCase().indexOf(q) >= 0))
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
