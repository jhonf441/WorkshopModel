'use strict'

// Small readers the quick diagnosis rules share (diagnosis-rules.js, diagnosis-driver.js): numbers, board names, the entries of a
// branch. Pure: test/diagnosis.test.js.

import { entries } from './topic-rows.js'

export const isNum = v => typeof v === 'number' && Number.isFinite(v)

// a board as the person knows it: its name, else its position
export function boardName(board, index) {
	const n = board && typeof board.name === 'string' ? board.name.trim() : ''
	return n || '#' + index
}

// [{ index, board, name }] of the boards that report something
export function boards(model) {
	return entries(model, 'boards').map(c => ({ index: Number(c.key), board: c.value, name: boardName(c.value, c.key) }))
}

// one finding { path, params, level? }
export function finding(path, params, level) {
	return level ? { path, params: params || {}, level } : { path, params: params || {} }
}
