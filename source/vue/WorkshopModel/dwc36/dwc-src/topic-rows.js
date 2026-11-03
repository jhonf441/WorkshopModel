'use strict'

// The readable rows of the Topics view, part 1: the helpers every topic uses and the topics of the machine itself (state, heat, move,
// job, tools). A row is { id, label, path, value, unit, aside?, state? }:
//   label  { key, params } (a text key of plugins.WorkshopModel.model.*) or { text } (a name the machine reports, shown as it is)
//   path   what "open" shows in the technical tree; value + unit go through value-human.js unitText
//   aside  { key, value, unit }: a second value in a short sentence ("target {v}")
//   state  { key | text, level }: a word with its dot (level ok | info | warn | err | '' for none, DESIGN.md: a dot + the word)
// Everything is read from what the model has: a missing branch gives no row, never an error. Pure: test/topic-catalog.test.js.

import { getAtPath } from './model-path.js'
import { childrenOf } from './model-tree.js'

export const at = getAtPath

// the entries of an array or a Map at a path, without the empty slots (RRF leaves null where a heater or a fan is not configured)
export function entries(model, path) {
	return childrenOf(at(model, path)).filter(c => c.value !== null && c.value !== undefined)
}

export function row(id, label, path, value, unit, extra) {
	return Object.assign({ id, label, path, value: value === undefined ? null : value, unit }, extra || {})
}

// a label with the name the machine reports when it has one ("Hotend (heater 1)"), else the generic one ("Heater 1")
export function named(name, key, params) {
	const n = typeof name === 'string' ? name.trim() : ''
	return n ? { key: key + '_named', params: Object.assign({ name: n }, params) } : { key, params: params || {} }
}

export function stateOf(levels, word) {
	if (typeof word !== 'string' || !word) return null
	return { text: word, level: Object.prototype.hasOwnProperty.call(levels, word) ? levels[word] : 'info' }
}

const has = v => v !== null && v !== undefined

export const STATUS_LEVELS = { idle: 'ok', busy: 'info', processing: 'info', simulating: 'info', changingTool: 'info', starting: 'info', paused: 'warn', pausing: 'warn', resuming: 'warn', cancelling: 'warn', updating: 'warn', off: 'warn', halted: 'err', disconnected: 'err' }
export const HEATER_LEVELS = { active: 'ok', standby: 'info', tuning: 'warn', offline: 'warn', fault: 'err', off: '' }
export const TOOL_LEVELS = { active: 'ok', standby: 'info', off: '' }

export function stateRows(m) {
	const s = at(m, 'state') || {}
	const out = []
	if (has(s.status)) out.push(row('status', { key: 'tl_status' }, 'state.status', s.status, 'state', { state: stateOf(STATUS_LEVELS, s.status) }))
	if (has(s.machineMode)) out.push(row('mode', { key: 'tl_machine_mode' }, 'state.machineMode', s.machineMode, 'text'))
	if (typeof s.currentTool === 'number') out.push(row('tool', { key: 'tl_current_tool' }, 'state.currentTool', s.currentTool < 0 ? null : 'T' + s.currentTool, 'text'))
	if (typeof s.upTime === 'number') out.push(row('uptime', { key: 'tl_uptime' }, 'state.upTime', s.upTime, 'seconds'))
	if (typeof s.atxPower === 'boolean') out.push(row('atx', { key: 'tl_atx_power' }, 'state.atxPower', s.atxPower, 'bool'))
	return out
}

function heaterLabel(m, h, n) {
	const sensor = typeof h.sensor === 'number' && h.sensor >= 0 ? at(m, 'sensors.analog[' + h.sensor + ']') : null
	const bed = Array.from(at(m, 'heat.bedHeaters') || [])
	const chamber = Array.from(at(m, 'heat.chamberHeaters') || [])
	const key = bed.indexOf(n) >= 0 ? 'tl_bed' : (chamber.indexOf(n) >= 0 ? 'tl_chamber' : 'tl_heater')
	return named(sensor && sensor.name, key, { n })
}

export function heatRows(m) {
	return entries(m, 'heat.heaters').map(c => {
		const h = c.value
		const n = Number(c.key)
		const aside = h.state && h.state !== 'off' && typeof h.active === 'number' ? { key: 'tn_target', value: h.active, unit: 'celsius' } : null
		return row('heater' + n, heaterLabel(m, h, n), 'heat.heaters[' + n + ']', h.current, 'celsius', { aside, state: stateOf(HEATER_LEVELS, h.state) })
	})
}

export function moveRows(m) {
	const out = entries(m, 'move.axes').filter(c => c.value.visible !== false).map(c => {
		const a = c.value
		const homed = a.homed ? { key: 'state_homed', level: 'ok' } : { key: 'state_not_homed', level: 'warn' }
		return row('axis' + c.key, { key: 'tl_axis', params: { letter: a.letter || c.key } }, 'move.axes[' + c.key + ']', a.userPosition, 'mm', { aside: { key: 'tn_machine', value: a.machinePosition, unit: 'mm' }, state: homed })
	})
	const speed = at(m, 'move.speedFactor')
	if (typeof speed === 'number') out.push(row('speedFactor', { key: 'tl_speed_factor' }, 'move.speedFactor', speed, 'percent'))
	const requested = at(m, 'move.currentMove.requestedSpeed')
	if (typeof requested === 'number') out.push(row('speed', { key: 'tl_speed' }, 'move.currentMove.requestedSpeed', requested, 'mm_s'))
	const comp = at(m, 'move.compensation.type')
	if (has(comp)) out.push(row('compensation', { key: 'tl_compensation' }, 'move.compensation.type', comp, 'text'))
	return out
}

function progressRow(m) {
	const size = at(m, 'job.file.size')
	const pos = at(m, 'job.filePosition')
	if (typeof size !== 'number' || size <= 0 || typeof pos !== 'number') return null
	return row('progress', { key: 'tl_progress' }, 'job.filePosition', Math.min(1, pos / size), 'percent')
}

export function jobRows(m) {
	const out = []
	const file = at(m, 'job.file.fileName')
	if (has(file)) out.push(row('file', { key: 'tl_job_file' }, 'job.file.fileName', file, 'text'))
	const progress = has(file) ? progressRow(m) : null
	if (progress) out.push(progress)
	const duration = at(m, 'job.duration')
	if (typeof duration === 'number') out.push(row('duration', { key: 'tl_job_duration' }, 'job.duration', duration, 'seconds'))
	const left = ['file', 'slicer', 'filament'].map(k => ({ k, v: at(m, 'job.timesLeft.' + k) })).find(x => typeof x.v === 'number')
	if (left) out.push(row('left', { key: 'tl_job_left' }, 'job.timesLeft.' + left.k, left.v, 'seconds'))
	const layer = at(m, 'job.layer')
	if (typeof layer === 'number') out.push(row('layer', { key: 'tl_job_layer' }, 'job.layer', layer, 'text', { aside: { key: 'tn_of', value: at(m, 'job.file.numLayers'), unit: 'text' } }))
	const last = at(m, 'job.lastFileName')
	if (!has(file) && has(last)) out.push(row('last', { key: 'tl_job_last' }, 'job.lastFileName', last, 'text'))
	return out
}

export function toolRows(m) {
	return entries(m, 'tools').map(c => {
		const tool = c.value
		const n = typeof tool.number === 'number' ? tool.number : Number(c.key)
		const target = tool.active && typeof tool.active[0] === 'number' && tool.heaters && tool.heaters.length ? { key: 'tn_target', value: tool.active[0], unit: 'celsius' } : null
		return row('tool' + n, named(tool.name, 'tl_tool', { n }), 'tools[' + c.key + ']', tool.state, 'state', { aside: target, state: stateOf(TOOL_LEVELS, tool.state) })
	})
}
