'use strict'

// Export of the watch: the series of the watched paths (and the events of the Changes view when there are some) as CSV and JSON, with ISO
// time stamps, one column per path, a selectable range. A number is a number, a boolean is true or false, a text keeps its last
// value from the moment it changed (a text has events, not samples). The files themselves are handed to the browser by the exchange
// standard (data-exchange-ui.js); this module only builds the rows and the texts. Pure: test/watch-export.test.js.

import { helpChoice } from './view-choices.js'

export const EXPORT_FORMAT = 'workshop-model-watch-export'
export const EXPORT_VERSION = 1

// the range choices: how far back from now (null = everything the page holds)
export const EXPORT_RANGES = [
	{ id: 'all', ms: null }, { id: 'min1', ms: 60000 }, { id: 'min5', ms: 300000 }, { id: 'min15', ms: 900000 }, { id: 'hour1', ms: 3600000 }
]
export const EXPORT_RANGE_SETTING = helpChoice('export', 'range')

export function rangeBounds(id, now) {
	const r = EXPORT_RANGES.find(x => x.id === id) || EXPORT_RANGES[0]
	return { from: r.ms === null ? null : now - r.ms, to: null }
}

const inRange = (t, b) => (b.from === null || t >= b.from) && (b.to === null || t <= b.to)
const iso = t => new Date(t).toISOString()
const isText = e => !(e.numeric || (e.series && e.series.length))

// the value of a numeric or boolean sample as the column shows it
const sampleValue = (entry, v) => (entry.kind === 'bool' ? v === 1 : v)

// -> { columns: [path], rows: [{ t, values: [value or ''] }] } oldest first; the times are the samples of the numbers and the events of the texts
export function watchTable(entries, range) {
	const b = range || { from: null, to: null }
	const list = entries || []
	const times = new Set()
	const exact = list.map(e => {
		const m = new Map()
		if (!isText(e)) for (const p of e.series || []) if (inRange(p.t, b)) { m.set(p.t, sampleValue(e, p.v)); times.add(p.t) }
		return m
	})
	const steps = list.map(e => (isText(e) ? (e.events || []).slice().sort((x, y) => x.t - y.t) : []))
	steps.forEach(ev => ev.forEach(x => { if (inRange(x.t, b)) times.add(x.t) }))
	const rows = Array.from(times).sort((x, y) => x - y).map(t => ({
		t,
		values: list.map((e, i) => {
			if (!isText(e)) return exact[i].has(t) ? exact[i].get(t) : ''
			let last = ''
			for (const x of steps[i]) if (x.t <= t) last = x.text
			return last
		})
	}))
	return { columns: list.map(e => e.path), rows }
}

// one CSV cell: quoted when it has a comma, a quote or a line break; a text that a spreadsheet would read as a formula gets a quote first
export function csvCell(v) {
	if (v === null || v === undefined || v === '') return ''
	if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
	if (typeof v === 'boolean') return v ? 'true' : 'false'
	let s = String(v)
	if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
	return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

const csvLine = cells => cells.map(csvCell).join(',')

export function watchCsv(entries, range) {
	const t = watchTable(entries, range)
	const lines = [csvLine(['time'].concat(t.columns))]
	for (const r of t.rows) lines.push(csvLine([iso(r.t)].concat(r.values)))
	return lines.join('\r\n') + '\r\n'
}

// the events of the Changes view: [{ path, before, after, t }] newest first -> CSV oldest first
export function changesCsv(changes, range) {
	const b = range || { from: null, to: null }
	const lines = [csvLine(['time', 'path', 'before', 'after'])]
	for (const c of (changes || []).filter(x => inRange(x.t, b)).sort((x, y) => x.t - y.t)) lines.push(csvLine([iso(c.t), c.path, c.before, c.after]))
	return lines.join('\r\n') + '\r\n'
}

// the data of the JSON file: per path its kind, its samples and its events, then the changes; every time as ISO text
export function watchJson(entries, changes, range, now) {
	const b = range || { from: null, to: null }
	return {
		exportedAt: iso(now === undefined ? Date.now() : now),
		range: { from: b.from === null ? null : iso(b.from), to: b.to === null ? null : iso(b.to) },
		paths: (entries || []).map(e => ({
			path: e.path, kind: e.kind || 'null',
			samples: isText(e) ? [] : (e.series || []).filter(p => inRange(p.t, b)).map(p => ({ time: iso(p.t), value: sampleValue(e, p.v) })),
			events: (e.events || []).filter(x => inRange(x.t, b)).map(x => ({ time: iso(x.t), value: x.text, kind: x.kind }))
		})),
		changes: (changes || []).filter(x => inRange(x.t, b)).sort((x, y) => x.t - y.t).map(x => ({ time: iso(x.t), path: x.path, before: x.before, after: x.after }))
	}
}
