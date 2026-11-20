'use strict'

// The watcher of the alerts: one monitor (alert-monitor.js) that runs by itself, once per second, on every page of DWC while DWC is open in
// the browser, and not only while the Model Explorer page is on screen. The page only shows it and edits its rules through this object. Each
// event of a tick goes to `notify(event, popup)`: a fire or a recovery is always written in DWC's console, and a fire also pops up a short
// message when the person has that on. Nothing leaves the browser; close DWC and the watcher stops. Everything outside the logic comes in
// through `host` (the model, the connection, the clock, the timer, the console, the sound), so test/alert-watch.test.js runs it in node.

import { monitorTick, setRules, setSound, dismiss, clearEvents, saveMonitor } from './alert-monitor.js'
import { shouldBeep } from './alert-sound.js'
import { readToast, saveToast, readToastOptions, saveToastOptions, cleanToastOptions, newEvents } from './alert-toast.js'

export const WATCH_TICK_MS = 1000

// The pop-up switch (alert-toast.js) lives here, next to the monitor, and is kept in this browser.
// host: { monitor, storage, readModel(), isConnected(), now(), notify(event, popup), beep(), setTimer(fn, ms), clearTimer(id) }
export function createAlertWatch(host) {
	let mon = host.monitor
	let toast = readToast(host.storage)
	let toastOptions = readToastOptions(host.storage)
	let timer = null
	const listeners = new Set()

	function keep(next) {
		if (next === mon) return
		mon = next
		listeners.forEach(fn => { try { fn(mon) } catch (e) { /* a view that went away must not stop the others */ } })
	}

	function edit(next) {
		keep(next)
		saveMonitor(host.storage, mon)
	}

	// one sample; a board that is not connected has no live model (an empty or stale one), so nothing is judged until it is
	function tick() {
		if (!host.isConnected()) return
		const before = mon
		const next = monitorTick(mon, host.readModel(), host.now())
		keep(next)
		if (next === before) return
		newEvents(before, next).forEach(e => host.notify(e, e.type === 'fire' && toast))
		if (shouldBeep(next)) host.beep()
	}

	return {
		get monitor() { return mon },
		get toast() { return toast },
		get toastOptions() { return toastOptions },
		get running() { return timer !== null },
		start() {
			if (timer === null) timer = host.setTimer(tick, WATCH_TICK_MS)
		},
		stop() {
			if (timer !== null) host.clearTimer(timer)
			timer = null
		},
		tick,
		// the views that show the monitor; returns the function that stops listening
		subscribe(fn) {
			listeners.add(fn)
			return () => listeners.delete(fn)
		},
		setRules: rules => edit(setRules(mon, rules)),
		setSound: on => edit(setSound(mon, on)),
		setToastOptions(o) {
			toastOptions = cleanToastOptions(Object.assign({}, toastOptions, o))
			saveToastOptions(host.storage, toastOptions)
			listeners.forEach(fn => { try { fn(mon) } catch (e) { /* see keep() */ } })
		},
		setToast(on) {
			toast = on !== false
			saveToast(host.storage, toast)
			listeners.forEach(fn => { try { fn(mon) } catch (e) { /* see keep() */ } })
		},
		dismiss: id => keep(dismiss(mon, id)),
		clearEvents: () => keep(clearEvents(mon))
	}
}
