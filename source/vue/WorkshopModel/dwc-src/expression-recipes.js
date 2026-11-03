'use strict'

// Ready recipes for the workshop, built from the REAL paths of the model on the board (the first heater that has a temperature, the
// first two axes, the first global it has), so one click loads an expression that works here. A recipe whose paths the model does
// not have is left out. The name of a recipe is the text key recipe_<id>, what it answers recipe_<id>_what. Pure:
// test/expression-builder.test.js.

import { getAtPath } from './model-path.js'

const has = (model, path) => getAtPath(model, path) !== undefined && getAtPath(model, path) !== null

// the indexes of a collection whose items have the member (a ModelCollection may hold nulls)
function indexesWith(model, base, member, wanted) {
	const list = getAtPath(model, base)
	const out = []
	const n = list && typeof list.length === 'number' ? list.length : 0
	for (let i = 0; i < n && out.length < wanted; i++) {
		if (has(model, base + '[' + i + '].' + member)) out.push(i)
	}
	return out
}

function globalName(model) {
	const g = model && model.global
	if (g && typeof g.keys === 'function') {
		const first = g.keys().next()
		if (!first.done) return String(first.value)
	}
	return ''
}

function heaterRecipes(model) {
	const out = []
	const [h0, h1] = indexesWith(model, 'heat.heaters', 'current', 2)
	if (h0 !== undefined) out.push({ id: 'heater_over', code: 'heat.heaters[' + h0 + '].current > 60' })
	if (h1 !== undefined) out.push({ id: 'any_hot', code: 'max(heat.heaters[' + h0 + '].current, heat.heaters[' + h1 + '].current) > 60' })
	if (has(model, 'heat.bedHeaters[0]') && getAtPath(model, 'heat.bedHeaters[0]') >= 0) {
		out.push({ id: 'bed_temperature', code: 'heat.heaters[heat.bedHeaters[0]].current' })
	}
	return out
}

function axisRecipes(model) {
	const out = []
	const [a0, a1] = indexesWith(model, 'move.axes', 'machinePosition', 2)
	const inside = i => 'move.axes[' + i + '].machinePosition >= move.axes[' + i + '].min && move.axes[' + i + '].machinePosition <= move.axes[' + i + '].max'
	if (a0 !== undefined && has(model, 'move.axes[' + a0 + '].min') && has(model, 'move.axes[' + a0 + '].max')) {
		out.push({ id: 'axis_inside', code: inside(a0) })
	}
	if (a1 !== undefined) out.push({ id: 'axes_homed', code: 'move.axes[' + a0 + '].homed && move.axes[' + a1 + '].homed' })
	return out
}

function stateRecipes(model) {
	const out = []
	if (has(model, 'state.status') && getAtPath(model, 'job') !== undefined) {
		out.push({ id: 'job_layer', code: 'state.status = "processing" ? "layer " ^ job.layer : "no job running"' })
	}
	if (has(model, 'state.upTime')) out.push({ id: 'uptime_hours', code: 'floor(state.upTime / 3600)' })
	return out
}

function globalRecipe(model) {
	const name = globalName(model) || 'myValue'
	return [{ id: 'global_default', code: 'exists(global.' + name + ') ? global.' + name + ' : 0' }]
}

// -> [{ id, mode: 'echo', code }] in the order the panel shows them
export function recipesFor(model) {
	if (!model) return []
	return [].concat(heaterRecipes(model), axisRecipes(model), stateRecipes(model), globalRecipe(model)).map(r => Object.assign({ mode: 'echo' }, r))
}
