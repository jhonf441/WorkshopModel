'use strict'

// A value in one short line for a row: a long text is cut, an array shows its size and its first items, an object or a Map its size and
// its first keys; `full` is what opens on a tap. Pure: test/globals-groups.test.js.

import { childrenOf, childCount } from './model-tree.js'
import { formatValue, isBranch, clip, toPlain } from './value-format.js'

export const SHORT_MAX = 40
export const ITEMS_SHOWN = 3
export const FULL_MAX = 4000

// A value as text for the detail (MO-8): on ONE line when it fits ([20, 610, 0, 510]), and only when it does not fit, one level per line; the list of
// numbers that is too long wraps by the width instead of one number per line. Nested lists and objects fold only the levels that do not fit.
export const LINE_WIDTH = 72

function inline(v) {
	if (Array.isArray(v)) return '[' + v.map(inline).join(', ') + ']'
	if (v !== null && typeof v === 'object') return '{' + Object.keys(v).map(k => JSON.stringify(k) + ': ' + inline(v[k])).join(', ') + '}'
	const t = JSON.stringify(v)
	return t === undefined ? 'null' : t
}

export function layout(v, indent, width) {
	const flat = inline(v)
	if (v === null || typeof v !== 'object' || indent + flat.length <= width) return flat
	const pad = ' '.repeat(indent + 1)
	const close = ' '.repeat(indent)
	if (Array.isArray(v)) {
		if (v.every(x => x === null || typeof x !== 'object')) {
			const lines = []
			let cur = ''
			for (const it of v.map(inline)) {
				const next = cur ? cur + ', ' + it : it
				if (cur && pad.length + next.length > width) { lines.push(cur); cur = it } else cur = next
			}
			if (cur) lines.push(cur)
			return '[\n' + lines.map(l => pad + l).join(',\n') + '\n' + close + ']'
		}
		return '[\n' + v.map(x => pad + layout(x, indent + 1, width)).join(',\n') + '\n' + close + ']'
	}
	return '{\n' + Object.keys(v).map(k => pad + JSON.stringify(k) + ': ' + layout(v[k], indent + 1, width)).join(',\n') + '\n' + close + '}'
}

// -> { short, full, long: whether short leaves something out }
export function summarize(value, max) {
	const n = max || SHORT_MAX
	if (!isBranch(value)) {
		const text = typeof value === 'string' ? value : formatValue(value)
		return { short: clip(text, n), full: clip(text, FULL_MAX), long: text.length > n }
	}
	const items = childrenOf(value)
	const count = childCount(value)
	const shown = items.slice(0, ITEMS_SHOWN).map(c => (Array.isArray(value) ? formatValue(c.value) : c.key))
	const head = (Array.isArray(value) ? '[' : '{') + count + (Array.isArray(value) ? ']' : '}')
	const short = clip(head + (shown.length ? ' ' + shown.join(', ') + (count > ITEMS_SHOWN ? ', ...' : '') : ''), n)
	return { short, full: clip(layout(toPlain(value), 0, LINE_WIDTH), FULL_MAX), long: true }
}
