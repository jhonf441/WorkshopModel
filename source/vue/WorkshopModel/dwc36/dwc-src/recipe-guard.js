'use strict'

// The recipes this board can really run (3.6 line): the built-in recipes (expression-recipes.js, shared with the 3.7 line) are written from the paths the
// model HAS, but the bed one also needs the bed heater to exist and read a temperature. A bed heater that is named by heat.bedHeaters[0] and has no working
// sensor shows -273.15, and the board answers "array index out of bounds" to heat.heaters[heat.bedHeaters[0]].current (seen 20-nov-2026), so that recipe is
// left out until the heater reads. Pure: test/expression-builder.test.js.

import { getAtPath } from './model-path.js'

export const NO_READING = -273

export function bedReads(model) {
	const bed = getAtPath(model, 'heat.bedHeaters[0]')
	if (typeof bed !== 'number' || bed < 0) return false
	const now = getAtPath(model, 'heat.heaters[' + bed + '].current')
	return typeof now === 'number' && now > NO_READING
}

// -> the recipes without the ones the board would refuse
export function usableRecipes(recipes, model) {
	return (recipes || []).filter(r => r.id !== 'bed_temperature' || bedReads(model))
}
