'use strict'

// An array of the model as a small table for the detail panel: a list of plain values gives one column (index, value); a list of
// objects gives one column per key (the union of the keys of the first rows, at most `maxCols`), so move.axes or heat.heaters read
// like a spreadsheet. Pure: test/value-table.test.js.

import { childrenOf } from './model-tree.js'
import { formatValue, isBranch } from './value-format.js'

export const TABLE_ROWS = 50
export const TABLE_COLS = 6

function columnsOf(items, maxCols) {
	const cols = []
	for (const it of items) {
		for (const c of childrenOf(it.value)) {
			if (cols.indexOf(c.key) < 0 && cols.length < maxCols) cols.push(c.key)
		}
	}
	return cols
}

function cellOf(item, key) {
	const c = childrenOf(item.value).find(x => x.key === key)
	return c ? formatValue(c.value) : ''
}

// -> null (not an array) or { kind: 'values' | 'records', columns: [keys], rows: [{ index, path, cells: [text] }], more, moreCols }
export function arrayTable(value, path, maxRows, maxCols) {
	if (!Array.isArray(value)) return null
	const rowsMax = maxRows || TABLE_ROWS
	const colsMax = maxCols || TABLE_COLS
	const items = childrenOf(value).slice(0, rowsMax)
	const records = items.some(it => isBranch(it.value) && !Array.isArray(it.value))
	const base = String(path || '')
	const rowPath = it => base + '[' + it.key + ']'
	if (!records) {
		return { kind: 'values', columns: [], rows: items.map(it => ({ index: it.key, path: rowPath(it), cells: [formatValue(it.value)] })), more: Math.max(0, value.length - rowsMax), moreCols: 0 }
	}
	const columns = columnsOf(items, colsMax)
	const all = columnsOf(items, Infinity)
	return {
		kind: 'records', columns,
		rows: items.map(it => ({ index: it.key, path: rowPath(it), cells: it.value && typeof it.value === 'object' ? columns.map(k => cellOf(it, k)) : columns.map((k, i) => (i === 0 ? formatValue(it.value) : '')) })),
		more: Math.max(0, value.length - rowsMax), moreCols: Math.max(0, all.length - columns.length)
	}
}
