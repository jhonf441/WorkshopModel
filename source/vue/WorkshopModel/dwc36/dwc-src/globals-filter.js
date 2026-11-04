'use strict'

// The list of the Globals section: one item per global with what the rows show (kind, short value, kept across reboots, watched,
// favourite, last change, files that use it), the filters (text, kind group, kept, changed recently, watched) and the sort (name, type,
// last change). The kind groups and the natural order are the ones of the Flat list (flat-list.js). Every setting carries the help of
// DESIGN.md section 7. Pure: test/globals-groups.test.js.

import { childrenOf } from './model-tree.js'
import { naturalCompare } from './natural-order.js'
import { kindOf } from './value-format.js'
import { kindGroup, RECENT_MS } from './flat-list.js'
import { summarize } from './value-summary.js'
import { helpChoice } from './view-choices.js'

export const GLOBAL_SORTS = ['name', 'type', 'changed']
export const GLOBALS_SETTINGS = {
	persistent: helpChoice('globals_set', 'persistent'),
	changed: helpChoice('globals_set', 'changed'),
	watched: helpChoice('globals_set', 'watched'),
	sort: helpChoice('globals_set', 'sort'),
	quick: helpChoice('globals_set', 'quick')
}

const natural = naturalCompare

// model.global (a Map) + ctx { persistent, watched, pinned (names or paths), times (Map path -> ms), used (Map name -> files) }
export function globalItems(globals, ctx) {
	const c = ctx || {}
	const kept = new Set(c.persistent || [])
	const watched = new Set(c.watched || [])
	const pinned = new Set(c.pinned || [])
	return childrenOf(globals).map(g => {
		const path = 'global.' + g.key
		const t = c.times && typeof c.times.get === 'function' ? c.times.get(path) : 0
		return {
			name: g.key, path, value: g.value, kind: kindOf(g.value), summary: summarize(g.value),
			persistent: kept.has(g.key), watched: watched.has(path), pinned: pinned.has(path), changedAt: t || 0,
			usedIn: c.used && c.used.has(g.key) ? c.used.get(g.key) : null
		}
	})
}

// f = { query, groups: [kind group ids], onlyPersistent, onlyChanged, onlyWatched, now, recentMs }
export function filterGlobals(items, f) {
	const o = f || {}
	const q = String(o.query || '').trim().toLowerCase()
	const groups = new Set(o.groups || [])
	const since = (o.now || 0) - (o.recentMs || RECENT_MS)
	return (items || []).filter(it => {
		if (groups.size && !groups.has(kindGroup(it.kind))) return false
		if (o.onlyPersistent && !it.persistent) return false
		if (o.onlyWatched && !it.watched) return false
		if (o.onlyChanged && it.changedAt < since) return false
		return !q || it.name.toLowerCase().indexOf(q) >= 0 || it.summary.full.toLowerCase().indexOf(q) >= 0
	})
}

// a sorted copy; favourites first, then by name, by type or by the newest change
export function sortGlobals(items, by) {
	const key = GLOBAL_SORTS.indexOf(by) >= 0 ? by : 'name'
	const cmp = {
		name: (a, b) => natural(a.name, b.name),
		type: (a, b) => natural(a.kind, b.kind) || natural(a.name, b.name),
		changed: (a, b) => b.changedAt - a.changedAt || natural(a.name, b.name)
	}[key]
	return (items || []).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || cmp(a, b))
}
