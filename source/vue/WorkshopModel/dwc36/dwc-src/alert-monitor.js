'use strict'

// The alerts of the page as one value: the rules, the state of each, the recent events and the banner. The page calls monitorTick once per
// sample with the live model and gets the next value back (nothing is changed in place); the events that fired in that tick come out as
// `fresh` so the page can play the sound. The banner lists the rules that are firing now (a fire not yet recovered), each with a
// dismiss; a recovered rule leaves the banner by itself. Works only while the page is open. Pure: test/alert-rules.test.js.

import { getAtPath } from './model-path.js'
import { evaluate, ruleState, cleanRules, readAlerts, saveAlerts } from './alert-rules.js'

export const EVENTS_KEPT = 50

export function monitorState(alerts) {
	const a = alerts || { rules: [], sound: false }
	return { rules: cleanRules(a.rules), sound: a.sound === true, states: new Map(), events: [], banner: [], fresh: [] }
}

export function readMonitor(storage) {
	return monitorState(readAlerts(storage))
}

export function saveMonitor(storage, mon) {
	return saveAlerts(storage, { rules: mon.rules, sound: mon.sound })
}

// a change of the rules keeps the state of the rules that stay and drops the banner of the ones that went
export function setRules(mon, rules) {
	const clean = cleanRules(rules)
	const ids = new Set(clean.map(r => r.id))
	const states = new Map()
	mon.states.forEach((s, id) => { if (ids.has(id)) states.set(id, s) })
	return Object.assign({}, mon, { rules: clean, states, banner: mon.banner.filter(b => ids.has(b.id)), fresh: [] })
}

export function setSound(mon, on) {
	return Object.assign({}, mon, { sound: on === true, fresh: [] })
}

function bannerAfter(banner, events) {
	let out = banner.slice()
	for (const e of events) {
		out = out.filter(b => b.id !== e.id)
		if (e.type === 'fire') out.push({ id: e.id, path: e.path, op: e.op, limit: e.limit, value: e.value, t: e.t, dismissed: false })
	}
	return out
}

// one sample: every enabled rule reads its path in the model
export function monitorTick(mon, model, now) {
	if (!mon.rules.length) return mon.fresh.length ? Object.assign({}, mon, { fresh: [] }) : mon
	const states = new Map(mon.states)
	let events = []
	for (const rule of mon.rules) {
		const r = evaluate(rule, states.get(rule.id) || ruleState(), getAtPath(model, rule.path), now)
		states.set(rule.id, r.state)
		events = events.concat(r.events)
	}
	const kept = events.length ? events.slice().reverse().concat(mon.events).slice(0, EVENTS_KEPT) : mon.events
	return Object.assign({}, mon, { states, events: kept, banner: events.length ? bannerAfter(mon.banner, events) : mon.banner, fresh: events.filter(e => e.type === 'fire') })
}

export function dismiss(mon, id) {
	return Object.assign({}, mon, { banner: mon.banner.map(b => (b.id === id ? Object.assign({}, b, { dismissed: true }) : b)), fresh: [] })
}

export function clearEvents(mon) {
	return Object.assign({}, mon, { events: [], fresh: [] })
}

// the banner items the person has not dismissed
export function visibleBanner(mon) {
	return mon.banner.filter(b => !b.dismissed)
}

// is the rule firing now?
export function isActive(mon, id) {
	const s = mon.states.get(id)
	return !!(s && s.active)
}
