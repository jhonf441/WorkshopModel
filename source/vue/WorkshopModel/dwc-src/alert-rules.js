'use strict'

// In-page alerts: the rule of one watched path and the evaluator that says, for each sample, whether the rule fires or recovers. It only
// runs while the page is open (nothing on the Pi, no notice to a phone). A rule is a limit on a path of the object model:
//   above   fires when the value is over the limit, recovers when it is back at or under limit - hysteresis
//   below   fires when the value is under the limit, recovers when it is back at or over limit + hysteresis
//   equals  fires while the value is the text, recovers when it is anything else
//   changes_to  fires once each time the value changes to the text (an event, nothing to recover)
// Hysteresis keeps a value that wobbles around the limit from firing again and again; the cooldown is the shortest time between two
// fires of the same rule (a limit still crossed when the cooldown ends fires then). The state of a rule is { active, lastFire, last }.
// Pure: test/alert-rules.test.js.

import { helpChoice } from './view-choices.js'

export const RULES_MAX = 20
export const COOLDOWN_DEFAULT_S = 60
export const COOLDOWN_MAX_S = 86400
export const OPS = ['above', 'below', 'equals', 'changes_to']
export const NUMERIC_OPS = ['above', 'below']

export const ALERT_SETTINGS = {
	path: helpChoice('alerts_set', 'path'),
	op: helpChoice('alerts_set', 'op'),
	value: helpChoice('alerts_set', 'value'),
	hysteresis: helpChoice('alerts_set', 'hysteresis'),
	cooldown: helpChoice('alerts_set', 'cooldown'),
	sound: helpChoice('alerts_set', 'sound')
}

const finite = n => typeof n === 'number' && Number.isFinite(n)

export function isNumericOp(op) {
	return NUMERIC_OPS.indexOf(op) >= 0
}

// the text of a model value as a rule compares it: true, 12, idle
export function valueText(v) {
	if (v === null || v === undefined) return ''
	return typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v))
}

// What is wrong with a rule that is being written (MO-4, A9): 'path' | 'op' | 'number' (a limit that is not a number) | 'text' (no value to compare) | null.
// The same conditions as cleanRule, so a draft with no problem is exactly one that cleanRule accepts: the form tells WHICH field is missing instead of one
// sentence for four causes, and the Add button stays off until there is nothing to say.
export function ruleProblem(o) {
	if (!o || typeof o !== 'object') return 'path'
	const path = typeof o.path === 'string' ? o.path.trim() : ''
	if (!path) return 'path'
	if (OPS.indexOf(o.op) < 0) return 'op'
	if (isNumericOp(o.op)) return o.value === '' || o.value === null || o.value === undefined || !finite(Number(o.value)) ? 'number' : null
	return valueText(o.value).trim() === '' ? 'text' : null
}

// a rule as the page stores it -> a clean rule, or null when it cannot work
export function cleanRule(o) {
	if (!o || typeof o !== 'object') return null
	const path = typeof o.path === 'string' ? o.path.trim() : ''
	if (!path || OPS.indexOf(o.op) < 0) return null
	const numeric = isNumericOp(o.op)
	const limit = numeric ? Number(o.value) : valueText(o.value)
	if (numeric && (o.value === '' || o.value === null || o.value === undefined || !finite(limit))) return null
	if (!numeric && limit.trim() === '') return null // a text of only spaces compares with nothing
	const hyst = numeric ? Math.max(0, Number(o.hysteresis) || 0) : 0
	const cool = Math.min(COOLDOWN_MAX_S, Math.max(0, Number.isFinite(Number(o.cooldown)) && o.cooldown !== '' && o.cooldown !== null && o.cooldown !== undefined ? Number(o.cooldown) : COOLDOWN_DEFAULT_S))
	return { id: typeof o.id === 'string' && o.id ? o.id : 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), path, op: o.op, value: limit, hysteresis: hyst, cooldown: Math.round(cool), enabled: o.enabled !== false }
}

export function cleanRules(list) {
	const seen = new Set()
	const out = []
	for (const o of Array.isArray(list) ? list : []) {
		const r = cleanRule(o)
		if (r && !seen.has(r.id) && out.length < RULES_MAX) {
			seen.add(r.id)
			out.push(r)
		}
	}
	return out
}

export function ruleState() {
	return { active: false, lastFire: null, last: null }
}

// is the condition of the rule true for this value? null when the value cannot be judged (a missing path, a text for a number rule)
export function holds(rule, value) {
	if (rule.op === 'equals') return value === undefined || value === null ? null : valueText(value) === rule.value
	if (!finite(value)) return null
	return rule.op === 'above' ? value > rule.value : value < rule.value
}

// has a numeric value gone back far enough (past the hysteresis) for the rule to recover?
function recovered(rule, value) {
	if (rule.op === 'above') return value <= rule.value - rule.hysteresis
	return value >= rule.value + rule.hysteresis
}

const event = (rule, type, value, now) => ({ t: now, id: rule.id, path: rule.path, op: rule.op, limit: rule.value, type, value: valueText(value) })
const cooledDown = (rule, state, now) => state.lastFire === null || now - state.lastFire >= rule.cooldown * 1000

// one sample of a state rule (above, below, equals)
function stepState(rule, state, value, now) {
	const on = holds(rule, value)
	if (on === null) return { state, events: [] }
	if (!state.active) {
		if (!on || !cooledDown(rule, state, now)) return { state, events: [] }
		return { state: { active: true, lastFire: now, last: null }, events: [event(rule, 'fire', value, now)] }
	}
	const back = rule.op === 'equals' ? !on : (!on && recovered(rule, value))
	if (!back) return { state, events: [] }
	return { state: { active: false, lastFire: state.lastFire, last: null }, events: [event(rule, 'recover', value, now)] }
}

// one sample of an event rule (changes_to): fires when the value becomes the text
function stepChange(rule, state, value, now) {
	if (value === undefined || value === null) return { state, events: [] }
	const text = valueText(value)
	const next = { active: false, lastFire: state.lastFire, last: text }
	if (state.last === null || state.last === text || text !== rule.value || !cooledDown(rule, state, now)) return { state: next, events: [] }
	next.lastFire = now
	return { state: next, events: [event(rule, 'fire', value, now)] }
}

// -> { state: the new state (a new object), events: [{ t, id, path, op, limit, type: 'fire' | 'recover', value }] }
export function evaluate(rule, state, value, now) {
	if (!rule.enabled) return { state: ruleState(), events: [] }
	return rule.op === 'changes_to' ? stepChange(rule, state || ruleState(), value, now) : stepState(rule, state || ruleState(), value, now)
}

// the rules in this browser
export const ALERTS_KEY = 'workshopModelAlerts'

// -> { rules, sound }; sound is off until the person turns it on
export function readAlerts(storage) {
	try {
		const o = JSON.parse((storage && storage.getItem(ALERTS_KEY)) || 'null')
		return { rules: cleanRules(o && o.rules), sound: !!(o && o.sound === true) }
	} catch (e) {
		return { rules: [], sound: false }
	}
}

export function saveAlerts(storage, alerts) {
	try {
		storage.setItem(ALERTS_KEY, JSON.stringify({ rules: cleanRules(alerts.rules), sound: alerts.sound === true }))
		return true
	} catch (e) {
		return false
	}
}
