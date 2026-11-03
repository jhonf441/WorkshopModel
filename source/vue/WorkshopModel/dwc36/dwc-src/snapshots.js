'use strict'

// Snapshots of the object model: a named copy of every leaf (path -> plain value) of the whole model or of one branch, kept in one
// file of the plugin (SNAPSHOTS_FILE, written through model-host.js on a standalone Duet and in SBC mode alike), compared with another
// snapshot or with the live model (change-diff.js diffMaps), exported and imported one at a time as a workshop JSON envelope
// (data-exchange.js, SNAPSHOT_EXPORT_FORMAT). How many snapshots and how many values each may hold is tier.js snapshotBudget().
// Pure: test/snapshots.test.js.

import { flattenModel } from './flat-list.js'
import { diffMaps } from './change-diff.js'
import { formatValue } from './value-format.js'
import { getAtPath } from './model-path.js'
import { helpChoice } from './view-choices.js'

export const SNAPSHOTS_FILE = '0:/sys/workshop-model-snapshots.json'
export const SNAPSHOTS_FORMAT = 'workshop-model-snapshots'
export const SNAPSHOT_EXPORT_FORMAT = 'workshop-model-snapshot'
export const SNAPSHOTS_VERSION = 1
export const SNAPSHOT_NAME_RE = /^\S[^\r\n]{0,39}$/
export const LIVE = '__live__'

// what a new snapshot covers, with the help of DESIGN.md section 7 (keys scope_<id>, _what, _why, _missing, _help)
export const SNAPSHOT_SCOPES = [helpChoice('scope', 'all', { icon: 'mdi-earth' }), helpChoice('scope', 'branch', { icon: 'mdi-source-branch' })]

// a stored value: the plain leaf, [] or {} for an empty branch
function stored(leaf) {
	if (leaf.kind === 'array') return []
	if (leaf.kind === 'object') return {}
	return leaf.value
}

// a path relative to the scope ('letter', '[0].letter') -> the path from the root ('move.axes[0].letter')
function fullPath(scope, rel) {
	if (!scope) return rel
	return scope + (rel.startsWith('[') ? '' : '.') + rel
}

// the name a snapshot gets when the person leaves the field empty: "<prefix> [<last part of the branch>] yyyy-mm-dd hh:mm" in local time,
// cut to the name limit, and numbered "(2)", "(3)"... when that name is already taken
export function defaultSnapshotName(prefix, scope, now, taken) {
	const d = now instanceof Date ? now : new Date()
	const p2 = n => String(n).padStart(2, '0')
	const stamp = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes())
	const part = String(scope || '').split(/[.[\]]+/).filter(Boolean).pop() || ''
	const used = new Set((taken || []).map(x => (x && x.name !== undefined ? x.name : x)))
	const label = (part ? String(prefix) + ' ' + part : String(prefix)).slice(0, 40 - stamp.length - 1).trim()
	const base = label + ' ' + stamp
	if (!used.has(base)) return base
	for (let n = 2; n < 1000; n++) {
		const suffix = ' (' + n + ')'
		const name = base.slice(0, 40 - suffix.length) + suffix
		if (!used.has(name)) return name
	}
	return base
}

// root + scope ('' = the whole model, else a path) -> { name, createdAt, scope, values: { path: value }, count, truncated }
export function makeSnapshot(name, root, scope, now, maxLeaves) {
	const at = now instanceof Date ? now : new Date()
	const s = String(scope || '')
	const node = s ? getAtPath(root, s) : root
	const values = {}
	let truncated = false
	if (node !== null && node !== undefined && typeof node === 'object') {
		const flat = flattenModel(node, maxLeaves)
		truncated = flat.truncated
		for (const l of flat.leaves) values[fullPath(s, l.path)] = stored(l)
	} else if (s && node !== undefined) values[s] = node
	return { name: String(name || '').trim(), createdAt: at.toISOString(), scope: s, values, count: Object.keys(values).length, truncated }
}

// path -> one-line text, the form diffMaps compares
export function textsOf(snapshot) {
	const m = new Map()
	const v = (snapshot && snapshot.values) || {}
	for (const p of Object.keys(v)) m.set(p, formatValue(v[p]))
	return m
}

// [{ path, before, after, state }] from a to b; only the paths under the scopes both of them cover are compared
export function snapshotDiff(a, b) {
	const ta = textsOf(a)
	const tb = textsOf(b)
	const inScope = (snap, path) => !snap || !snap.scope || path === snap.scope || path.startsWith(snap.scope + '.') || path.startsWith(snap.scope + '[')
	const keep = m => new Map(Array.from(m).filter(([p]) => inScope(a, p) && inScope(b, p)))
	return diffMaps(keep(ta), keep(tb))
}

export function diffSummary(diff) {
	const n = s => (diff || []).filter(d => d.state === s).length
	return { changed: n('changed'), added: n('added'), removed: n('removed'), total: (diff || []).length }
}

function valid(s) {
	return !!s && typeof s === 'object' && typeof s.name === 'string' && SNAPSHOT_NAME_RE.test(s.name) && !!s.values && typeof s.values === 'object' && !Array.isArray(s.values)
}

function clean(s) {
	const values = Object.assign({}, s.values)
	return { name: s.name.trim(), createdAt: typeof s.createdAt === 'string' ? s.createdAt : '', scope: typeof s.scope === 'string' ? s.scope : '', values, count: Object.keys(values).length, truncated: !!s.truncated }
}

// newest first
export function sortSnapshots(list) {
	return (list || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || a.name.localeCompare(b.name))
}

// the file: { format, version, snapshots: [...] }; a damaged file gives an empty list, bad entries are dropped
export function parseSnapshotsText(text) {
	let o
	try {
		o = JSON.parse(String(text || '').replace(/^﻿/, ''))
	} catch (e) {
		return []
	}
	const list = o && Array.isArray(o.snapshots) ? o.snapshots : []
	return sortSnapshots(list.filter(valid).map(clean))
}

export function snapshotsText(list) {
	return JSON.stringify({ format: SNAPSHOTS_FORMAT, version: SNAPSHOTS_VERSION, snapshots: sortSnapshots(list) }) + '\n'
}

// the list with the snapshot added (one with the same name is replaced), then cut to the newest `max`
export function addSnapshot(list, snapshot, max) {
	const next = sortSnapshots((list || []).filter(s => s.name !== snapshot.name).concat([snapshot]))
	return max ? next.slice(0, max) : next
}

export function removeSnapshot(list, name) {
	return (list || []).filter(s => s.name !== name)
}

// an imported snapshot (the data of the envelope) -> a clean snapshot or null
export function importedSnapshot(data) {
	const s = data && data.snapshot
	return valid(s) ? clean(s) : null
}
