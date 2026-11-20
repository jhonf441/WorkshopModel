'use strict'

// The pop-up message of the alerts (3.6 line): the switch that turns it on or off, kept in this browser next to the rules, and the events a
// sample produced. A fire shows the message when the switch is on (it is on until the person turns it off); the console of DWC is written
// whatever the switch says. Pure: test/alert-watch.test.js.

import { helpChoice } from './view-choices.js'

export const TOAST_KEY = 'workshopModelAlertToast'

export const TOAST_SETTING = helpChoice('alerts_set', 'toast')
export const TOAST_STICKY_SETTING = helpChoice('alerts_set', 'toast_sticky')
export const TOAST_MAX_SETTING = helpChoice('alerts_set', 'toast_max')
export const TOAST_STYLE_SETTING = helpChoice('alerts_set', 'toast_style')
export const TOAST_POSITION_SETTING = helpChoice('alerts_set', 'toast_position')

// How the message behaves: it waits for the person to close it (so an alert never passes unseen) and at most `max` wait at once (the rest are
// folded into one "more alerts" message). Kept in this browser with the switch.
export const TOAST_OPTIONS_KEY = 'workshopModelAlertToastOptions'
export const TOAST_MAX_MIN = 1
export const TOAST_MAX_MAX = 10
export const TOAST_STYLES = ['own', 'dwc']
export const TOAST_POSITIONS = ['left', 'center', 'right']
export const TOAST_DEFAULTS = { sticky: true, max: 3, style: 'own', position: 'left' }

export function cleanToastOptions(o) {
	const raw = o ? o.max : undefined
	const n = raw === null || raw === undefined || raw === '' ? NaN : Math.round(Number(raw))
	return {
		sticky: !(o && o.sticky === false),
		max: Number.isFinite(n) ? Math.min(TOAST_MAX_MAX, Math.max(TOAST_MAX_MIN, n)) : TOAST_DEFAULTS.max,
		style: o && TOAST_STYLES.indexOf(o.style) >= 0 ? o.style : TOAST_DEFAULTS.style,
		position: o && TOAST_POSITIONS.indexOf(o.position) >= 0 ? o.position : TOAST_DEFAULTS.position
	}
}

export function readToastOptions(storage) {
	try {
		return cleanToastOptions(JSON.parse((storage && storage.getItem(TOAST_OPTIONS_KEY)) || 'null'))
	} catch (e) {
		return Object.assign({}, TOAST_DEFAULTS)
	}
}

export function saveToastOptions(storage, o) {
	try {
		storage.setItem(TOAST_OPTIONS_KEY, JSON.stringify(cleanToastOptions(o)))
		return true
	} catch (e) {
		return false
	}
}

// -> true unless the person turned it off
export function readToast(storage) {
	try {
		return !(storage && storage.getItem(TOAST_KEY) === 'off')
	} catch (e) {
		return true
	}
}

export function saveToast(storage, on) {
	try {
		storage.setItem(TOAST_KEY, on === false ? 'off' : 'on')
		return true
	} catch (e) {
		return false
	}
}

// The events a monitorTick added, oldest first. monitorTick puts the events of a sample in front of the old ones (newest first) and keeps the
// event objects themselves, so what came before is found by the first event of the previous value.
export function newEvents(before, after) {
	if (after.events === before.events) return []
	const head = before.events[0]
	const fresh = []
	for (const e of after.events) {
		if (e === head) break
		fresh.push(e)
	}
	return fresh.reverse()
}

// DWC prints the title and the message as HTML, and the path and the value come from a rule typed by hand or from the machine
export function escapeHtml(text) {
	return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
