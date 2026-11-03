'use strict'

// Double tap (DESIGN.md section 5, level 2): the first tap arms the button for ARM_MS, the second tap within that time fires.
// state: null or { id, until }. Pure: test/armed.test.js.

export const ARM_MS = 4000

// -> { state, fire }
export function pressArmed(state, id, now) {
	if (state && state.id === id && now < state.until) return { state: null, fire: true }
	return { state: { id, until: now + ARM_MS }, fire: false }
}

export function isArmed(state, id, now) {
	return !!state && state.id === id && now < state.until
}
