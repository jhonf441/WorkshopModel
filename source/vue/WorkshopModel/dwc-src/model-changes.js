'use strict'

// The tracker of the whole model, one step per tick of the page: it flattens the model (flat-list.js), compares the text of every
// leaf with the previous tick (change-diff.js), keeps the list of recent changes with before and after and the time each path last
// changed. Its state is one explicit object the page owns and hands to the views (VIEW-CONTRACT.md). Pure: test/model-changes.test.js.

import { flattenModel } from './flat-list.js'
import { diffTexts, recordChanges } from './change-diff.js'

export const MODEL_CHANGES_CAP = 300

// { prev: Map path -> text of the last tick (null before the first), leaves, truncated, times: Map path -> ms, changes: newest first }
export function trackerState() {
	return { prev: null, leaves: [], truncated: false, times: new Map(), changes: [] }
}

// one tick -> the next state (a new object; the times Map is carried over and updated)
export function trackTick(state, root, now, limit) {
	const s = state || trackerState()
	const flat = flattenModel(root, limit)
	const next = new Map()
	for (const l of flat.leaves) next.set(l.path, l.text)
	const found = diffTexts(s.prev, next)
	const times = s.times || new Map()
	for (const c of found) times.set(c.path, now)
	return { prev: next, leaves: flat.leaves, truncated: flat.truncated, times, changes: recordChanges(s.changes, found, now, MODEL_CHANGES_CAP) }
}

// forget the recorded changes (the button of a view); the leaves and the last texts stay
export function clearChanges(state) {
	const s = state || trackerState()
	return Object.assign({}, s, { times: new Map(), changes: [] })
}
