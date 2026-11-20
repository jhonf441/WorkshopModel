'use strict'

// The one watcher of this browser (alert-watch.js) wired to DWC 3.6: the live model, the connection, DWC's own console and its pop-up message
// (bottom left, closes by itself, set in DWC's notification settings), the sound. index.js starts it when DWC loads the plugin, so the alerts
// run on every page; the Model Explorer page takes the same object with alertWatch(). A second load of the bundle (the plugin started again
// without a reload of DWC) stops the first timer through a key on `window`, so there are never two watchers.

import i18n from '../../i18n'
import { liveModel, isConnected, logAlertConsole, showAlertPopup } from './model-host.js'
import { readMonitor } from './alert-monitor.js'
import { createAlertWatch } from './alert-watch.js'
import { beep } from './alert-sound.js'
import { escapeHtml } from './alert-toast.js'
import { createPopups } from './alert-popups.js'

const KEY = '__workshopModelAlertWatch'

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

// the line of an event, as the banner and the list of events say it
export function eventLine(e) {
	return t('alerts_event_' + e.type, { path: e.path, op: t('alerts_op_' + e.op), limit: e.limit, value: e.value })
}

const popups = createPopups({ show: showAlertPopup })

// a line of the console always; a fire also leaves its message when the switch is on: it waits to be closed unless the person chose otherwise, and
// a rule keeps one message at most, with a cap on how many wait (alert-popups.js)
function notify(e, popup) {
	const fire = e.type === 'fire'
	const title = escapeHtml(t(fire ? 'alerts_toast_title' : 'alerts_toast_recovered'))
	const message = escapeHtml(eventLine(e))
	logAlertConsole(fire ? 'warning' : 'success', title, message)
	if (!popup) return
	const o = watch ? watch.toastOptions : { sticky: true, max: 3 }
	popups.fire(e.id, title, message, {
		sticky: o.sticky,
		max: o.max,
		summaryTitle: escapeHtml(t('alerts_toast_more_title')),
		summaryText: n => escapeHtml(t('alerts_toast_more_text', { n }))
	})
}

let watch = null

export function alertWatch() {
	if (watch) return watch
	const win = typeof window === 'undefined' ? null : window
	if (win && win[KEY]) win[KEY].stop()
	watch = createAlertWatch({
		monitor: readMonitor(typeof localStorage === 'undefined' ? null : localStorage),
		storage: typeof localStorage === 'undefined' ? null : localStorage,
		readModel: liveModel,
		isConnected,
		now: () => Date.now(),
		notify,
		beep: () => beep(win),
		setTimer: (fn, ms) => setInterval(fn, ms),
		clearTimer: id => clearInterval(id)
	})
	if (win) win[KEY] = watch
	return watch
}

export function startAlertWatch() {
	alertWatch().start()
}
