'use strict'

// Paths of the object model as RepRapFirmware writes them: move.axes[0].machinePosition, global.myVar, sensors.analog[1].lastReading.
// Building, splitting and following a path over DWC's model classes (ModelObject, ModelCollection = Array, ModelDictionary = Map)
// or over plain objects. Pure: test/model-path.test.js.

export const GLOBAL_PATH_RE = /^global\.([A-Za-z_][A-Za-z0-9_]*)$/

export function isMap(v) {
	return !!v && typeof v === 'object' && typeof v.get === 'function' && typeof v.entries === 'function' && typeof v.size === 'number'
}

// parent + key: 'move' + 'axes' -> 'move.axes'; 'move.axes' + 0 (index) -> 'move.axes[0]'
export function joinPath(parent, key, index) {
	if (index) return (parent || '') + '[' + key + ']'
	return parent ? parent + '.' + key : String(key)
}

// 'move.axes[0].machinePosition' -> [{ key: 'move' }, { key: 'axes' }, { key: '0', index: true }, { key: 'machinePosition' }]
export function splitPath(path) {
	const out = []
	const re = /([^.[\]]+)|\[(\d+)\]/g
	let m
	while ((m = re.exec(String(path || '')))) {
		if (m[2] !== undefined) out.push({ key: m[2], index: true })
		else out.push({ key: m[1], index: false })
	}
	return out
}

export function parentPath(path) {
	const s = String(path || '')
	const i = Math.max(s.lastIndexOf('.'), s.lastIndexOf('['))
	return i > 0 ? s.slice(0, i) : ''
}

// the value at a path, or undefined when a segment is missing
export function getAtPath(root, path) {
	let v = root
	for (const s of splitPath(path)) {
		if (v === null || v === undefined || typeof v !== 'object') return undefined
		if (isMap(v)) v = v.get(s.key)
		else v = v[s.index ? Number(s.key) : s.key]
	}
	return v
}

// 'global.myVar' -> 'myVar'; anything else -> null
export function globalNameOf(path) {
	const m = GLOBAL_PATH_RE.exec(String(path || ''))
	return m ? m[1] : null
}
