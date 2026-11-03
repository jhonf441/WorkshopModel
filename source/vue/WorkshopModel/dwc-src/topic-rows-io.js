'use strict'

// The readable rows of the Topics view, part 2: what is around the machine (fans, sensors, boards and drivers, network, plugins,
// globals). Same row shape as topic-rows.js. A plugin has a process on the Pi only when its manifest names an sbcExecutable: one
// that lives in the browser (most of them) is "browser only", never "stopped"; the process state of the others is shown with the SBC tier.
// Pure: test/topic-catalog.test.js.

import { at, entries, row, named, stateOf } from './topic-rows.js'
import { childCount, childrenOf } from './model-tree.js'
import { isBranch } from './value-format.js'

export const IFACE_LEVELS = { active: 'ok', disabled: '' }
export const FILAMENT_LEVELS = { ok: 'ok', noFilament: 'warn', noDataReceived: 'warn', tooLittleMovement: 'warn', tooMuchMovement: 'warn', sensorError: 'err', noMonitor: '' }

export function fanRows(m) {
	return entries(m, 'fans').map(c => {
		const f = c.value
		const aside = typeof f.rpm === 'number' && f.rpm >= 0 ? { key: 'tn_rpm', value: f.rpm, unit: 'rpm' } : (typeof f.requestedValue === 'number' ? { key: 'tn_requested', value: f.requestedValue, unit: 'percent' } : null)
		return row('fan' + c.key, named(f.name, 'tl_fan', { n: Number(c.key) }), 'fans[' + c.key + ']', f.actualValue, 'percent', { aside })
	})
}

function axisLetter(m, n) {
	const a = at(m, 'move.axes[' + n + ']')
	return a && a.letter ? a.letter : String(n)
}

function analogRows(m) {
	return entries(m, 'sensors.analog').map(c => {
		const s = c.value
		const unit = /humid/i.test(String(s.type || '')) ? 'percent100' : 'celsius'
		const state = s.state && s.state !== 'ok' ? { text: String(s.state), level: 'warn' } : null
		return row('analog' + c.key, named(s.name, 'tl_sensor', { n: Number(c.key) }), 'sensors.analog[' + c.key + ']', s.lastReading, unit, { state })
	})
}

function inputRows(m) {
	const ends = entries(m, 'sensors.endstops').map(c => row('endstop' + c.key, { key: 'tl_endstop', params: { axis: axisLetter(m, c.key) } }, 'sensors.endstops[' + c.key + ']', !!c.value.triggered, 'triggered'))
	const probes = entries(m, 'sensors.probes').map(c => {
		const v = c.value.value
		return row('probe' + c.key, { key: 'tl_probe', params: { n: Number(c.key) } }, 'sensors.probes[' + c.key + ']', Array.isArray(v) || (v && typeof v.length === 'number') ? v[0] : v, 'text')
	})
	const monitors = entries(m, 'sensors.filamentMonitors').map(c => row('filament' + c.key, { key: 'tl_filament', params: { n: Number(c.key) } }, 'sensors.filamentMonitors[' + c.key + ']', c.value.status, 'state', { state: stateOf(FILAMENT_LEVELS, c.value.status) }))
	const gpIn = entries(m, 'sensors.gpIn').map(c => row('gpin' + c.key, { key: 'tl_gpin', params: { n: Number(c.key) } }, 'sensors.gpIn[' + c.key + ']', c.value.value, 'text'))
	return ends.concat(probes, monitors, gpIn)
}

export function sensorRows(m) {
	return analogRows(m).concat(inputRows(m))
}

export function boardRows(m) {
	const out = []
	for (const c of entries(m, 'boards')) {
		const b = c.value
		const n = Number(c.key)
		const vin = b.vIn && typeof b.vIn.current === 'number' ? { key: 'tn_vin', value: b.vIn.current, unit: 'volt' } : null
		out.push(row('board' + n, named(b.name || b.shortName, 'tl_board', { n }), 'boards[' + n + ']', b.firmwareVersion, 'text', { aside: vin }))
		if (b.mcuTemp && typeof b.mcuTemp.current === 'number') out.push(row('mcu' + n, { key: 'tl_board_mcu', params: { n } }, 'boards[' + n + '].mcuTemp', b.mcuTemp.current, 'celsius'))
		const drivers = childCount(b.drivers)
		if (drivers > 0) out.push(row('drivers' + n, { key: 'tl_board_drivers', params: { n } }, 'boards[' + n + '].drivers', drivers, 'entries'))
	}
	return out
}

export function networkRows(m) {
	const out = []
	const host = at(m, 'network.hostname')
	if (host) out.push(row('hostname', { key: 'tl_hostname' }, 'network.hostname', host, 'text'))
	const name = at(m, 'network.name')
	if (name) out.push(row('name', { key: 'tl_machine_name' }, 'network.name', name, 'text'))
	for (const c of entries(m, 'network.interfaces')) {
		const i = c.value
		out.push(row('iface' + c.key, { key: 'tl_interface', params: { n: Number(c.key), type: String(i.type || '-') } }, 'network.interfaces[' + c.key + ']', i.actualIP || null, 'text', { state: stateOf(IFACE_LEVELS, i.state) }))
	}
	return out
}

// browser only (no sbcExecutable: a plain fact, shown always), running or stopped (a process on the Pi: pid > 0 or not, SBC tier only)
export function pluginState(p, sbc) {
	if (!p || !p.sbcExecutable) return { key: 'state_browser', level: '' }
	if (!sbc) return null
	return p.pid > 0 ? { key: 'state_running', level: 'ok' } : { key: 'state_stopped', level: '' }
}

// the plugins of the model with their version and state
export function pluginRows(m, ctx) {
	const sbc = !!(ctx && ctx.tier && ctx.tier.extras)
	return entries(m, 'plugins').map(c => {
		const p = c.value
		return row('plugin' + c.key, { text: String(p.name || c.key) }, 'plugins.' + c.key, p.version || null, 'text', { state: pluginState(p, sbc) })
	})
}

export function globalRows(m) {
	return childrenOf(at(m, 'global')).map(c => row('global' + c.key, { text: c.key }, 'global.' + c.key, isBranch(c.value) ? childCount(c.value) : c.value, isBranch(c.value) ? 'entries' : 'value'))
}
