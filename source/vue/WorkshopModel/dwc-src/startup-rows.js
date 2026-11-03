'use strict'

// Rows of the start-up card of the Model Explorer (vue/_shared/StartupPanel.vue). Pure function (no imports): tests/startup-plugins.test.js
// loads it in node. The labels are keys of plugins.WorkshopModel.startup.*; every row carries what / why / ifMissing / help
// (tests/startup-help.test.js).
//
// c = { connected: bool,                 DWC talks to the board
//       firmware: string | null,         model.boards[0].firmwareVersion
//       globalsOk: bool,                 rrf-version.js globalsSupport().ok
//       persistCount: number,            globals marked persistent (persist-macro.js)
//       configIncludes: bool | null,     config.g calls the persistence macro (null = config.g could not be read)
//       sbc: bool, extras: bool,         tier.js detectTier()
//       companion: { installed, running } } tier.js companionState(): the optional plugin of the Pi (WorkshopModelAgent)
// The companion row is an offer, never a requirement: it is always grey ('na', applies false), so the card never counts it as
// missing, pending or ready and the guide never walks it; its text says whether it is absent, stopped or running.
export const INCLUDE_LINE = 'M98 P"0:/sys/workshop-globals.g"'

export function rowsModel(c) {
	const o = c || {}
	const connected = !!o.connected
	const known = connected && !!o.firmware
	const out = [
		{ id: 'connection', state: connected ? 'configured' : 'missing', label: 'row_connection', what: 'row_connection_what', why: 'row_connection_for', ifMissing: 'row_connection_missing', help: 'row_connection_tip', missingText: 'miss_connection', texts: { configured: 'connection_ok', missing: 'connection_missing' } },
		{ id: 'firmware', applies: known, state: o.globalsOk ? 'configured' : 'missing', label: 'row_firmware', what: 'row_firmware_what', why: 'row_firmware_for', ifMissing: 'row_firmware_missing', help: 'row_firmware_tip', missingText: 'miss_firmware', params: { version: o.firmware || '-' }, texts: { configured: 'firmware_ok', missing: 'firmware_old', na: 'firmware_unknown' } }
	]
	if (o.persistCount > 0) {
		out.push({
			id: 'include', state: o.configIncludes === null || o.configIncludes === undefined ? 'example' : (o.configIncludes ? 'configured' : 'missing'),
			label: 'row_include', what: 'row_include_what', why: 'row_include_for', ifMissing: 'row_include_missing', help: 'row_include_tip', missingText: 'miss_include',
			params: { n: o.persistCount }, texts: { configured: 'include_ok', missing: 'include_missing', example: 'include_unknown' },
			manual: { steps: ['include_step1', 'include_step2', 'include_step3'], copy: INCLUDE_LINE, copyLabel: 'include_copy' }
		})
	}
	out.push({
		id: 'sbc', applies: !!o.sbc, state: o.extras ? 'configured' : 'example',
		label: 'row_sbc', what: 'row_sbc_what', why: 'row_sbc_for', ifMissing: 'row_sbc_missing', help: 'row_sbc_tip',
		texts: { configured: 'sbc_ok', example: 'sbc_limited', na: 'sbc_none' }
	})
	out.push(companionRow(o))
	return out
}

// 'absent' | 'stopped' | 'running' | 'no_sbc' (a standalone Duet cannot run it)
export function companionKind(c) {
	const o = c || {}
	const comp = o.companion || {}
	if (comp.running) return 'running'
	if (comp.installed) return 'stopped'
	return o.sbc ? 'absent' : 'no_sbc'
}

function companionRow(o) {
	return {
		id: 'companion', applies: false, state: 'na', optional: true,
		label: 'row_companion', what: 'row_companion_what', why: 'row_companion_for', ifMissing: 'row_companion_missing', help: 'row_companion_tip',
		texts: { na: 'companion_' + companionKind(o) }
	}
}
