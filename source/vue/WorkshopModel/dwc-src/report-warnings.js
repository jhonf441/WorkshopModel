'use strict'

// The warnings of the machine report: what is wrong right now, read from the object model (the same facts the Topics view colours),
// as short English sentences with no private data. Pure: test/machine-report.test.js.

import { getAtPath } from './model-path.js'
import { childrenOf } from './model-tree.js'
import { firmwareVersionOf, globalsSupport } from './rrf-version.js'

export const LOW_RAM_BYTES = 4000
export const HOT_MCU_C = 80

const list = (model, path) => childrenOf(getAtPath(model, path)).filter(c => c.value !== null && c.value !== undefined)

function stateWarnings(model) {
	const status = getAtPath(model, 'state.status')
	if (status === 'halted') return ['The machine is halted (emergency stop or a firmware error).']
	if (status === 'off') return ['The machine is switched off (no motor power).']
	if (status === 'disconnected') return ['DWC reports the machine as disconnected.']
	return []
}

function heaterWarnings(model) {
	return list(model, 'heat.heaters').filter(c => c.value.state === 'fault' || c.value.state === 'offline').map(c => 'Heater ' + c.key + ' is ' + c.value.state + '.')
}

function boardWarnings(model) {
	const out = []
	for (const c of list(model, 'boards')) {
		const b = c.value
		if (typeof b.freeRam === 'number' && b.freeRam < LOW_RAM_BYTES) out.push('Board ' + c.key + ' has little free memory (' + b.freeRam + ' bytes).')
		const mcu = b.mcuTemp && typeof b.mcuTemp.current === 'number' ? b.mcuTemp.current : null
		if (mcu !== null && mcu >= HOT_MCU_C) out.push('Board ' + c.key + ' processor is hot (' + Math.round(mcu) + ' C).')
	}
	return out
}

function volumeWarnings(model) {
	return list(model, 'volumes').filter(c => c.value.mounted === false).map(c => 'Volume ' + c.key + ' is not mounted.')
}

function firmwareWarnings(model) {
	const g = globalsSupport(firmwareVersionOf(model))
	return g.known && !g.ok ? ['Firmware ' + g.version + ' is older than ' + g.minimum + ': global variables are not available.'] : []
}

export function reportWarnings(model) {
	return [].concat(stateWarnings(model), heaterWarnings(model), boardWarnings(model), volumeWarnings(model), firmwareWarnings(model))
}
