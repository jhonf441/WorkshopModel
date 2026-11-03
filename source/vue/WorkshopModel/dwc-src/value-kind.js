'use strict'

// The kind of a value of the object model as the views show it (KindChip.vue): one of seven kinds, each with its gray icon and its
// word, and, where the value says something by itself, a mark: a dot for a boolean (on / off, the colours of meaning) and a swatch
// for a colour. A colour is a text such as "#ff8800", "#f80" or "rgb(255, 136, 0)", or a list of three numbers whose key names a
// colour (value-human.js colorOf / humanHint). The kinds of value-format.js kindOf (int, float, other...) map onto these (chipKind).
// A kind is not a state: its icon stays gray (DESIGN.md section 3). Pure (no Vue, no DWC): test/views2-kinds.test.js.

import { colorOf, humanHint } from './value-human.js'
import { childCount } from './model-tree.js'

export const KINDS = ['number', 'string', 'bool', 'array', 'object', 'null', 'colour']

export const KIND_ICONS = {
	number: 'mdi-numeric',
	string: 'mdi-format-quote-close',
	bool: 'mdi-toggle-switch-outline',
	array: 'mdi-code-brackets',
	object: 'mdi-code-braces',
	null: 'mdi-circle-off-outline',
	colour: 'mdi-palette-outline'
}

// a kind of value-format.js kindOf (or one of KINDS) -> one of KINDS
export function chipKind(kind) {
	if (kind === 'int' || kind === 'float') return 'number'
	if (kind === 'other') return 'string'
	return KINDS.indexOf(kind) >= 0 ? kind : 'null'
}

// the kind of a value; `path` (optional) lets a list of three numbers under a colour key count as a colour
export function valueKind(v, path) {
	if (v === null || v === undefined) return 'null'
	if (typeof v === 'boolean') return 'bool'
	if (typeof v === 'number' || typeof v === 'bigint') return 'number'
	if (typeof v === 'string') return colorOf(v) ? 'colour' : 'string'
	if (Array.isArray(v)) return path && humanHint(path, v) === 'color' ? 'colour' : 'array'
	if (typeof v === 'object') return 'object'
	return 'string'
}

function numberDetail(v) {
	if (typeof v !== 'number') return 'kind_number_int'
	if (!Number.isFinite(v)) return 'kind_number_special'
	return Number.isInteger(v) ? 'kind_number_int' : 'kind_number_float'
}

// the chip of a bare kind (no value at hand): { kind, icon, word, detail: '', swatch: '', on: null, size: 0 }
export function infoOfKind(kind) {
	const k = chipKind(kind)
	return { kind: k, icon: KIND_ICONS[k], word: 'kind_' + k, detail: '', swatch: '', on: null, size: 0 }
}

// -> { kind, icon, word, detail, swatch, on, size }; word and detail are keys of plugins.WorkshopModel.model.*
export function kindInfo(v, path) {
	const kind = valueKind(v, path)
	const info = infoOfKind(kind)
	if (kind === 'number') info.detail = numberDetail(v)
	if (kind === 'bool') info.on = !!v
	if (kind === 'colour') info.swatch = colorOf(v) || ''
	if (kind === 'array' || kind === 'object') info.size = childCount(v)
	return info
}

// the chip of a leaf of flat-list.js ({ path, kind, value }): an empty branch keeps its kind (its value is null there)
export function leafInfo(leaf) {
	if (leaf.kind === 'array' || leaf.kind === 'object') return infoOfKind(leaf.kind)
	return kindInfo(leaf.value, leaf.path)
}
