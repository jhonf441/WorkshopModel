'use strict'

// How a watched value is drawn, by its kind: a number keeps its sparkline with min and max (and, if asked, a mark on every sudden
// jump), a boolean an on / off timeline in two levels, a text or a word of the model (state.status, a machine mode) a timeline of
// coloured bands, one per value, as wide as the time it lasted, with a legend, and an array or an object the list of what changed
// inside it. The colour of a band is a stable hash of its text into the palette the page passes (the badge colours of the design
// family, DESIGN.md section 3), never a colour chosen here. Pure: test/watch-render.test.js.

export const WINDOW_MS = 10 * 60 * 1000
export const JUMP_FACTOR = 6
export const JUMP_MIN_SAMPLES = 5

// the setting of the markers row, with the help of DESIGN.md section 7 (keys of plugins.WorkshopModel.model.*)
export const MARKERS_SETTING = { id: 'markers', label: 'watch_markers', what: 'watch_markers_what', why: 'watch_markers_why', ifMissing: 'watch_markers_missing', help: 'watch_markers_help' }

// 'sparkline' | 'onoff' | 'bands' | 'inner' from the kind of the last value (value-format.js kindOf)
export function rendererFor(entry) {
	const kind = entry && entry.kind
	if (kind === 'int' || kind === 'float') return 'sparkline'
	if (kind === 'bool') return 'onoff'
	if (kind === 'array' || kind === 'object') return 'inner'
	return 'bands'
}

// FNV-1a over the text: the same text always gets the same index of a palette of n colours
export function colorIndex(text, n) {
	let h = 0x811c9dc5
	const s = String(text)
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 0x01000193) >>> 0
	}
	return n > 0 ? h % n : 0
}

// events [{ t, text }] in time order -> the bands of the last `windowMs` up to now: [{ text, from, to, frac, color }] (frac of the window)
export function buildBands(events, now, windowMs, paletteSize) {
	const ev = events || []
	if (!ev.length) return []
	const since = Math.max(ev[0].t, now - (windowMs || WINDOW_MS))
	const span = Math.max(1, now - since)
	const out = []
	for (let i = 0; i < ev.length; i++) {
		const to = i + 1 < ev.length ? ev[i + 1].t : now
		const from = Math.max(ev[i].t, since)
		if (to <= since || to <= from) continue
		out.push({ text: ev[i].text, from, to, frac: (to - from) / span, color: colorIndex(ev[i].text, paletteSize || 1) })
	}
	return out
}

// one line per value of the bands: [{ text, color, total (ms) }], the longest first
export function legendOf(bands) {
	const by = new Map()
	for (const b of bands || []) {
		if (!by.has(b.text)) by.set(b.text, { text: b.text, color: b.color, total: 0 })
		by.get(b.text).total += b.to - b.from
	}
	return Array.from(by.values()).sort((a, b) => b.total - a.total)
}

// a boolean as two levels: the bands of 'true' and 'false' with level 1 (on) or 0 (off)
export function onOffBands(events, now, windowMs) {
	return buildBands(events, now, windowMs, 1).map(b => Object.assign({}, b, { level: b.text === 'true' ? 1 : 0 }))
}

function median(list) {
	const s = list.slice().sort((a, b) => a - b)
	if (!s.length) return 0
	const m = Math.floor(s.length / 2)
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// the samples where the value jumped much more than it usually moves: |step| > factor x the median step (and the step is not 0)
// -> [{ i, t, from, to }]
export function jumpMarkers(series, factor) {
	const s = series || []
	if (s.length < JUMP_MIN_SAMPLES) return []
	const steps = []
	for (let i = 1; i < s.length; i++) steps.push(Math.abs(s[i].v - s[i - 1].v))
	const usual = median(steps)
	const k = factor || JUMP_FACTOR
	const out = []
	for (let i = 1; i < s.length; i++) {
		const step = steps[i - 1]
		if (step > 0 && step > k * usual) out.push({ i, t: s[i].t, from: s[i - 1].v, to: s[i].v })
	}
	return out
}

// the points of the sparkline (the same scale as watch-series.js sparklinePath) at the indexes of the marks: [{ x, y }]
export function markerPoints(series, marks, w, h) {
	const s = series || []
	if (s.length < 2) return []
	let min = s[0].v
	let max = s[0].v
	for (const p of s) {
		if (p.v < min) min = p.v
		if (p.v > max) max = p.v
	}
	const span = max - min
	return (marks || []).filter(m => m.i >= 0 && m.i < s.length).map(m => ({ x: (m.i / (s.length - 1)) * w, y: span === 0 ? h / 2 : h - ((s[m.i].v - min) / span) * h }))
}
