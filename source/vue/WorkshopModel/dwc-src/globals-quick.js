'use strict'

// The friendly Globals section (2026-11-03 redesign): what a card needs beyond globals-filter.js. The quick edit of a card (a switch
// for a boolean, a stepper for a number: the step follows the decimals of the value), the one Number type of the guided creator
// (int or float decided by what is typed), the counts of the header pills, the sort that cycles on a tap, the state chips of the
// filter row and the short "changed N s ago" mark. Pure (no Vue, no DWC): test/globals-quick.test.js.

import { GLOBAL_SORTS } from './globals-filter.js'
import { helpChoice } from './view-choices.js'

// a value changed within this window makes its card glow for a moment
export const FLASH_MS = 2500
// the state chips of the filter row, in order; each one carries the help of globals-filter.js GLOBALS_SETTINGS
export const STATE_CHIPS = ['persistent', 'watched', 'changed']
// the types the guided creator offers, in order, with the help of DESIGN.md section 7 (keys look_ctype_<id>, _what, _why, _missing, _help)
export const CREATOR_TYPES = [
	helpChoice('look_ctype', 'number', { icon: 'mdi-numeric', kinds: ['int', 'float'] }),
	helpChoice('look_ctype', 'bool', { icon: 'mdi-toggle-switch-outline', kinds: ['bool'] }),
	helpChoice('look_ctype', 'string', { icon: 'mdi-format-quote-close', kinds: ['string'] }),
	helpChoice('look_ctype', 'array', { icon: 'mdi-code-brackets', kinds: ['array'] }),
	helpChoice('look_ctype', 'expression', { icon: 'mdi-function-variant', kinds: ['expression'] })
]
export const CREATOR_STEPS = ['name', 'type', 'value']

// the quick edit a card offers for a kind of value-format.js kindOf: 'bool' (a switch), 'number' (a stepper) or '' (the full editor)
export function quickKind(kind, canEdit) {
	if (canEdit === false) return ''
	if (kind === 'bool') return 'bool'
	return kind === 'int' || kind === 'float' ? 'number' : ''
}

// how many decimals a number text shows ('7.25' -> 2, '7' -> 0, '1e-3' -> 0: not a plain decimal)
export function decimalsOf(text) {
	const m = /^[+-]?\d*\.(\d+)$/.exec(String(text === null || text === undefined ? '' : text).trim())
	return m ? m[1].length : 0
}

// the step of the stepper: 1 for a whole number; for a decimal the last digit shown (7.5 -> 0.1, 0.25 -> 0.01), never below 0.001
export function stepOf(kind, text) {
	if (kind !== 'float') return 1
	const d = Math.min(decimalsOf(text), 3)
	return d ? Number((1 / Math.pow(10, d)).toFixed(d)) : 1
}

// the text after one tap of the stepper (dir +1 or -1); a text that is not a number counts as 0; the decimals of the value are kept
export function stepped(kind, text, dir) {
	const s = String(text === null || text === undefined ? '' : text).trim()
	const base = Number(s)
	const from = s !== '' && Number.isFinite(base) ? base : 0
	const step = stepOf(kind, s)
	const d = kind === 'float' ? Math.max(decimalsOf(s), String(step).includes('.') ? String(step).split('.')[1].length : 0) : 0
	const next = from + (dir < 0 ? -step : step)
	return kind === 'float' ? next.toFixed(d).replace(/^-0(\.0+)?$/, m => m.slice(1)) : String(Math.round(next))
}

// the Number type of the creator is int or float by what is typed: a point or an exponent makes it a decimal
export function numberKind(text) {
	return /[.eE]/.test(String(text === null || text === undefined ? '' : text)) ? 'float' : 'int'
}

// a creator type id + the typed text -> the kind of globals-typing.js
export function creatorKind(typeId, text) {
	if (typeId === 'number') return numberKind(text)
	const type = CREATOR_TYPES.find(c => c.id === typeId)
	return type ? type.kinds[0] : 'int'
}

// the creator type that fits a kind of globals-typing.js (int and float are both Number)
export function creatorTypeOf(kind) {
	const type = CREATOR_TYPES.find(c => c.kinds.indexOf(kind) >= 0)
	return type ? type.id : 'number'
}

// the pills of the section head: how many globals, how many kept across reboots, how many watched, how many changed recently
export function globalsStats(items, now, recentMs) {
	const list = items || []
	const since = (now || 0) - (recentMs || 60000)
	return {
		total: list.length,
		kept: list.filter(i => i.persistent).length,
		watched: list.filter(i => i.watched).length,
		changed: list.filter(i => i.changedAt && i.changedAt >= since).length
	}
}

// one tap on the sort chip moves to the next order: name -> type -> last change -> name
export function nextSort(current) {
	const i = GLOBAL_SORTS.indexOf(current)
	return GLOBAL_SORTS[(i + 1) % GLOBAL_SORTS.length]
}

// a value that changed within FLASH_MS glows
export function recentlyChanged(changedAt, now, ms) {
	const at = Number(changedAt) || 0
	return at > 0 && (now || 0) - at >= 0 && (now || 0) - at <= (ms || FLASH_MS)
}

// the mark of a card: "changed 12 s ago" as a key of plugins.WorkshopModel.model.* and its number, or null when it never changed
export function changedAgo(changedAt, now) {
	const at = Number(changedAt) || 0
	if (!at) return null
	const s = Math.max(0, Math.round(((now || 0) - at) / 1000))
	if (s < 120) return { key: 'changes_ago_s', n: s }
	if (s < 7200) return { key: 'changes_ago_m', n: Math.round(s / 60) }
	return { key: 'changes_ago_h', n: Math.round(s / 3600) }
}

// the active filters as one list, so the chips row can offer "clear" and the empty state can say why nothing matches
export function activeFilters(f) {
	const o = f || {}
	const out = []
	if (String(o.query || '').trim()) out.push('query')
	for (const g of o.groups || []) out.push('group:' + g)
	for (const s of STATE_CHIPS) if (o[s]) out.push(s)
	return out
}

// a global with nothing in it: null, an empty list or an empty object (an empty text "" is a value: a text)
export function hasNoValue(value) {
	if (value === null || value === undefined) return true
	if (Array.isArray(value)) return value.length === 0
	if (value instanceof Map) return value.size === 0
	if (typeof value === 'object') return Object.keys(value).length === 0
	return false
}

// What the editor says under its field. An untouched field is NEVER red: the person did nothing yet, so a value that is empty or
// cannot be parsed gets a calm hint (a key of plugins.WorkshopModel.model.*) and the Send button simply stays off. Red comes only after
// the person typed something invalid or pressed apply. touched: the person typed or pressed; result: globals-typing.js editCommand;
// hasValue: whether the live global holds something (hasNoValue) -> { level: 'ok' | 'hint' | 'error', error, key }
export function editFeedback(touched, result, hasValue) {
	if (!result || result.ok) return { level: 'ok', error: '', key: '' }
	if (touched) return { level: 'error', error: result.error, key: 'err_' + result.error }
	if (result.error === 'name') return { level: 'hint', error: result.error, key: 'look_edit_hint_name' }
	return { level: 'hint', error: result.error, key: hasValue === false ? 'look_edit_novalue_hint' : 'look_edit_hint_empty' }
}

// who may fill a global, from the memory of the usage finder (usage-runner.js cache: path -> { refs: [{ name, kind }] }): the files
// that create or write it -> { known: a scan was done, files: [...] }
export function settersOf(cache, name) {
	const files = []
	const m = cache && typeof cache.forEach === 'function' ? cache : null
	if (!m || !m.size) return { known: false, files }
	m.forEach((entry, path) => {
		for (const r of (entry && entry.refs) || []) {
			if (r.name === name && (r.kind === 'set' || r.kind === 'define') && files.indexOf(path) < 0) files.push(path)
		}
	})
	return { known: true, files: files.sort() }
}

// the line of a card without a value: a key of plugins.WorkshopModel.model.* and its params
export function fillerLine(setters) {
	const s = setters || { known: false, files: [] }
	if (!s.known) return { key: 'look_card_filler_unknown', params: {} }
	if (!s.files.length) return { key: 'look_card_filler_none', params: {} }
	if (s.files.length === 1) return { key: 'look_card_filler_file', params: { file: s.files[0] } }
	return { key: 'look_card_filler_files', params: { files: s.files.slice(0, 3).join(', ') + (s.files.length > 3 ? ' (+' + (s.files.length - 3) + ')' : '') } }
}
