'use strict'

// Quick diagnosis: the rule list. A rule is { id, level, needs, find }:
//   id     the text key is diag_<id> (what is wrong, with the params of the finding) and diag_<id>_help (what it means and what to check)
//   level  'err' (the machine cannot work right) or 'warn' (look at it); a finding may carry its own level
//   needs  the model paths the rule reads: the rule counts as "checked" only when at least one of them is in the model
//   find   (model, ctx) -> [{ path, params, level? }], one per thing that is wrong; never throws on a missing branch
// The thresholds are exported so the tests and the help texts name them. Pure: test/diagnosis.test.js.

import { at, entries } from './topic-rows.js'
import { isBranch } from './value-format.js'
import { isNum, boards, finding } from './diagnosis-helpers.js'
import { driverFindings } from './diagnosis-driver.js'

export const VIN_LOW = 11.5
export const VIN_HIGH = 26
export const V12_LOW = 11
export const V12_HIGH = 13
export const MCU_WARN = 70
export const MCU_ERR = 85
export const FILAMENT_ERRORS = { noDataReceived: 'warn', noFilament: 'warn', tooLittleMovement: 'err', tooMuchMovement: 'err', sensorError: 'err' }
export const OFFLINE_IFACE = ['disabled', 'establishingLink']

// the readings of one voltage of every board that reports it, on the side of the limit
function voltage(model, field, test) {
	const out = []
	for (const b of boards(model)) {
		const v = b.board[field] && b.board[field].current
		if (isNum(v) && test(v)) out.push(finding('boards[' + b.index + '].' + field, { board: b.name, v: Math.round(v * 10) / 10 }))
	}
	return out
}

function mcuTemps(model, limit) {
	const out = []
	for (const b of boards(model)) {
		const v = b.board.mcuTemp && b.board.mcuTemp.current
		if (isNum(v) && v >= limit) out.push(finding('boards[' + b.index + '].mcuTemp', { board: b.name, v: Math.round(v * 10) / 10 }))
	}
	return out
}

function heaterIs(model, state) {
	return entries(model, 'heat.heaters').filter(c => c.value.state === state).map(c => finding('heat.heaters[' + c.key + ']', { n: Number(c.key) }))
}

function heatersOverMax(model) {
	const rows = entries(model, 'heat.heaters').filter(c => isNum(c.value.current) && isNum(c.value.max) && c.value.current > c.value.max)
	return rows.map(c => finding('heat.heaters[' + c.key + ']', { n: Number(c.key), v: Math.round(c.value.current), max: c.value.max }))
}

function sensorFaults(model) {
	const rows = entries(model, 'sensors.analog').filter(c => typeof c.value.state === 'string' && c.value.state !== 'ok')
	return rows.map(c => finding('sensors.analog[' + c.key + ']', { n: Number(c.key), name: c.value.name || '', state: c.value.state }))
}

function filamentFaults(model, level) {
	const rows = entries(model, 'sensors.filamentMonitors').filter(c => FILAMENT_ERRORS[c.value.status] === level)
	return rows.map(c => finding('sensors.filamentMonitors[' + c.key + ']', { n: Number(c.key), status: c.value.status }))
}

function unmountedVolumes(model) {
	const rows = entries(model, 'volumes').filter(c => c.value.mounted === false)
	return rows.map(c => finding('volumes[' + c.key + ']', { n: Number(c.key) }, Number(c.key) === 0 ? 'err' : 'warn'))
}

function interfacesDown(model) {
	const rows = entries(model, 'network.interfaces').filter(c => OFFLINE_IFACE.indexOf(c.value.state) >= 0)
	return rows.map(c => finding('network.interfaces[' + c.key + ']', { n: Number(c.key), type: String(c.value.type || '-'), state: c.value.state }))
}

function statusIs(model, word) {
	return at(model, 'state.status') === word ? [finding('state.status', { status: word })] : []
}

function startupError(model) {
	const e = at(model, 'state.startupError')
	if (!e || !isBranch(e)) return []
	return [finding('state.startupError', { file: String(e.file || ''), line: isNum(e.line) ? e.line : 0, message: String(e.message || '') })]
}

// the messages of the model that are errors (type 'error', or the number 2 of the DSF enum), counted in one finding
export function errorMessages(model) {
	const list = entries(model, 'messages').filter(c => c.value && (c.value.type === 'error' || c.value.type === 2))
	if (!list.length) return []
	const last = list[list.length - 1].value
	return [finding('messages', { n: list.length, last: String(last.content || '').trim().slice(0, 100) })]
}

function stoppedPlugins(model, ctx) {
	if (!(ctx && ctx.tier && ctx.tier.extras)) return []
	return entries(model, 'plugins').filter(c => c.value && c.value.sbcExecutable && !(c.value.pid > 0)).map(c => finding('plugins.' + c.key, { name: String(c.value.name || c.key) }))
}

const rule = (id, level, needs, find) => ({ id, level, needs, find })
const driver = kind => model => driverFindings(model, kind)

export const RULES = [
	rule('status_halted', 'err', ['state.status'], m => statusIs(m, 'halted')),
	rule('startup_error', 'err', ['state'], startupError),
	rule('status_off', 'warn', ['state.status'], m => statusIs(m, 'off')),
	rule('driver_shutdown', 'err', ['boards'], driver('shutdown')),
	rule('driver_short', 'err', ['boards'], driver('short')),
	rule('driver_error', 'err', ['boards'], driver('error')),
	rule('driver_overtemp', 'warn', ['boards'], driver('overtemp')),
	rule('driver_open_load', 'warn', ['boards'], driver('open')),
	rule('driver_stall', 'warn', ['boards'], driver('stall')),
	rule('vin_low', 'warn', ['boards'], m => voltage(m, 'vIn', v => v < VIN_LOW)),
	rule('vin_high', 'warn', ['boards'], m => voltage(m, 'vIn', v => v > VIN_HIGH)),
	rule('v12_low', 'warn', ['boards'], m => voltage(m, 'v12', v => v < V12_LOW)),
	rule('v12_high', 'warn', ['boards'], m => voltage(m, 'v12', v => v > V12_HIGH)),
	rule('mcu_critical', 'err', ['boards'], m => mcuTemps(m, MCU_ERR)),
	rule('mcu_hot', 'warn', ['boards'], m => mcuTemps(m, MCU_WARN).filter(f => f.params.v < MCU_ERR)),
	rule('heater_fault', 'err', ['heat.heaters'], m => heaterIs(m, 'fault')),
	rule('heater_offline', 'warn', ['heat.heaters'], m => heaterIs(m, 'offline')),
	rule('heater_over_max', 'warn', ['heat.heaters'], heatersOverMax),
	rule('sensor_fault', 'err', ['sensors.analog'], sensorFaults),
	rule('filament_error', 'err', ['sensors.filamentMonitors'], m => filamentFaults(m, 'err')),
	rule('filament_warning', 'warn', ['sensors.filamentMonitors'], m => filamentFaults(m, 'warn')),
	rule('volume_unmounted', 'warn', ['volumes'], unmountedVolumes),
	rule('network_down', 'warn', ['network.interfaces'], interfacesDown),
	rule('messages_error', 'warn', ['messages'], errorMessages),
	rule('plugin_stopped', 'warn', ['plugins'], stoppedPlugins)
]
