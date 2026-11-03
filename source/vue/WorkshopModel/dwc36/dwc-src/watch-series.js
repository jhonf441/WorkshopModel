'use strict'

// Watch list: the samples of a pinned path (one per tick), their minimum and maximum, the sparkline and the storage format.
// A numeric or boolean value is drawn (a boolean as 0 / 1); every kind of value also keeps its changes (watch-events.js: one event
// per new text, what changed inside an array or an object), which watch-render.js draws as bands, an on / off line or a list.
// Pure: test/watch-changes.test.js, test/watch-render.test.js.

import { recordEvent, storedEvents, parseEvents } from './watch-events.js'
import { kindOf } from './value-format.js'

export const WATCH_CAP = 300
export const WATCH_FORMAT = 'workshop-model-watch'
export const WATCH_VERSION = 1

// kind: of the last value (value-format.js kindOf); events: watch-events.js; inner: the leaves of the last array or object (memory only)
export function watchEntry(path) {
	return { path: String(path), series: [], text: '', numeric: false, kind: 'null', events: [], inner: null }
}

function numberOf(v) {
	if (typeof v === 'number') return Number.isFinite(v) ? v : null
	if (typeof v === 'boolean') return v ? 1 : 0
	return null
}

// adds one sample; returns the entry (the same object, changed)
export function pushSample(entry, t, value, cap) {
	const n = numberOf(value)
	entry.text = value === undefined ? '' : (typeof value === 'string' ? value : JSON.stringify(value === undefined ? null : value))
	if (value !== undefined) {
		entry.kind = kindOf(value)
		recordEvent(entry, t, value, entry.text)
	}
	if (n === null) {
		entry.numeric = false
		return entry
	}
	entry.numeric = true
	entry.series.push({ t, v: n })
	const max = cap || WATCH_CAP
	if (entry.series.length > max) entry.series.splice(0, entry.series.length - max)
	return entry
}

export function seriesStats(series) {
	const s = series || []
	if (!s.length) return { min: null, max: null, last: null, n: 0 }
	let min = s[0].v
	let max = s[0].v
	for (const p of s) {
		if (p.v < min) min = p.v
		if (p.v > max) max = p.v
	}
	return { min, max, last: s[s.length - 1].v, n: s.length }
}

// an SVG path ("M x y L x y ...") of the series in a w x h box; '' with fewer than two samples
export function sparklinePath(series, w, h) {
	const s = series || []
	if (s.length < 2) return ''
	const st = seriesStats(s)
	const span = st.max - st.min
	const x = i => (i / (s.length - 1)) * w
	const y = v => (span === 0 ? h / 2 : h - ((v - st.min) / span) * h)
	return s.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ')
}

// storage: { format, version, savedAt, entries: [{ path, series }] }
export function serializeWatch(entries, now) {
	return { format: WATCH_FORMAT, version: WATCH_VERSION, savedAt: now || Date.now(), entries: (entries || []).map(e => ({ path: e.path, kind: e.kind, series: e.series.slice(-WATCH_CAP), events: storedEvents(e.events) })) }
}

export function parseWatch(obj) {
	const o = typeof obj === 'string' ? safeJson(obj) : obj
	if (!o || o.format !== WATCH_FORMAT || !Array.isArray(o.entries)) return []
	return o.entries.filter(e => e && typeof e.path === 'string' && e.path).map(e => {
		const entry = watchEntry(e.path)
		entry.series = (Array.isArray(e.series) ? e.series : []).filter(p => p && typeof p.t === 'number' && typeof p.v === 'number').slice(-WATCH_CAP)
		entry.numeric = entry.series.length > 0
		entry.events = parseEvents(e.events)
		if (typeof e.kind === 'string') entry.kind = e.kind
		return entry
	})
}

function safeJson(text) {
	try {
		return JSON.parse(text)
	} catch (e) {
		return null
	}
}

// the union of two lists by path; the samples of both merged in time order without repeats, capped
export function mergeWatch(a, b) {
	const byPath = new Map()
	for (const e of (a || []).concat(b || [])) {
		if (!byPath.has(e.path)) byPath.set(e.path, watchEntry(e.path))
		const target = byPath.get(e.path)
		target.series = target.series.concat(e.series || [])
		target.events = target.events.concat(e.events || [])
		if (e.kind && e.kind !== 'null') target.kind = e.kind
	}
	return Array.from(byPath.values(), e => {
		const seen = new Set()
		e.series = e.series.sort((p, q) => p.t - q.t).filter(p => (seen.has(p.t) ? false : (seen.add(p.t), true))).slice(-WATCH_CAP)
		e.numeric = e.series.length > 0
		const seenEv = new Set()
		e.events = e.events.sort((p, q) => p.t - q.t).filter(p => (seenEv.has(p.t) ? false : (seenEv.add(p.t), true))).slice(-WATCH_CAP)
		return e
	})
}
