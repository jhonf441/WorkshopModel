'use strict'

// The machine report for support: a markdown text in English, ready to paste into the Duet forum or a GitHub issue, built from the live
// object model: firmware, boards, DWC and DSF versions, SBC yes or no, plugins, sensors, drivers, network state, heaters, volumes and the
// active warnings. It is built from a fixed list of fields, never by dumping the model, and what is private (machine name, hostname, IP
// addresses, MAC, serial numbers, the file paths of the person) is left out unless its own tick box (report-redact.js REPORT_INCLUDES)
// is on; user names and passwords are never read. Every free text goes through the scrub. Pure: test/machine-report.test.js.

import { getAtPath } from './model-path.js'
import { childrenOf } from './model-tree.js'
import { cleanIncludes, secretsOf, scrub } from './report-redact.js'
import { reportWarnings } from './report-warnings.js'

const has = v => v !== null && v !== undefined && v !== ''
const list = (model, path) => childrenOf(getAtPath(model, path)).filter(c => c.value !== null && c.value !== undefined)
const num = (v, digits) => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits)) : '-')

// one markdown table; every cell on one line with the pipe escaped
function table(head, rows) {
	if (!rows.length) return ['_none_', '']
	const cell = v => String(has(v) ? v : '-').replace(/\|/g, '/')
	return ['| ' + head.join(' | ') + ' |', '| ' + head.map(() => '---').join(' | ') + ' |'].concat(rows.map(r => '| ' + r.map(cell).join(' | ') + ' |'), [''])
}

function bytesText(n) {
	if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
	if (n >= 1073741824) return num(n / 1073741824, 1) + ' GB'
	if (n >= 1048576) return num(n / 1048576, 1) + ' MB'
	return num(n / 1024, 1) + ' KB'
}

// A driver as the model has it: DWC gives { board, driver } (0 and 1: "0.1"), older data a text "0.1". Never "[object Object]".
export function driverText(d) {
	return d && typeof d === 'object' && 'board' in d ? d.board + '.' + d.driver : String(d)
}

// A catalog name (firmware, board, plugin: what the firmware or the plugin calls itself): only the whitespace is tidied. The scrub is for what a person typed:
// a machine called "Duet" must not turn "RepRapFirmware for Duet 3 MB6HC" or "DuetPiManagementPlugin" into "[redacted] 3 MB6HC".
const catalog = v => String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim()

// The time of the report as the person's clock shows it, with its offset: "2026-11-02 13:02:14 -05:00". The file name has the same instant in local time
// (data-exchange.js exchangeStamp), so the name and the body no longer disagree (13:02:14 in one, 18:01:45Z in the other).
export function localStamp(d) {
	const two = n => (n < 10 ? '0' : '') + n
	const off = -d.getTimezoneOffset()
	const abs = Math.abs(off)
	return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()) + ' ' + (off < 0 ? '-' : '+') + two(Math.floor(abs / 60)) + ':' + two(abs % 60)
}

// the context of a build: the model, what to include, the secrets to scrub and the free-text helper
function context(model, opts) {
	const o = opts || {}
	const include = cleanIncludes(o.include)
	const secrets = secretsOf(model)
	return { model, include, secrets, o, safe: v => scrub(v, secrets, include), ver: v => scrub(v, secrets, include, true), cat: catalog }
}

function firmwareSection(c) {
	const boards = list(c.model, 'boards')
	const rows = boards.map(b => {
		const v = b.value
		const main = b.key === '0' ? ' (main)' : (has(v.canAddress) ? ' (CAN ' + v.canAddress + ')' : '')
		// MO-9c: a version the board does not report (an expansion board on CAN) is "n/a", not a dash that looks like a broken cell
		return [c.cat(v.shortName || v.name || 'unknown') + main, c.cat(v.firmwareName || '-'), c.ver(v.firmwareVersion || 'n/a'), c.ver(v.firmwareDate || '-'), num(v.vIn && v.vIn.current, 1), bytesText(v.freeRam)]
	})
	const out = ['## Firmware and boards', ''].concat(table(['Board', 'Firmware', 'Version', 'Date', 'Vin (V)', 'Free RAM'], rows))
	if (c.include.serial) boards.forEach(b => { if (has(b.value.uniqueId)) out.push('- Board ' + b.key + ' unique ID: ' + b.value.uniqueId) })
	return out.concat(c.include.serial ? [''] : [])
}

function softwareSection(c) {
	const dsf = getAtPath(c.model, 'sbc.dsf')
	const sbc = !!getAtPath(c.model, 'sbc')
	const dwc = has(c.o.dwcVersion) ? c.ver(c.o.dwcVersion) : 'not stated'
	const out = ['## Software', '', '- DWC: ' + dwc, '- SBC mode: ' + (sbc ? 'yes' : 'no')]
	if (sbc) out.push('- DSF: ' + c.ver((dsf && dsf.version) || getAtPath(c.model, 'state.dsfVersion') || 'unknown'))
	const status = getAtPath(c.model, 'state.status')
	if (has(status)) out.push('- Status: ' + c.safe(status))
	const up = getAtPath(c.model, 'state.upTime')
	if (typeof up === 'number') out.push('- Uptime: ' + num(up / 3600, 1) + ' h')
	return out.concat([''])
}

function pluginsSection(c) {
	const rows = list(c.model, 'plugins').map(p => [c.cat(p.key), c.ver(p.value.version || '-'), has(p.value.dwcVersion) ? c.ver(p.value.dwcVersion) : '-', p.value.sbcExecutable ? (p.value.pid > 0 ? 'running' : 'stopped') : 'browser only'])
	return ['## Plugins', ''].concat(table(['Plugin', 'Version', 'Needs DWC', 'Process'], rows))
}

function sensorsSection(c) {
	const analog = list(c.model, 'sensors.analog').map(s => ['analog ' + s.key, c.safe(s.value.name || '-'), c.safe(s.value.type || '-'), num(s.value.lastReading, 2)])
	const probes = list(c.model, 'sensors.probes').map(s => ['probe ' + s.key, '-', c.safe(s.value.type !== undefined ? s.value.type : '-'), has(s.value.triggerHeight) ? 'trigger ' + num(s.value.triggerHeight, 3) : '-'])
	const fil = list(c.model, 'sensors.filamentMonitors').map(s => ['filament ' + s.key, '-', c.safe(s.value.type || '-'), c.safe(s.value.status || '-')])
	return ['## Sensors', ''].concat(table(['Sensor', 'Name', 'Type', 'Reading'], analog.concat(probes, fil)))
}

function heatersSection(c) {
	const rows = list(c.model, 'heat.heaters').map(h => ['heater ' + h.key, c.safe(h.value.state || '-'), has(h.value.sensor) ? 'sensor ' + h.value.sensor : '-', num(h.value.current, 1), num(h.value.active, 1), num(h.value.standby, 1)])
	const bed = list(c.model, 'heat.bedHeaters').map(b => b.value).filter(v => v >= 0)
	const out = ['## Heaters', ''].concat(bed.length ? ['Bed heaters: ' + bed.join(', '), ''] : [])
	return out.concat(table(['Heater', 'State', 'Sensor', 'Current', 'Active', 'Standby'], rows))
}

function driversSection(c) {
	const axes = list(c.model, 'move.axes').map(a => ['axis ' + c.safe(a.value.letter || a.key), (a.value.drivers || []).map(d => c.cat(driverText(d))).join(', ') || '-', a.value.homed === true ? 'homed' : 'not homed', num(a.value.min, 1) + ' to ' + num(a.value.max, 1)])
	const ext = list(c.model, 'move.extruders').map(e => ['extruder ' + e.key, c.cat(has(e.value.driver) ? driverText(e.value.driver) : '-'), '-', '-'])
	return ['## Drivers', ''].concat(table(['Motor', 'Driver', 'State', 'Range (mm)'], axes.concat(ext)))
}

function interfaceRows(c) {
	return list(c.model, 'network.interfaces').map(i => {
		const v = i.value
		return [i.key, c.safe(v.type || '-'), c.safe(v.state || '-'), typeof v.speed === 'number' && v.speed > 0 ? v.speed + ' Mbit/s' : 'n/a', has(v.signal) ? v.signal + ' dBm' : '-', has(v.firmwareVersion) ? c.ver(v.firmwareVersion) : '-']
	})
}

// the private lines of the network section: one per value whose tick box is on
function networkExtras(c) {
	const extra = []
	if (c.include.name && has(getAtPath(c.model, 'network.name'))) extra.push('- Machine name: ' + getAtPath(c.model, 'network.name'))
	if (c.include.hostname && has(getAtPath(c.model, 'network.hostname'))) extra.push('- Hostname: ' + getAtPath(c.model, 'network.hostname'))
	for (const i of list(c.model, 'network.interfaces')) {
		const v = i.value
		if (c.include.ip) [['IP address', v.actualIP], ['Gateway', v.gateway], ['Subnet', v.subnet]].forEach(p => { if (has(p[1])) extra.push('- Interface ' + i.key + ' ' + p[0] + ': ' + p[1]) })
		if (c.include.mac && has(v.macAddress)) extra.push('- Interface ' + i.key + ' MAC: ' + v.macAddress)
	}
	return extra
}

function networkSection(c) {
	const out = ['## Network', ''].concat(table(['Interface', 'Type', 'State', 'Speed', 'Signal', 'Module firmware'], interfaceRows(c)))
	const extra = networkExtras(c)
	return out.concat(extra, extra.length ? [''] : [])
}

function volumesSection(c) {
	const rows = list(c.model, 'volumes').map(v => ['volume ' + v.key, v.value.mounted === false ? 'not mounted' : 'mounted', bytesText(v.value.capacity), bytesText(v.value.freeSpace), has(v.value.speed) ? bytesText(v.value.speed) + '/s' : '-'])
	return ['## Volumes', ''].concat(table(['Volume', 'State', 'Capacity', 'Free', 'Speed'], rows))
}

function pathsSection(c) {
	if (!c.include.paths) return []
	const out = ['## Paths', '']
	const file = getAtPath(c.model, 'job.file.fileName')
	if (has(file)) out.push('- Job file: ' + file)
	for (const d of list(c.model, 'directories')) if (typeof d.value === 'string') out.push('- ' + d.key + ': ' + d.value)
	return out.length > 2 ? out.concat(['']) : []
}

function warningsSection(c) {
	const w = reportWarnings(c.model).concat((c.o.warnings || []).map(c.safe))
	return ['## Active warnings', ''].concat(w.length ? w.map(x => '- ' + x) : ['- none'], [''])
}

// -> the markdown text. opts: { include: { name, hostname, ip, mac, serial, paths }, dwcVersion, warnings: [text], now: Date }
export function buildReport(model, opts) {
	const c = context(model, opts)
	const at = c.o.now instanceof Date ? c.o.now : new Date()
	const head = ['# Machine report', '', 'Generated ' + localStamp(at) + ' by Model Explorer. Private data (addresses, names, serial numbers, file paths) is left out unless ticked.', '']
	const parts = [head, firmwareSection(c), softwareSection(c), pluginsSection(c), sensorsSection(c), driversSection(c), networkSection(c), heatersSection(c), volumesSection(c), pathsSection(c), warningsSection(c)]
	return parts.reduce((a, p) => a.concat(p), []).join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

// the version of DWC as far as the page can tell (a version the DWC build exposes); '' when it is not known
export function detectDwcVersion(win) {
	const d = win && win.DWC
	const v = d && (d.version || d.dwcVersion || d.packageVersion)
	return typeof v === 'string' ? v.trim() : ''
}
