'use strict'

// The guided finder of the alert form (3.6 line), for the person who does not know what to look for: a short list of the values people usually
// watch that this board really has (temperatures, positions, voltages, the state), and a walk through the model one level at a time where a
// branch opens and a value can be used. A rule on a number is offered the number values only. Pure: test/alert-path-select.test.js.

import { getAtPath } from './model-path.js'
import { kindOf, isBranch, formatValue } from './value-format.js'
import { typeOfKind, pathChildren, pathChoices } from './expression-paths.js'
import { pathOptions } from './alert-path-options.js'

export const GUIDE_LIMIT = 300

// what people watch: [*] stands for every item of a list the board has (heaters, axes, drivers...)
export const SUGGESTED = [
	'heat.heaters[*].current', 'sensors.analog[*].lastReading', 'boards[*].mcuTemp.current', 'mcuTemp.current', 'boards[*].vIn.current', 'vIn.current',
	'v12.current', 'move.axes[*].machinePosition', 'move.extruders[*].position', 'fans[*].actualValue', 'job.layer', 'job.filePosition',
	'state.upTime', 'state.status', 'state.machineMode'
]

const fits = (kind, numeric) => !numeric || typeOfKind(kind) === 'number'

function expand(model, pattern, out) {
	const at = pattern.indexOf('[*]')
	if (at < 0) {
		out.push(pattern)
		return
	}
	const list = getAtPath(model, pattern.slice(0, at))
	if (!Array.isArray(list)) return
	for (let i = 0; i < list.length; i++) expand(model, pattern.slice(0, at) + '[' + i + ']' + pattern.slice(at + 3), out)
}

// -> [{ path, kind, text }] the suggested values the live model has, in the order of SUGGESTED
export function suggestions(model, opts) {
	const numeric = !!(opts && opts.numeric)
	const paths = []
	if (model) SUGGESTED.forEach(p => expand(model, p, paths))
	const out = []
	for (const path of paths) {
		const v = getAtPath(model, path)
		if (v === undefined || v === null || isBranch(v)) continue
		const kind = kindOf(v)
		if (fits(kind, numeric)) out.push({ path, kind, text: formatValue(v) })
	}
	return out
}

// the rows of one level: a branch opens, a value is used. -> [{ path, kind, text, branch, size }]
// `base` '' is the top of the model; with `all` false and a rule on a number, the values that are not numbers are left out (the branches stay)
export function levelRows(model, base, opts) {
	const o = Object.assign({ numeric: false, all: false }, opts)
	const rows = base ? pathChildren(model, base, GUIDE_LIMIT) : pathChoices(model, '', GUIDE_LIMIT)
	return o.numeric && !o.all ? rows.filter(r => r.branch || typeOfKind(r.kind) === 'number') : rows
}

// a search over the whole model: the values that match by name, whole path or value (alert-path-options.js)
export function searchRows(model, query, opts) {
	const o = pathOptions(model, query, { numeric: !!(opts && opts.numeric), limit: 80 })
	return { rows: o.model, more: o.more }
}
