'use strict'

// Values in words a person reads: a number with its unit (degrees C, mm, percent, V, rpm, mm/s), bytes as KB / MB / GB, seconds as minutes, hours
// and days, a colour as a swatch. The answer is always a text key of plugins.WorkshopModel.model.* with its parameters, so the page
// translates it ({ key, params }); the numbers are rounded here. humanHint() reads the key names of a path to know when a plain number
// is bytes or a duration (freeSpace, capacity, size, upTime, duration, timesLeft...). Pure: test/value-human.test.js.

import { formatValue, clip } from './value-format.js'
import { splitPath } from './model-path.js'

const KB = 1024

// a number rounded to `digits` decimals, without trailing zeros: 12.50 -> "12.5", 3.0 -> "3"
export function num(v, digits) {
	const f = Math.pow(10, digits || 0)
	return String(Math.round(v * f) / f)
}

function isNum(v) {
	return typeof v === 'number' && Number.isFinite(v)
}

export function humanBytes(n) {
	if (!isNum(n) || n < 0) return { key: 'unit_none', params: {} }
	if (n < KB) return { key: 'bytes_b', params: { v: num(n, 0) } }
	if (n < KB * KB) return { key: 'bytes_kb', params: { v: num(n / KB, 1) } }
	if (n < KB * KB * KB) return { key: 'bytes_mb', params: { v: num(n / KB / KB, 1) } }
	return { key: 'bytes_gb', params: { v: num(n / KB / KB / KB, 2) } }
}

export function humanDuration(s) {
	if (!isNum(s) || s < 0) return { key: 'unit_none', params: {} }
	if (s < 60) return { key: 'dur_s', params: { s: num(s, s < 10 ? 1 : 0) } }
	const t = Math.round(s)
	if (t < 3600) return { key: 'dur_ms', params: { m: Math.floor(t / 60), s: t % 60 } }
	if (t < 86400) return { key: 'dur_hm', params: { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60) } }
	return { key: 'dur_dh', params: { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600) } }
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+\s*)?\)$/i

function hex2(n) {
	return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2)
}

// '#f00', '#ff0000', '#ff0000cc', 'rgb(255, 0, 0)' or [255, 0, 0] -> '#ff0000'; anything else -> null
export function colorOf(v) {
	if (Array.isArray(v)) return v.length >= 3 && v.length <= 4 && v.every(x => isNum(x) && x >= 0 && x <= 255) ? '#' + v.slice(0, 3).map(hex2).join('') : null
	if (typeof v !== 'string') return null
	const s = v.trim()
	if (HEX_RE.test(s)) {
		const h = s.slice(1)
		return '#' + (h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6)).toLowerCase()
	}
	const m = RGB_RE.exec(s)
	return m ? '#' + [m[1], m[2], m[3]].map(x => hex2(Number(x))).join('') : null
}

const BYTES_KEY_RE = /(bytes|size|space|capacity|ram|heap)$/i
const MEMORY_PARENT_RE = /^(memory|ram)$/i
const MEMORY_KEY_RE = /^(total|available|used|free)$/i
const DURATION_KEY_RE = /(duration|uptime|printtime|simulatedtime|deadtime|timeconstant)$/i
const COLOR_KEY_RE = /colou?r/i

// what the key names of a path say a value is: 'color' | 'bytes' | 'duration' | null
export function humanHint(path, value) {
	const parts = splitPath(path)
	const key = parts.length ? parts[parts.length - 1].key : ''
	const parent = parts.length > 1 ? parts[parts.length - 2].key : ''
	if (colorOf(value) && (typeof value === 'string' || COLOR_KEY_RE.test(key))) return 'color'
	if (!isNum(value) || value < 0) return null
	if (/^ms/i.test(key)) return null // msUpTime: the milliseconds of a time, not a duration
	if (key === 'filePosition' || BYTES_KEY_RE.test(key) || (MEMORY_PARENT_RE.test(parent) && MEMORY_KEY_RE.test(key))) return 'bytes'
	if (DURATION_KEY_RE.test(key) || /^timesLeft$/i.test(parent)) return 'duration'
	return null
}

// -> null (nothing to add to the plain text) or { hint, key, params, color? }
export function humanize(path, value) {
	const hint = humanHint(path, value)
	if (hint === 'color') return { hint, key: 'unit_text', params: { v: clip(String(value), 40) }, color: colorOf(value) }
	if (hint === 'bytes') return Object.assign({ hint }, humanBytes(value))
	if (hint === 'duration') return Object.assign({ hint }, humanDuration(value))
	return null
}

const STATE_WORDS = { true: 'unit_yes', false: 'unit_no' }

// a value with its unit -> { key, params }. unit: celsius, mm, percent (a fraction 0..1), percent100, volt, rpm, mm_s, bytes, seconds,
// entries (a count), bool, triggered, text (a string as it is), state (a word of the model), value (formatValue, the default)
export function unitText(value, unit) {
	if (value === null || value === undefined) return { key: 'unit_none', params: {} }
	if (unit === 'bytes') return humanBytes(value)
	if (unit === 'seconds') return humanDuration(value)
	if (unit === 'bool') return { key: STATE_WORDS[String(!!value)], params: {} }
	if (unit === 'triggered') return { key: value ? 'unit_triggered' : 'unit_not_triggered', params: {} }
	if (unit === 'text' || unit === 'state') return { key: 'unit_text', params: { v: clip(typeof value === 'string' ? value : formatValue(value), 80) } }
	if (!isNum(value)) return { key: 'unit_text', params: { v: formatValue(value) } }
	return numberText(value, unit)
}

function numberText(v, unit) {
	if (unit === 'celsius') return v < -270 ? { key: 'unit_none', params: {} } : { key: 'unit_celsius', params: { v: num(v, 1) } }
	if (unit === 'mm') return { key: 'unit_mm', params: { v: num(v, 3) } }
	if (unit === 'percent') return { key: 'unit_percent', params: { v: num(v * 100, 0) } }
	if (unit === 'percent100') return { key: 'unit_percent', params: { v: num(v, 1) } }
	if (unit === 'volt') return { key: 'unit_volt', params: { v: num(v, 1) } }
	if (unit === 'rpm') return v < 0 ? { key: 'unit_none', params: {} } : { key: 'unit_rpm', params: { v: num(v, 0) } }
	if (unit === 'mm_s') return { key: 'unit_mm_s', params: { v: num(v, 1) } }
	if (unit === 'entries') return { key: 'children_n', params: { n: v } }
	return { key: 'unit_text', params: { v: formatValue(v) } }
}
