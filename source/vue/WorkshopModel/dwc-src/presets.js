'use strict'

// Presets of globals: a named copy of the values of every global, kept in one file of the SD card (PRESETS_FILE) so every browser
// sees the same list; compared with the live values; applied with set / global commands; exported and imported as a workshop JSON
// envelope (data-exchange.js). Pure: test/presets.test.js.

import { toPlain } from './value-format.js'
import { rrfLiteral, globalCommand } from './globals-typing.js'
import { isMap } from './model-path.js'

export const PRESETS_FILE = '0:/sys/workshop-model-presets.json'
export const PRESETS_FORMAT = 'workshop-model-presets'
export const PRESETS_VERSION = 1
export const PRESET_NAME_RE = /^\S[^\r\n]{0,39}$/

// model.global (Map or object) -> { name: plain value }
export function globalsSnapshot(globals) {
	const out = {}
	if (!globals) return out
	if (isMap(globals)) globals.forEach((v, k) => { out[String(k)] = toPlain(v) })
	else Object.keys(globals).forEach(k => { if (!k.startsWith('__')) out[k] = toPlain(globals[k]) })
	return out
}

export function makePreset(name, globals, now) {
	const at = now instanceof Date ? now : new Date()
	return { name: String(name).trim(), createdAt: at.toISOString(), values: globalsSnapshot(globals) }
}

// -> [{ name, preset (literal), current (literal or null), state: 'same' | 'differs' | 'missing' }] sorted by name
export function presetDiff(preset, globals) {
	const live = globalsSnapshot(globals)
	const values = (preset && preset.values) || {}
	return Object.keys(values).sort().map(name => {
		const p = rrfLiteral(values[name])
		const has = Object.prototype.hasOwnProperty.call(live, name)
		const c = has ? rrfLiteral(live[name]) : null
		return { name, preset: p, current: c, state: !has ? 'missing' : (p === c ? 'same' : 'differs') }
	})
}

// the commands that bring the machine to the preset: one per global that differs or is missing
export function presetCommands(preset, globals) {
	return presetDiff(preset, globals).filter(d => d.state !== 'same').map(d => globalCommand(d.name, d.preset, d.state !== 'missing'))
}

function validPreset(p) {
	return !!p && typeof p === 'object' && typeof p.name === 'string' && PRESET_NAME_RE.test(p.name) && p.values && typeof p.values === 'object' && !Array.isArray(p.values)
}

function clean(p) {
	return { name: p.name.trim(), createdAt: typeof p.createdAt === 'string' ? p.createdAt : '', values: Object.assign({}, p.values) }
}

// the file: { presets: [...] }; a damaged file gives an empty list, bad entries are dropped
export function parsePresetsText(text) {
	let o
	try {
		o = JSON.parse(String(text || '').replace(/^﻿/, ''))
	} catch (e) {
		return []
	}
	const list = o && Array.isArray(o.presets) ? o.presets : (Array.isArray(o) ? o : [])
	return sortByName(list.filter(validPreset).map(clean))
}

export function presetsText(list) {
	return JSON.stringify({ format: PRESETS_FORMAT, version: PRESETS_VERSION, presets: sortByName(list || []) }, null, 2) + '\n'
}

export function sortByName(list) {
	return (list || []).slice().sort((a, b) => a.name.localeCompare(b.name))
}

// a new list with the preset added or replaced by name
export function upsertPreset(list, preset) {
	return sortByName((list || []).filter(p => p.name !== preset.name).concat([preset]))
}

export function removePreset(list, name) {
	return (list || []).filter(p => p.name !== name)
}

// import: the incoming presets win over the ones with the same name; -> { list, added, replaced }
export function mergePresets(list, incoming) {
	const names = new Set((list || []).map(p => p.name))
	const valid = (incoming || []).filter(validPreset).map(clean)
	let added = 0
	let replaced = 0
	for (const p of valid) {
		if (names.has(p.name)) replaced++
		else added++
	}
	const keep = (list || []).filter(p => !valid.some(v => v.name === p.name))
	return { list: sortByName(keep.concat(valid)), added, replaced }
}
