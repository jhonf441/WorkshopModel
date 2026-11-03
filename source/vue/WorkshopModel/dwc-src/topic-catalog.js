'use strict'

// The Topics view: one card per area of the object model, with readable labels, units and live values (topic-rows.js,
// topic-rows-io.js). Generic: a card exists only when its branch is in the model (no machine file is assumed), and every top-level
// key no topic covers (volumes, inputs, spindles, sbc, anything a future firmware adds) is listed in the "Other" card, so nothing of
// the model is hidden. Each card names the branch "See all" opens in the technical tree. Gate: the globals card needs RRF 3.4
// (globalsOk, rrf-version.js); in the plugins card only the process state of a plugin of the Pi waits for the SBC tier (tier.js). Pure: test/topic-catalog.test.js.

import { at, stateRows, heatRows, moveRows, jobRows, toolRows } from './topic-rows.js'
import { fanRows, sensorRows, boardRows, networkRows, pluginRows, globalRows } from './topic-rows-io.js'
import { childrenOf, childCount } from './model-tree.js'
import { isBranch } from './value-format.js'
import { isMap } from './model-path.js'
import { diagnose } from './diagnosis.js'

export const TOPIC_ROWS = 10

// id: the card (text key topic_<id>), root: the top-level key it reads and "See all" opens, gate: 'globals' | none
export const TOPICS = [
	{ id: 'state', root: 'state', icon: 'mdi-state-machine', rows: stateRows },
	{ id: 'heat', root: 'heat', icon: 'mdi-thermometer', rows: heatRows },
	{ id: 'move', root: 'move', icon: 'mdi-axis-arrow', rows: moveRows },
	{ id: 'job', root: 'job', icon: 'mdi-briefcase-outline', rows: jobRows },
	{ id: 'tools', root: 'tools', icon: 'mdi-tools', rows: toolRows },
	{ id: 'fans', root: 'fans', icon: 'mdi-fan', rows: fanRows },
	{ id: 'sensors', root: 'sensors', icon: 'mdi-gauge', rows: sensorRows },
	{ id: 'boards', root: 'boards', icon: 'mdi-chip', rows: boardRows },
	{ id: 'network', root: 'network', icon: 'mdi-lan', rows: networkRows },
	{ id: 'plugins', root: 'plugins', icon: 'mdi-puzzle-outline', rows: pluginRows },
	{ id: 'global', root: 'global', icon: 'mdi-variable', rows: globalRows, gate: 'globals' }
]
// the quick diagnosis card (diagnosis.js): it is not one of the cards above (it reads every branch, not one), the Topics view shows it first
export const DIAGNOSIS_TOPIC = { id: 'diagnosis', icon: 'mdi-stethoscope', title: 'topic_diagnosis' }
export function diagnosisTopic(model, ctx) {
	return Object.assign({ result: diagnose(model, ctx) }, DIAGNOSIS_TOPIC)
}
export const OTHER_TOPIC = { id: 'other', icon: 'mdi-dots-horizontal-circle-outline' }

// a branch that holds something: a value, an object, a non-empty array or Map
function present(v) {
	if (v === null || v === undefined) return false
	if (Array.isArray(v) || isMap(v)) return childCount(v) > 0
	return true
}

function gateOff(topic, ctx) {
	if (topic.gate === 'globals' && !ctx.globalsOk) return 'topic_global_off'
	return null
}

// one card: { id, icon, title, path, rows (at most max), more, off (a text key or null), empty }
function cardOf(topic, model, ctx, max) {
	const off = gateOff(topic, ctx)
	const all = off ? [] : topic.rows(model, ctx)
	return { id: topic.id, icon: topic.icon, title: 'topic_' + topic.id, path: topic.root, rows: all.slice(0, max), more: Math.max(0, all.length - max), off, empty: !off && !all.length }
}

function otherRow(c) {
	const branch = isBranch(c.value)
	return { id: 'other_' + c.key, label: { text: c.key }, path: c.key, value: branch ? childCount(c.value) : c.value, unit: branch ? 'entries' : 'value' }
}

// the top-level keys no topic reads, as rows (each opens its own branch)
export function otherKeys(model) {
	const known = new Set(TOPICS.map(t => t.root))
	return childrenOf(model).filter(c => !known.has(c.key) && c.value !== null && c.value !== undefined).map(otherRow)
}

// model + ctx { globalsOk, tier, maxRows } -> the cards in catalogue order, then "Other" when it has rows
export function topicsOf(model, ctx) {
	const c = Object.assign({ globalsOk: true, tier: null }, ctx || {})
	const max = c.maxRows || TOPIC_ROWS
	const cards = TOPICS.filter(t => present(at(model, t.root))).map(t => cardOf(t, model, c, max))
	const other = otherKeys(model)
	if (other.length) cards.push({ id: OTHER_TOPIC.id, icon: OTHER_TOPIC.icon, title: 'topic_other', path: '', rows: other.slice(0, max * 2), more: Math.max(0, other.length - max * 2), off: null, empty: false })
	return cards
}
