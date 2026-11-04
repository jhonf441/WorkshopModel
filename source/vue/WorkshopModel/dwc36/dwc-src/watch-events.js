'use strict'

// The changes of a watched path, for every kind of value: one event each time its text changes ({ t, text, kind }), and for an
// array or an object what changed inside it (change-diff.js diffMaps over its leaves: added, removed, changed). The event table gives
// the time, the value before, the value after and how long the value before lasted. Pure: test/watch-render.test.js.

import { flattenModel } from './flat-list.js'
import { diffMaps } from './change-diff.js'
import { clip, kindOf, toPlain } from './value-format.js'

export const EVENTS_CAP = 200
export const INNER_CAP = 20
export const INNER_LEAVES = 500
export const EVENT_TEXT_MAX = 200

// path -> text of every leaf inside an array or an object (empty for anything else)
export function innerTexts(value) {
	const m = new Map()
	if (value === null || typeof value !== 'object') return m
	for (const l of flattenModel(toPlain(value, 6), INNER_LEAVES).leaves) m.set(l.path, l.text)
	return m
}

function lastEvent(entry) {
	const ev = entry.events || []
	return ev.length ? ev[ev.length - 1] : null
}

// adds an event when the text of the value changed (the first sample is the first event); returns the entry (the same object)
export function recordEvent(entry, t, value, text) {
	if (value === undefined) return entry
	if (!entry.events) entry.events = []
	const kind = kindOf(value)
	const shown = clip(text, EVENT_TEXT_MAX)
	const last = lastEvent(entry)
	const branch = kind === 'array' || kind === 'object'
	const inner = branch ? innerTexts(value) : null
	if (last && last.text === shown) {
		entry.inner = inner
		return entry
	}
	const ev = { t, text: shown, kind }
	if (branch && last && entry.inner) {
		const d = diffMaps(entry.inner, inner)
		ev.changes = d.slice(0, INNER_CAP)
		ev.more = Math.max(0, d.length - INNER_CAP)
	}
	entry.inner = inner
	entry.events.push(ev)
	if (entry.events.length > EVENTS_CAP) entry.events.splice(0, entry.events.length - EVENTS_CAP)
	return entry
}

// newest first: [{ t, before, after, lasted (ms the value before lasted, null for the first), kind, changes, more }]
export function eventTable(events) {
	const ev = events || []
	const out = []
	for (let i = ev.length - 1; i >= 0; i--) {
		const prev = i > 0 ? ev[i - 1] : null
		out.push({ t: ev[i].t, before: prev ? prev.text : null, after: ev[i].text, lasted: prev ? ev[i].t - prev.t : null, kind: ev[i].kind, changes: ev[i].changes || [], more: ev[i].more || 0 })
	}
	return out
}

// an empty step that lasted at most this long between two values is a clear-and-set (a macro that blanks a global, then sets it)
export const EMPTY_FOLD_MS = 5000
// the toggle and its help (DESIGN.md section 7): keys of plugins.WorkshopModel.model.*
export const FOLD_CHOICE = { id: 'fold', label: 'chg_fold', what: 'chg_fold_what', why: 'chg_fold_why', ifMissing: 'chg_fold_missing', help: 'chg_fold_help' }

// how a before / after text is shown: 'none' = it did not exist (null / undefined), 'empty' = a real empty text, 'value' = anything else
export function cellKind(text) {
	if (text === null || text === undefined) return 'none'
	return text === '' ? 'empty' : 'value'
}

// folds A -> '' -> B (rows newest first, as eventTable gives them) into one row A -> B when the empty step lasted `maxMs` or less.
// The folded row keeps the time and the inner changes of the row that set B, how long A lasted, and `viaEmpty` + `emptyMs`.
// An empty at the oldest row (nothing before it), at the newest row (still empty), a long empty and other values stay as they are.
export function foldEmptyPairs(rows, maxMs) {
	const limit = maxMs === undefined ? EMPTY_FOLD_MS : maxMs
	const list = rows || []
	const out = []
	for (let i = 0; i < list.length; i++) {
		const set = list[i]
		const clear = list[i + 1]
		const pair = clear && set.before === '' && set.after !== '' && clear.after === '' && clear.before !== null && clear.before !== '' && set.lasted !== null && set.lasted <= limit
		if (!pair) {
			out.push(set)
			continue
		}
		out.push(Object.assign({}, set, { before: clear.before, lasted: clear.lasted, viaEmpty: true, emptyMs: set.lasted }))
		i++
	}
	return out
}

// the events kept in the file: plain, without what is only needed in memory
export function storedEvents(events) {
	return (events || []).slice(-100).map(e => {
		const o = { t: e.t, text: e.text, kind: e.kind }
		if (e.changes && e.changes.length) o.changes = e.changes
		if (e.more) o.more = e.more
		return o
	})
}

export function parseEvents(list) {
	return (Array.isArray(list) ? list : []).filter(e => e && typeof e.t === 'number' && typeof e.text === 'string').map(e => ({ t: e.t, text: e.text, kind: typeof e.kind === 'string' ? e.kind : 'string', changes: Array.isArray(e.changes) ? e.changes : undefined, more: e.more || 0 })).slice(-EVENTS_CAP)
}
