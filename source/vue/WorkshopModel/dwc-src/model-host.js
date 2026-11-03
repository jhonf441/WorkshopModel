'use strict'

// The door of the Model Explorer to DWC 3.7: the live object model (raw, read once per tick so Vue does not re-render on every
// poll), the connection, G-code through the shared adapter and DWC's machine file API, which is the same call on a standalone
// Duet (rr_ requests to the board) and in SBC mode (DSF). The 3.6 tree keeps its own copy over the Vuex store. A file that does
// not exist reads as null; everything is written as application/octet-stream (a PUT with another type leaves a 0-byte file in DSF).

import { toRaw } from 'vue'
import { machineModel, machineStore, isConnected, sendCode } from './dwc-host.js'

export { isConnected, sendCode }

export function liveModel() {
	return toRaw(machineModel())
}

function isMissing(e) {
	const name = e && ((e.constructor && e.constructor.name) || e.name)
	return /FileNotFound/i.test(String(name || '')) || (e && e.status === 404)
}

export async function readText(path) {
	try {
		const r = await machineStore().download({ filename: path, type: 'text' }, false, false, false)
		if (r === null || r === undefined) return ''
		return typeof r === 'string' ? r : JSON.stringify(r)
	} catch (e) {
		if (isMissing(e)) return null
		throw e
	}
}

export async function writeText(path, text) {
	await machineStore().upload({ filename: path, content: new Blob([String(text)], { type: 'application/octet-stream' }) }, false, false, false)
}

// [{ name, isDirectory, size }] of a folder; a folder that does not exist gives []
export async function listDir(path) {
	try {
		const list = await machineStore().getFileList(path)
		return Array.isArray(list) ? list : []
	} catch (e) {
		if (isMissing(e)) return []
		throw e
	}
}
