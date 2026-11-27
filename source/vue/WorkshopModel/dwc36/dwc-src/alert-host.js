'use strict'

// The one watcher of this browser (alert-watch.js) wired to DWC 3.6: the live model, the connection, DWC's own console and its pop-up message
// (bottom left, closes by itself, set in DWC's notification settings), the sound. index.js starts it when DWC loads the plugin, so the alerts
// run on every page; the Model Explorer page takes the same object with alertWatch(). A second load of the bundle (the plugin started again
// without a reload of DWC) stops the first timer through a key on `window`, so there are never two watchers.

// The one watcher of this browser (alert-watch.js) wired to DWC 3.6: the live model, the connection, DWC's own console and the pop-up message (THE notices
// center of the family, vue/_shared36/notices.js: where, how long and which look are the choice of THIS screen, NoticeOptions.vue; note 13, 2026-11-23), the
// sound, and the one-second clock of the family (tick-scheduler.js). index.js starts it when DWC loads the plugin, so the alerts
// run on every page; the Model Explorer page takes the same object with alertWatch(). A second load of the bundle (the plugin started again
// without a reload of DWC) stops the first timer through a key on `window`, so there are never two watchers.

import i18n from '../../i18n'
import { liveModel, isConnected, logAlertConsole, showAlertPopup } from './model-host.js'
import { readMonitor } from './alert-monitor.js'
import { ruleName } from './alert-rules.js'
import { createAlertWatch } from './alert-watch.js'
import { beep } from './alert-sound.js'
import { escapeHtml } from './alert-toast.js'
import { installNotices } from './notices.js' // vue/_shared36: THE notices center
import { sharedScheduler } from './tick-scheduler.js' // vue/_shared36

const KEY = '__workshopModelAlertWatch'

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

// the line of an event, as the banner and the list of events say it
export function eventLine(e) {
	return t('alerts_event_' + e.type, { path: ruleName(e), op: t('alerts_op_' + e.op), limit: e.limit, value: e.value })
}

const SOURCE = 'WorkshopModel'
const DWC_TYPE = { info: 'info', success: 'info', warning: 'warning', error: 'warning', refusal: 'warning' }

// THE notices center of this tab (the first plugin that asks installs it). This plugin can show DWC's own notification, so it opens that door once
// for the "DWC notification" look of the screen (the center decides when to use it; a failed door falls back to the card). Texts are escaped: DWC prints HTML.
function center() {
	const c = installNotices()
	if (c && typeof c._setDwcDoor === 'function' && !c._door) {
		c._setDwcDoor(n => showAlertPopup(DWC_TYPE[n.level] || 'info', escapeHtml(n.title || ''), escapeHtml(n.text || ''), false) !== null)
	}
	return c
}

// one message per rule (the same id replaces the previous one); the center decides the place, the time and how many wait
function fireMessage(id, title, message, level) {
	const c = center()
	if (c) c.post({ source: SOURCE, id: String(id), level: level || 'warning', title, text: message })
}

// a line of the console always (DWC prints it as HTML: escaped); a fire also leaves its message when the switch is on: it waits to be closed unless
// the person chose otherwise, and a rule keeps one message at most, with a cap on how many wait (alert-popups.js)
function notify(e, popup) {
	const fire = e.type === 'fire'
	const title = t(fire ? 'alerts_toast_title' : 'alerts_toast_recovered')
	const message = eventLine(e)
	logAlertConsole(fire ? 'warning' : 'success', escapeHtml(title), escapeHtml(message))
	if (popup) fireMessage(e.id, title, message, fire ? 'warning' : 'success')
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
		setTimer: (fn, ms) => sharedScheduler().every(fn, ms),
		clearTimer: id => sharedScheduler().remove(id)
	})
	if (win) win[KEY] = watch
	return watch
}

export function startAlertWatch() {
	alertWatch().start()
}
