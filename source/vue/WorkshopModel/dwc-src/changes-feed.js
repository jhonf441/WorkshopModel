'use strict'

// The Changes view: only what changed in the model since a moment you choose, with the value at that moment and the value now.
// Moments: a mark you set, the moment the view opened (both kept as a snapshot of every leaf, so before / after are exact however
// much changed), and the last 10 seconds, minute or 5 minutes (folded from the events). Every sample of the page (the `leaves`
// prop, VIEW-CONTRACT.md) is compared with the previous one through change-diff.js (textMap, diffTexts, recordChanges); the feed
// starts with the changes the page already recorded (the `changes` prop) and also sees leaves that appear or go away. The values
// of a numeric path become a series with min / max through watch-series.js (watchEntry, pushSample, seriesStats).
// The feed is one plain object (createFeed) that feedTick changes in place. Pure (no Vue, no DWC): test/views2-changes.test.js.

import { textMap, diffTexts, recordChanges } from './change-diff.js'
import { watchEntry, pushSample, seriesStats } from './watch-series.js'

export const EVENT_CAP = 5000
// a path that changed at least FREQUENT_MIN times and on average every 2 s or faster is "frequent" (an uptime, a live reading)
export const FREQUENT_MIN = 5
export const FREQUENT_RATE = 0.5
export const STATUSES = ['changed', 'added', 'removed', 'back']

// what the wiring puts in view-choices.js VIEW_CHOICES: choice('changes', 'mdi-compare-horizontal', 'full'); its help keys
// (view_changes, view_changes_what, _why, _missing, _help) are in i18n/views2.*.json
export const VIEW = { id: 'changes', icon: 'mdi-compare-horizontal', layout: 'full' }

// a choice with the help of DESIGN.md section 7 (keys of plugins.WorkshopModel.model.*)
function choice(prefix, id, extra) {
	const k = prefix + id
	return Object.assign({ id, label: k, what: k + '_what', why: k + '_why', ifMissing: k + '_missing', help: k + '_help' }, extra || {})
}

// the moments to compare with; `ms` = a window that ends now, `snapshot` = exact before values
export const MOMENTS = [
	choice('changes_since_', 'mark', { snapshot: true }),
	choice('changes_since_', 'open', { snapshot: true }),
	choice('changes_since_', 's10', { ms: 10000 }),
	choice('changes_since_', 'm1', { ms: 60000 }),
	choice('changes_since_', 'm5', { ms: 300000 })
]
// the status filter (a filter by category: the .wf-cat pills of the family)
export const STATUS_CHOICES = STATUSES.map(id => choice('changes_status_', id))
export const FREQUENT_CHOICE = choice('changes_', 'hide_frequent')
// noise hidden by default: the command logs other plugins keep (a path under lastCommands) and a time stamp that moves every second
export const NOISE_CHOICE = choice('changes_', 'hide_noise')
export const NOISE_PATH_RE = /(^|\.)lastCommands(\[|\.|$)/
const STAMP_RE = /^"?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

// seed: the page's changes ([{ path, before, after, t }], newest first)
export function createFeed(now, seed) {
	const events = (Array.isArray(seed) ? seed : []).filter(e => e && typeof e.path === 'string' && typeof e.t === 'number').slice(0, EVENT_CAP)
	return { startedAt: now, open: null, mark: null, markSnap: null, prev: null, events: events.map(e => Object.assign({}, e)), ticks: 0, truncated: false }
}

// the leaves that appeared (before null) or went away (after null) between two maps path -> text
export function appearedGone(prev, next) {
	const out = []
	if (!prev || !next) return out
	next.forEach((after, path) => { if (!prev.has(path)) out.push({ path, before: null, after }) })
	prev.forEach((before, path) => { if (!next.has(path)) out.push({ path, before, after: null }) })
	return out
}

// one sample: leaves = [{ path, text }] of the page; truncated = the model had more leaves than the page lists.
// -> how many changes were found
export function feedTick(feed, leaves, truncated, now) {
	const next = textMap(leaves)
	let found = []
	if (feed.prev) {
		found = diffTexts(feed.prev, next)
		// a cut list sees leaves come and go at the cut: only a complete one reports them
		if (!truncated && !feed.truncated) found = found.concat(appearedGone(feed.prev, next))
	} else {
		feed.open = next
	}
	feed.events = recordChanges(feed.events, found, now, EVENT_CAP)
	feed.prev = next
	feed.ticks++
	feed.truncated = !!truncated
	return found.length
}

// the mark is the last sample: "what changed after now"
export function setMark(feed, now) {
	feed.mark = now
	feed.markSnap = feed.prev
	return feed
}

// forget everything recorded (the Clear button): the moment of opening and the mark start again from the last sample
export function clearFeed(feed, now) {
	feed.events = []
	feed.startedAt = now
	feed.open = feed.prev
	feed.mark = null
	feed.markSnap = null
	return feed
}

// -> { since, base }: the time the moment starts at and its snapshot (null for a window)
export function momentOf(feed, momentId, now) {
	const m = MOMENTS.find(x => x.id === momentId) || MOMENTS[1]
	if (m.ms) return { since: now - m.ms, base: null }
	if (m.id === 'mark' && feed.markSnap) return { since: feed.mark, base: feed.markSnap }
	return { since: feed.startedAt, base: feed.open }
}

// a text of the feed back to a value a series can draw: numbers and booleans; anything else stays text
function sampleOf(text) {
	if (text === 'true' || text === 'false') return text === 'true'
	const n = Number(text)
	return text !== null && text !== '' && Number.isFinite(n) ? n : text
}

function statusOf(before, after) {
	if (before === null && after !== null) return 'added'
	if (after === null && before !== null) return 'removed'
	return before === after ? 'back' : 'changed'
}

// the events after `since`, per path: { path, before (the first one's), count, first, last, entry (its samples) }
function foldEvents(events, since) {
	const byPath = new Map()
	for (let i = events.length - 1; i >= 0; i--) {
		const e = events[i]
		if (e.t <= since) continue
		if (!byPath.has(e.path)) {
			const entry = watchEntry(e.path)
			if (e.before !== null) pushSample(entry, since, sampleOf(e.before))
			byPath.set(e.path, { path: e.path, before: e.before, count: 0, first: e.t, last: e.t, entry })
		}
		const c = byPath.get(e.path)
		c.count++
		c.last = e.t
		if (e.after !== null) pushSample(c.entry, e.t, sampleOf(e.after))
	}
	return byPath
}

// the paths whose text at the moment (base) and now differ, even when their events fell out of the capped list
function addNetChanges(byPath, base, now, truncated) {
	const net = diffTexts(base, now).concat(truncated ? [] : appearedGone(base, now))
	for (const c of net) {
		if (!byPath.has(c.path)) byPath.set(c.path, { path: c.path, before: c.before, count: 0, first: null, last: null, entry: watchEntry(c.path) })
	}
}

function changeOut(c, base, current) {
	const before = base ? (base.has(c.path) ? base.get(c.path) : null) : c.before
	const after = current && current.has(c.path) ? current.get(c.path) : null
	const series = c.entry.series
	return { path: c.path, before, after, status: statusOf(before, after), count: c.count, first: c.first, last: c.last, numeric: series.length > 1, series, stats: seriesStats(series) }
}

// -> [{ path, before, after, status, count, first, last, numeric, series, stats }] of every path that changed after the moment,
// the most recent change first; before = the text at the moment (null: it was not in the model), after = the text now
export function changesSince(feed, momentId, now) {
	const m = momentOf(feed, momentId, now)
	const byPath = foldEvents(feed.events, m.since)
	if (m.base && feed.prev) addNetChanges(byPath, m.base, feed.prev, feed.truncated)
	return Array.from(byPath.values(), c => changeOut(c, m.base, feed.prev)).sort((a, b) => (b.last || 0) - (a.last || 0) || (a.path < b.path ? -1 : 1))
}

export function isFrequent(change, since, now) {
	const secs = Math.max(1, (now - since) / 1000)
	return change.count >= FREQUENT_MIN && change.count / secs >= FREQUENT_RATE
}

// a time stamp: a date and time text, or a number big enough to be seconds or milliseconds since 1970
export function isStampLike(text) {
	const s = String(text === null || text === undefined ? '' : text)
	return STAMP_RE.test(s) || (/^\d{10,13}(\.\d+)?$/.test(s) && Number(s) > 1e9)
}

// noise: a path under lastCommands, or a time stamp that changes about every second
export function isNoise(change, since, now) {
	if (NOISE_PATH_RE.test(change.path)) return true
	return isStampLike(change.after) && isFrequent(change, since, now)
}

// opts = { query, statuses: [status ids] (none = all), hideFrequent, hideNoise, since, now }
// -> { list, hidden: how many frequent were hidden, noise: how many noisy ones were hidden }
export function filterChanges(list, opts) {
	const o = opts || {}
	const q = String(o.query || '').trim().toLowerCase()
	const statuses = new Set(o.statuses || [])
	let hidden = 0
	let noise = 0
	const out = (list || []).filter(c => {
		if (statuses.size && !statuses.has(c.status)) return false
		if (q && [c.path, c.before, c.after].every(s => String(s === null ? '' : s).toLowerCase().indexOf(q) < 0)) return false
		if (o.hideNoise && isNoise(c, o.since, o.now)) {
			noise++
			return false
		}
		if (o.hideFrequent && isFrequent(c, o.since, o.now)) {
			hidden++
			return false
		}
		return true
	})
	return { list: out, hidden, noise }
}

// the last `n` names of a path (each with its indexes) for a narrow column ('plugins.X.lastCommands[10].origin.plugin' -> 'origin.plugin'), and
// whether something was left out
export function shortPath(path, n) {
	const s = String(path || '')
	const parts = s.match(/[^.[\]]+(\[\d+\])*/g) || [] // a name with the indexes that follow it: axes[0]
	const keep = n || 2
	if (parts.length <= keep) return { text: s, cut: false }
	return { text: parts.slice(-keep).join('.'), cut: true }
}

// 'hh:mm:ss' of a time
export function clockOf(ts) {
	const d = new Date(ts)
	const p = n => String(n).padStart(2, '0')
	return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

// how long ago, as a key of plugins.WorkshopModel.model.* and a number: { key: 'changes_ago_s' | '_m' | '_h', n }
export function agoOf(now, ts) {
	const s = Math.max(0, Math.round((now - ts) / 1000))
	if (s < 120) return { key: 'changes_ago_s', n: s }
	if (s < 7200) return { key: 'changes_ago_m', n: Math.round(s / 60) }
	return { key: 'changes_ago_h', n: Math.round(s / 3600) }
}
