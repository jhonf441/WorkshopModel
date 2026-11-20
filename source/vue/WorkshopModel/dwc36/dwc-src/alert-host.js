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
import { createToastView } from './alert-toast-view.js'

const KEY = '__workshopModelAlertWatch'

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

// the line of an event, as the banner and the list of events say it
export function eventLine(e) {
	return t('alerts_event_' + e.type, { path: e.path, op: t('alerts_op_' + e.op), limit: e.limit, value: e.value })
}

const DEFAULT_OPTIONS = { sticky: true, max: 3, style: 'own', position: 'left' }
const optionsNow = () => (watch ? watch.toastOptions : DEFAULT_OPTIONS)

// the page is dark when Vuetify says so (the root of DWC carries theme--dark)
function isDark() {
	const root = typeof document === 'undefined' ? null : document.querySelector('.v-application')
	return !!(root && root.classList.contains('theme--dark'))
}

// the side menu of DWC, when it is open on the left, is a place a card must not cover: the left corner starts at its edge
function menuInset() {
	const nav = typeof document === 'undefined' ? null : document.querySelector('.v-navigation-drawer--open')
	if (!nav) return 0
	const r = nav.getBoundingClientRect()
	return r.width > 0 && r.left <= 0 ? Math.max(0, r.right) : 0
}

let view = null
function ownView() {
	if (!view) {
		view = createToastView({
			doc: document,
			labels: () => ({ close: t('alerts_toast_close'), region: t('alerts_toast_region') }),
			position: () => optionsNow().position,
			dark: isDark,
			inset: menuInset
		})
	}
	return view
}

// the message in the style the person chose: the own card (plain DOM, text as text) or DWC's notification (it prints HTML, so the texts are escaped)
function show(type, title, message, sticky) {
	if (optionsNow().style === 'dwc') return showAlertPopup(type, escapeHtml(title), escapeHtml(message), sticky)
	try {
		return ownView().show(type, title, message, sticky)
	} catch (e) {
		console.warn('[WorkshopModel] alert message not shown:', e)
		return null
	}
}

const popups = createPopups({ show })

function fireMessage(id, title, message) {
	const o = optionsNow()
	popups.fire(id, title, message, {
		sticky: o.sticky,
		max: o.max,
		summaryTitle: t('alerts_toast_more_title'),
		summaryText: n => t('alerts_toast_more_text', { n })
	})
}

// a line of the console always (DWC prints it as HTML: escaped); a fire also leaves its message when the switch is on: it waits to be closed unless
// the person chose otherwise, and a rule keeps one message at most, with a cap on how many wait (alert-popups.js)
function notify(e, popup) {
	const fire = e.type === 'fire'
	const title = t(fire ? 'alerts_toast_title' : 'alerts_toast_recovered')
	const message = eventLine(e)
	logAlertConsole(fire ? 'warning' : 'success', escapeHtml(title), escapeHtml(message))
	if (popup) fireMessage(e.id, title, message)
}

// the "Try the message" button: a sample in the style and the place chosen now, so the person sees it before an alert needs it (no console line)
export function previewAlertMessage() {
	fireMessage('preview', t('alerts_toast_title'), t('alerts_toast_preview_text'))
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
