'use strict'

// The door of the Model Explorer to DWC 3.6 (Vuex): the live object model (read once per tick), the connection, G-code and DWC's
// machine file API, which is the same call on a standalone Duet (rr_ requests to the board) and in SBC mode (DSF). The 3.7 tree
// keeps its own copy over the Pinia store. A file that does not exist reads as null; everything is written as
// application/octet-stream (a PUT with another type leaves a 0-byte file in DSF).

import store from '@/store'
import { logToConsole, LogType } from '@/utils/logging'
import { makeNotification } from '@/utils/notifications'
import { isMissing } from './host-errors.js'

export function liveModel() {
	return store.state.machine.model
}

export function isConnected() {
	return !!store.getters.isConnected
}

// sendCode('G28') or sendCode({ code, log, noWait }); resolves with the reply text
export function sendCode(arg) {
	const o = typeof arg === 'string' ? { code: arg } : arg
	return store.dispatch('machine/sendCode', { code: o.code, log: o.log !== false, noWait: o.noWait === true })
}

// a line for DWC's console; `type` is 'warning' or 'success'. A failure here never stops the alerts.
export function logAlertConsole(type, title, message) {
	try {
		logToConsole(type === 'warning' ? LogType.warning : LogType.success, title, message)
	} catch (e) {
		console.warn('[WorkshopModel] alert not written to the console:', e)
	}
}

// the pop-up message at the bottom left (DWC's own notification); `sticky` keeps it until the person closes it (timeout 0), otherwise it goes by itself
// after DWC's notification time. -> the notification (it has close()), or null when it could not be shown
export function showAlertPopup(type, title, message, sticky) {
	try {
		return makeNotification(type === 'info' ? LogType.info : LogType.warning, title, message, sticky ? 0 : null)
	} catch (e) {
		console.warn('[WorkshopModel] alert message not shown:', e)
		return null
	}
}

export async function readText(path) {
	try {
		const r = await store.dispatch('machine/download', { filename: path, type: 'text', showProgress: false, showSuccess: false, showError: false })
		const content = r && typeof r === 'object' && 'content' in r ? r.content : r
		if (content === null || content === undefined) return ''
		return typeof content === 'string' ? content : JSON.stringify(content)
	} catch (e) {
		if (isMissing(e)) return null
		throw e
	}
}

export async function writeText(path, text) {
	await store.dispatch('machine/upload', { filename: path, content: new Blob([String(text)], { type: 'application/octet-stream' }), showProgress: false, showSuccess: false, showError: false })
}

// [{ name, isDirectory, size }] of a folder; a folder that does not exist gives []
export async function listDir(path) {
	try {
		const list = await store.dispatch('machine/getFileList', path)
		return Array.isArray(list) ? list : []
	} catch (e) {
		if (isMissing(e)) return []
		throw e
	}
}
