'use strict'

// The path dictionary: what a path of the object model means, its unit, whether it can be changed and with which G-code. The entries
// live in path-dictionary-data.js (one line each, wildcards for the indexes) and their texts in the catalogs (dict_<id>); this
// module only matches a concrete path to an entry and checks the firmware version the entry needs. Pure: test/path-dictionary.test.js.
//
// A pattern is a path with wildcards: `[*]` stands for one index, a `*` in the middle for one name, and a `*` at the end for "anything
// below" (at least one more step). heat.heaters[*].active matches heat.heaters[2].active; heat.heaters[*].model.* matches
// heat.heaters[0].model.pid.kp. When several entries match, the most specific one wins (more literal steps).

import { splitPath } from './model-path.js'
import { compareVersions, parseVersion } from './rrf-version.js'
import { DICTIONARY } from './path-dictionary-data.js'

export const CHANGE_KINDS = ['gcode', 'config', 'readonly', 'meta']

// the help of the block in the detail panel (DESIGN.md section 7): texts dict_help_*
export const DICT_HELP = { id: 'dictionary', label: 'dict_title', what: 'dict_help_what', why: 'dict_help_why', ifMissing: 'dict_help_missing', help: 'dict_help_how' }

const LITERAL = 3
const INDEX = 2
const NAME = 1

// 'heat.heaters[*].active' -> [{ type: 'name', key: 'heat' }, ..., { type: 'index' }, ...]; a last '*' is { type: 'rest' }
export function patternTokens(pattern) {
	const out = []
	const parts = String(pattern || '').match(/\[\*\]|\[\d+\]|[^.[\]]+/g) || []
	parts.forEach((p, i) => {
		if (p === '[*]') out.push({ type: 'index' })
		else if (p === '*') out.push({ type: i === parts.length - 1 ? 'rest' : 'any' })
		else out.push({ type: 'name', key: p.replace(/^\[|\]$/g, ''), index: p.charAt(0) === '[' })
	})
	return out
}

// how well the pattern fits the path: a score (higher = more specific) or -1 when it does not match
export function matchScore(tokens, segments) {
	let score = 0
	for (let i = 0; i < tokens.length; i++) {
		const tk = tokens[i]
		const seg = segments[i]
		if (tk.type === 'rest') return segments.length > i ? score : -1
		if (!seg) return -1
		if (tk.type === 'index') {
			if (!seg.index) return -1
			score += INDEX
		} else if (tk.type === 'any') {
			if (seg.index) return -1
			score += NAME
		} else {
			if (seg.index !== tk.index || seg.key !== tk.key) return -1
			score += LITERAL
		}
	}
	return tokens.length === segments.length ? score : -1
}

const compiled = new WeakMap()
function tokensOf(entry) {
	if (!compiled.has(entry)) compiled.set(entry, patternTokens(entry.path))
	return compiled.get(entry)
}

// the entry that best matches a concrete path, or null
export function findEntry(path, dictionary) {
	const segments = splitPath(path)
	if (!segments.length) return null
	let best = null
	let bestScore = -1
	for (const entry of dictionary || DICTIONARY) {
		const score = matchScore(tokensOf(entry), segments)
		if (score > bestScore) {
			best = entry
			bestScore = score
		}
	}
	return best
}

// does the firmware have what the entry describes? An unknown version counts as yes (nothing is known to be missing)
export function availableIn(entry, firmwareVersion) {
	if (!entry || !entry.since) return true
	if (!parseVersion(firmwareVersion)) return true
	return compareVersions(firmwareVersion, entry.since) >= 0
}

// path + firmware version -> null (not in the dictionary) or
// { id, textKey, unitKey (or null), change, changeKey, codes, since (or null), available }
export function describePath(path, firmwareVersion, dictionary) {
	const entry = findEntry(path, dictionary)
	if (!entry) return null
	return {
		id: entry.id,
		textKey: 'dict_' + entry.id,
		unitKey: entry.unit ? 'dict_unit_' + entry.unit : null,
		change: entry.change,
		changeKey: 'dict_change_' + entry.change,
		codes: entry.codes.slice(),
		since: entry.since || null,
		available: availableIn(entry, firmwareVersion)
	}
}
