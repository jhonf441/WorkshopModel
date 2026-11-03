'use strict'

// What a snapshot covers, chosen inside the Snapshots section (2026-11-03): the whole model, or one part of it picked right there
// (a search over the branches of the live model, the roots, the favourite branches, the parts used before and what is selected in the
// Model section, each as one tap). It always says in words what will be saved ("Only move.axes - about N values") and how many values
// that is (the same flatten as makeSnapshot, cut to the budget). Pure (no Vue, no DWC): test/snapshot-scope.test.js.

import { childrenOf, searchModel } from './model-tree.js'
import { isBranch } from './value-format.js'
import { getAtPath, joinPath } from './model-path.js'
import { flattenModel } from './flat-list.js'

export const RECENT_KEY = 'workshopModelSnapshotScopes'
export const RECENT_MAX = 5
export const CHIPS_MAX = 12
export const SEARCH_MAX = 20
export const CHIP_KINDS = ['selected', 'favorite', 'recent', 'root']

// the root branches of the model (move, heat, global...), in the order of the model
export function rootBranches(model) {
	return childrenOf(model).filter(c => isBranch(c.value)).map(c => joinPath('', c.key, c.index))
}

// a path that names something of the model now (a branch or a single value)
export function scopeExists(model, path) {
	const p = String(path || '')
	return !!p && getAtPath(model, p) !== undefined
}

// the branches that match a search, by key or by the whole path when a dot or a bracket is typed (model-tree.js searchModel), at
// most SEARCH_MAX, branches only -> [{ path, count }]
export function searchBranches(model, query, max) {
	const q = String(query || '').trim()
	if (!q) return []
	return searchModel(model, q, 400).filter(r => r.kind === 'object' || r.kind === 'array').slice(0, max || SEARCH_MAX).map(r => ({ path: r.path, count: childrenOf(getAtPath(model, r.path)).length }))
}

// the one-tap chips, without repeats and in this order: what is selected in Model, the favourite branches, the parts used before,
// the roots; at most CHIPS_MAX. Only paths that exist in the model now. -> [{ path, kind }]
export function scopeChips(model, o) {
	const opt = o || {}
	const out = []
	const seen = new Set()
	const add = (path, kind) => {
		const p = String(path || '')
		if (!p || seen.has(p) || out.length >= CHIPS_MAX || !scopeExists(model, p)) return
		seen.add(p)
		out.push({ path: p, kind })
	}
	add(opt.selected, 'selected')
	for (const p of opt.pinned || []) if (isBranch(getAtPath(model, p))) add(p, 'favorite')
	for (const p of opt.recent || []) add(p, 'recent')
	for (const p of rootBranches(model)) add(p, 'root')
	return out
}

// how many values the snapshot would hold now, cut to the budget of the tier -> { count, truncated, exists }
export function scopeEstimate(model, scope, maxLeaves) {
	const s = String(scope || '')
	const node = s ? getAtPath(model, s) : model
	if (node === undefined || node === null) return { count: 0, truncated: false, exists: false }
	if (typeof node !== 'object') return { count: 1, truncated: false, exists: true }
	const flat = flattenModel(node, maxLeaves)
	return { count: flat.leaves.length, truncated: flat.truncated, exists: true }
}

// the sentence of what will be saved: a key of plugins.WorkshopModel.model.* and its params
export function scopeWords(scope, estimate) {
	const e = estimate || { count: 0, exists: false }
	const s = String(scope || '')
	if (s && !e.exists) return { key: 'look_scope_words_missing', params: { path: s } }
	if (!s) return { key: 'look_scope_words_all', params: { n: e.count } }
	return { key: e.truncated ? 'look_scope_words_part_cut' : 'look_scope_words_part', params: { path: s, n: e.count } }
}

// the parts used before, newest first, in this browser
export function readRecentScopes(storage) {
	try {
		const v = JSON.parse((storage && storage.getItem(RECENT_KEY)) || '[]')
		return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x).slice(0, RECENT_MAX) : []
	} catch (e) {
		return []
	}
}

export function withRecentScope(list, path) {
	const p = String(path || '')
	if (!p) return (list || []).slice(0, RECENT_MAX)
	return [p].concat((list || []).filter(x => x !== p)).slice(0, RECENT_MAX)
}

export function saveRecentScopes(storage, list) {
	try {
		storage.setItem(RECENT_KEY, JSON.stringify((list || []).slice(0, RECENT_MAX)))
		return true
	} catch (e) {
		return false
	}
}
