'use strict'

// The hole assistant of the expression builder: the holes <name> of the text (expression-insert.js holesOf), which one the cursor is
// on, the next and the previous, and what each one asks for: its kind (HOLE_KINDS of the catalog: a number, a text, true or false, a
// path, a list, a position in a list, an axis, a heater, a tool, a fan, a global, a name, a letter, a file, an angle, or any value),
// read from where it sits (the type checker says what the place needs; the text around it says the rest: after global. a global,
// after [ a position, inside quotes a text) and the valid choices when they are finite (the axes, heaters, tools and fans this board
// has, the globals it has now, the lists of the model, true and false). Also whether a form of the catalog can be put where the
// cursor is (inside a text nothing fits; into a hole only a form that gives what the hole asks for; around a selection only a form
// whose first hole takes what the selection is), with the reason when it cannot. Pure: test/expression-guided.test.js.

import { helpChoice } from './view-choices.js'
import { getAtPath } from './model-path.js'
import { formatValue } from './value-format.js'
import { holesOf } from './expression-insert.js'
import { pathsOfType, collectionChoices, globalNames, CHOICES_LIMIT } from './expression-paths.js'

export const GUIDED_HELP = { assist: helpChoice('guided', 'assist'), checks: helpChoice('guided', 'checks') }
export const FIT_REASONS = ['in_string', 'hole_word', 'hole_path', 'hole_type', 'selection_word', 'selection_path', 'selection_type']

const COLLECTIONS = { 'move.axes': 'axis', 'heat.heaters': 'heater', tools: 'tool', fans: 'fan' }
const COLLECTION_OF_KIND = { axis: 'move.axes', heater: 'heat.heaters', tool: 'tools', fan: 'fans' }
// the kind a hole name suggests when its place asks for nothing in particular
const NAME_KINDS = { text: 'text', path: 'path', array: 'array', condition: 'bool', file: 'file', angle: 'angle', letter: 'letter', name: 'name', n: 'number', x: 'number', y: 'number', radians: 'number', degrees: 'number' }
// what a kind needs, in the types of expression-types.js ('word' is typed, never a value; 'path' is a name of the model)
const NEED_OF_KIND = { number: 'number', angle: 'number', index: 'number', axis: 'number', heater: 'number', tool: 'number', fan: 'number', bool: 'bool', text: 'string', file: 'string', array: 'array', path: 'path', global: 'word', name: 'word', letter: 'word', value: 'any' }
const INPUT_OF_KIND = { number: 'number', angle: 'number', index: 'number', axis: 'number', heater: 'number', tool: 'number', fan: 'number', text: 'text', file: 'text', name: 'text', letter: 'text', value: 'text' }
const PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*|\[\d+\])*$/
const PATH_BEFORE_RE = /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[\d+\])*)$/

// the hole the selection (or the cursor) is on, or null
export function holeAt(holes, selection) {
	if (!selection) return null
	const a = Number(selection.start) || 0
	const b = Math.max(a, Number(selection.end) || 0)
	return (holes || []).find(h => h.start <= a && b <= h.end) || null
}

// the hole an insertion or a fill goes to: the one under the cursor or selected; with the cursor elsewhere (a collapsed selection)
// the next open hole after it (wrapping), so a form or a path never lands beside a blank that is still open; a selection of real
// text that is not a hole is the person's own choice and has no target -> hole or null
export function targetHole(holes, selection, cursor) {
	const list = holes || []
	if (!list.length) return null
	const under = holeAt(list, selection)
	if (under) return under
	if (selection && Number(selection.end) > Number(selection.start)) return null
	return nextHole(list, cursor, true)
}

// the first hole that starts at or after `from` (the end of the current one); with wrap, the first of all when none follows
export function nextHole(holes, from, wrap) {
	const list = holes || []
	return list.find(h => h.start >= (Number(from) || 0)) || (wrap && list.length ? list[0] : null)
}

// the last hole that ends at or before `from` (the start of the current one); with wrap, the last of all when none precedes
export function prevHole(holes, from, wrap) {
	const list = (holes || []).filter(h => h.end <= (Number(from) || 0))
	return list.length ? list[list.length - 1] : wrap && holes && holes.length ? holes[holes.length - 1] : null
}

// true when the position is inside a text between double quotes
export function insideString(text, pos) {
	const s = String(text || '').slice(0, Math.max(0, Number(pos) || 0))
	return (s.split('"').length - 1) % 2 === 1
}

function collectionBefore(before) {
	const m = PATH_BEFORE_RE.exec(before.slice(0, -1))
	return m ? m[1] : ''
}

// the kind of a hole: what the text around it says first, then what the type checker says the place needs, then its name
export function holeKind(text, hole, expectation) {
	const before = String(text || '').slice(0, hole.start).replace(/\s+$/, '')
	if (hole.inString) return /fileexists\(\s*"[^"]*$/.test(before) ? 'file' : 'text'
	if (/global\.$/.test(before)) return 'global'
	if (/var\.$/.test(before)) return 'name'
	if (/param\.$/.test(before)) return 'letter'
	if (/\[$/.test(before)) return COLLECTIONS[collectionBefore(before)] || 'index'
	if (/#$/.test(before)) return 'array'
	if (/exists\($/.test(before)) return 'path'
	const e = expectation && expectation.expect
	if (e === 'number') return hole.name === 'angle' ? 'angle' : 'number'
	if (e === 'bool') return 'bool'
	if (e === 'string') return 'text'
	if (e === 'array' || e === 'list_or_text') return 'array'
	if (e === 'path') return 'path'
	return NAME_KINDS[hole.name] || 'value'
}

function choicesFor(kind, text, hole, model, d) {
	if (kind === 'bool') return [{ code: 'true', label: '' }, { code: 'false', label: '' }]
	if (kind === 'global') return globalNames(model).map(n => ({ code: n, label: '' }))
	if (kind === 'array') return pathsOfType(model, 'array', CHOICES_LIMIT).map(r => ({ code: r.path, label: '' }))
	if (kind === 'angle') return [{ code: 'radians(<degrees>)', label: '' }]
	if (COLLECTION_OF_KIND[kind] || kind === 'index') {
		d.collection = COLLECTION_OF_KIND[kind] || collectionBefore(String(text).slice(0, hole.start).replace(/\s+$/, ''))
		const r = collectionChoices(model, d.collection)
		d.size = r.size
		if (r.size) d.range = { min: 0, max: r.size - 1 }
		return r.choices
	}
	return []
}

// what a hole asks for: ctx { model, expectation (the entry of checkExpression().holes for it) } ->
// { name, text, start, end, inString, kind, where, choices, collection, size, input, range, reference, quote, pick, wanted, before, after }
// (a choice is { code, label, note? }: the code goes in as it is, the label is the letter or name of the item, note 'now' marks the
// value the other side has at this moment)
export function describeHole(text, hole, ctx) {
	const c = ctx || {}
	const model = c.model || null
	const e = c.expectation || null
	const s = String(text || '')
	const kind = holeKind(s, hole, e)
	const where = e && e.where ? e.where : null
	const d = { name: hole.name, text: hole.text, start: hole.start, end: hole.end, inString: !!hole.inString, kind, where, choices: [], collection: '', size: 0, input: INPUT_OF_KIND[kind] || '', range: null, reference: null, quote: kind === 'text' && !hole.inString, pick: false, wanted: '', before: s.slice(0, hole.start), after: s.slice(hole.end) }
	d.choices = choicesFor(kind, s, hole, model, d)
	if (kind === 'number' && where && where.role === 'arg' && where.what === 'random') d.range = { min: 1, max: null }
	if (where && where.other && PATH_RE.test(where.other) && model) {
		const v = getAtPath(model, where.other)
		if (v !== undefined) {
			d.reference = { what: where.other, value: formatValue(v) }
			// the value the other side has now, ready to put in (a text with its quotes as RRF writes them)
			if (typeof v === 'string' && (kind === 'text' || kind === 'value')) d.choices.push({ code: '"' + v.replace(/"/g, '""') + '"', label: '', note: 'now' })
			else if (typeof v === 'number' && Number.isFinite(v) && (kind === 'number' || kind === 'value')) d.choices.push({ code: String(v), label: '', note: 'now' })
		}
	}
	const need = NEED_OF_KIND[kind] || 'any'
	d.pick = need !== 'word' && kind !== 'index' && kind !== 'file' && !COLLECTION_OF_KIND[kind]
	d.wanted = d.pick && need !== 'any' && need !== 'path' ? need : ''
	return d
}

// the holes of a text with what each asks for; check is checkExpression() of the same text (its holes carry the expectations)
export function describeHoles(text, check, model) {
	const expectations = new Map()
	for (const h of (check && check.holes) || []) expectations.set(h.start, h)
	return holesOf(text).map(h => describeHole(text, h, { model, expectation: expectations.get(h.start) || null }))
}

// what goes into the hole for a typed value: quoted when the hole is a text outside quotes, one upper-case letter for a parameter
export function fillSnippet(desc, value) {
	const v = String(value === null || value === undefined ? '' : value).trim()
	if (!v) return ''
	if (desc && desc.kind === 'letter') return v.slice(0, 1).toUpperCase()
	if (desc && desc.quote) return '"' + v.replace(/"/g, '""') + '"'
	return v
}

// does a type of expression-types.js fit what a hole needs? (an unknown type always may)
export function typeFits(got, need) {
	if (!got || got === 'any' || got === 'hole' || need === 'any') return true
	return got === need
}

export function needOfKind(kind) {
	return NEED_OF_KIND[kind] || 'any'
}

// can a catalog entry go where the cursor is? context: { inString, hole: the describeHole() of the selected hole or null,
// selection: { text, type } or null } -> { ok } or { ok: false, reason (FIT_REASONS), need, got }
export function fitOfInsert(entry, context) {
	const c = context || {}
	if (c.inString) return { ok: false, reason: 'in_string' }
	if (c.hole) {
		const need = needOfKind(c.hole.kind)
		if (need === 'word') return { ok: false, reason: 'hole_word' }
		if (need === 'path') return entry.path ? { ok: true } : { ok: false, reason: 'hole_path' }
		if (!typeFits(entry.returns, need)) return { ok: false, reason: 'hole_type', need, got: entry.returns }
		return { ok: true }
	}
	const sel = c.selection
	const names = Object.keys((entry && entry.holes) || {})
	if (sel && String(sel.text || '').trim() && names.length) {
		const need = needOfKind(entry.holes[names[0]])
		if (need === 'word') return { ok: false, reason: 'selection_word' }
		if (need === 'path') return PATH_RE.test(String(sel.text).trim()) ? { ok: true } : { ok: false, reason: 'selection_path' }
		if (!typeFits(sel.type, need)) return { ok: false, reason: 'selection_type', need, got: sel.type }
	}
	return { ok: true }
}
