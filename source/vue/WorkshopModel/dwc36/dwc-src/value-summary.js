'use strict'

// A value in one short line for a row: a long text is cut, an array shows its size and its first items, an object or a Map its size and
// its first keys; `full` is what opens on a tap. Pure: test/globals-groups.test.js.

import { childrenOf, childCount } from './model-tree.js'
import { formatValue, isBranch, clip, toPlain } from './value-format.js'

export const SHORT_MAX = 40
export const ITEMS_SHOWN = 3
export const FULL_MAX = 4000

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
	return { short, full: clip(JSON.stringify(toPlain(value), null, 1), FULL_MAX), long: true }
}
