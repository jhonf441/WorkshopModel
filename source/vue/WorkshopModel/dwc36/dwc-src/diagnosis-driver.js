'use strict'

// Quick diagnosis: the stepper drivers. RepRapFirmware 3.5 reports each driver of a board in boards[n].drivers[m] with its flags
// (directly or inside a `status` object). The flag names are read tolerantly (by the words they contain) and only a boolean true
// counts, so a firmware that names a flag a little differently still shows up, and a numeric bit field that is not decoded is
// ignored. kind: 'shutdown' | 'short' | 'error' | 'overtemp' | 'open' | 'stall'. Pure: test/diagnosis.test.js.

import { entries } from './topic-rows.js'
import { boards, finding } from './diagnosis-helpers.js'

// name of a flag -> its kind, or null when it means nothing for the diagnosis (the order decides: shutdown before the warning)
export function driverFlagKind(name) {
	const n = String(name || '').toLowerCase()
	if (n.indexOf('stall') >= 0) return 'stall'
	if (n.indexOf('short') >= 0) return 'short'
	if (n.indexOf('open') >= 0) return 'open'
	if (n.indexOf('shutdown') >= 0 || n === 'ot') return 'shutdown'
	if (n.indexOf('overtemp') >= 0 || n.indexOf('otpw') >= 0 || n.indexOf('temperaturewarning') >= 0) return 'overtemp'
	if (n === 'error' || n === 'drivererror') return 'error'
	return null
}

function flagsOf(driver) {
	const out = []
	const scan = obj => {
		if (!obj || typeof obj !== 'object') return
		for (const k of Object.keys(obj)) if (obj[k] === true) out.push(k)
	}
	scan(driver)
	scan(driver && driver.status)
	return out
}

// every flag that is raised on every driver of every board: [{ kind, path, params: { board, driver, flag } }]
export function driverFlags(model) {
	const out = []
	for (const b of boards(model)) {
		for (const d of entries(b.board, 'drivers')) {
			for (const flag of flagsOf(d.value)) {
				const kind = driverFlagKind(flag)
				if (kind) out.push({ kind, path: 'boards[' + b.index + '].drivers[' + d.key + ']', params: { board: b.name, driver: Number(d.key), flag } })
			}
		}
	}
	return out
}

// the findings of one kind
export function driverFindings(model, kind) {
	return driverFlags(model).filter(f => f.kind === kind).map(f => finding(f.path, f.params))
}
