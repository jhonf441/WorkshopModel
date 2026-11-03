'use strict'

// The live preview of the expression builder: evaluate again every N seconds (the watch-like use) without flooding the board. The
// clock is the page's own tick (once a second), never a timer of the section, so a hidden page costs nothing. The rules, all here:
// one evaluation at a time (a slow board never queues them), a floor on N that is wider on a standalone Duet (every call goes
// through the board's one web server) than with the SBC tier, a budget of evaluations after which it stops by itself, and it stops
// when the board goes offline or the expression is no longer valid. The state is one plain object; every function returns a new
// one. Pure: test/expression-builder.test.js.

export const LIVE_STANDALONE = { seconds: [5, 10, 30, 60], runs: 60 }
export const LIVE_EXTRAS = { seconds: [2, 5, 10, 30, 60], runs: 600 }

// the budget of a tier ({ extras }) -> { seconds: the intervals offered, runs: evaluations before it stops }
export function liveBudget(tier) {
	return tier && tier.extras ? LIVE_EXTRAS : LIVE_STANDALONE
}

export function newLive() {
	return { on: false, every: 0, last: null, runs: 0, busy: false, stopped: '' }
}

// start (first evaluation is due at once); an interval the tier does not offer becomes its shortest one
export function startLive(state, seconds, tier) {
	const b = liveBudget(tier)
	const every = b.seconds.indexOf(seconds) >= 0 ? seconds : b.seconds[0]
	return Object.assign({}, state, { on: true, every, last: null, runs: 0, busy: false, stopped: '' })
}

// reason: 'manual' | 'offline' | 'invalid' | 'limit' | 'error'
export function stopLive(state, reason) {
	return Object.assign({}, state, { on: false, busy: false, stopped: reason || 'manual' })
}

// true when an evaluation should be sent now
export function liveDue(state, now) {
	return state.on && !state.busy && (state.last === null || now - state.last >= state.every * 1000)
}

export function liveSent(state, now) {
	return Object.assign({}, state, { busy: true, last: now, runs: state.runs + 1 })
}

export function liveDone(state) {
	return Object.assign({}, state, { busy: false })
}

// why it has to stop now, or '' (ctx: { connected, valid, tier })
export function liveStopReason(state, ctx) {
	if (!state.on) return ''
	if (!ctx.connected) return 'offline'
	if (!ctx.valid) return 'invalid'
	if (state.runs >= liveBudget(ctx.tier).runs && !state.busy) return 'limit'
	return ''
}
