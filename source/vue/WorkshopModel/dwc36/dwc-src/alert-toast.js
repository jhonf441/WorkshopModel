'use strict'

// The pop-up message of the alerts (3.6 line): the switch that turns it on or off, kept in this browser next to the rules, and the events a
// sample produced. A fire shows the message when the switch is on (it is on until the person turns it off); the console of DWC is written
// whatever the switch says. Pure: test/alert-watch.test.js.

import { helpChoice } from './view-choices.js'

export const TOAST_KEY = 'workshopModelAlertToast'

export const TOAST_SETTING = helpChoice('alerts_set', 'toast')

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
