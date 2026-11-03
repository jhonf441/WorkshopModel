'use strict'

// The optional sound of an alert (off until the person turns it on): two short tones from the Web Audio API, no audio file. The browser
// may keep a page silent until the person has touched it once; then nothing plays and the banner is still there. shouldBeep is the only
// decision: sound on and at least one fire in this sample. Pure apart from the injected `win`: test/alert-rules.test.js.

export function shouldBeep(mon) {
	return !!mon && mon.sound === true && Array.isArray(mon.fresh) && mon.fresh.length > 0
}

// -> true when the tones were started
export function beep(win) {
	const Ctx = win && (win.AudioContext || win.webkitAudioContext)
	if (!Ctx) return false
	try {
		const ctx = new Ctx()
		const tone = (freq, start) => {
			const osc = ctx.createOscillator()
			const gain = ctx.createGain()
			osc.frequency.value = freq
			gain.gain.value = 0.15
			osc.connect(gain)
			gain.connect(ctx.destination)
			osc.start(ctx.currentTime + start)
			osc.stop(ctx.currentTime + start + 0.18)
		}
		tone(880, 0)
		tone(660, 0.22)
		setTimeout(() => { try { ctx.close() } catch (e) { /* already closed */ } }, 800)
		return true
	} catch (e) {
		return false
	}
}
