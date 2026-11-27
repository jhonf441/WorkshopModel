'use strict'

// The folders of "What to read" in groups (note 3 of the owner, 2026-11-23): forty switches in one running line had no order and their columns
// never lined up. Pure: each folder goes to the group of its parent folder; a group with fewer than `minSize` folders moves up to its grandparent
// (one lonely sub-folder does not get a card of its own); the top folders (0:/macros, 0:/sys) share the group of the card root "0:/".
// Rows: [{ dir, on, excluded, note }] -> [{ key, title, on, rows: [{ ...row, name }] }], groups by path, rows by name. Nothing here knows the
// folders of a given machine: it only reads the paths it is given.

export const CARD_ROOT = '0:/'

// '0:/macros/x' -> '0:/macros'; '0:/macros' -> '0:/'
export function parentDir(dir) {
	const s = String(dir || '')
	const i = s.lastIndexOf('/')
	return i > CARD_ROOT.length - 1 ? s.slice(0, i) : CARD_ROOT
}

// the name of a folder inside its group: the path without the group prefix
export function nameIn(key, dir) {
	const s = String(dir || '')
	if (key === CARD_ROOT) return s.slice(CARD_ROOT.length)
	return s.startsWith(key + '/') ? s.slice(key.length + 1) : s
}

export function folderGroups(rows, minSize) {
	const min = Number.isFinite(minSize) && minSize > 0 ? minSize : 2
	const by = new Map()
	;(rows || []).forEach(r => {
		if (!r || !r.dir) return
		const p = parentDir(r.dir)
		if (!by.has(p)) by.set(p, [])
		by.get(p).push(r)
	})
	let moved = true
	while (moved) {
		moved = false
		for (const [key, list] of by) {
			if (key === CARD_ROOT || list.length >= min) continue
			const up = parentDir(key)
			if (!by.has(up)) by.set(up, [])
			by.get(up).push(...list)
			by.delete(key)
			moved = true
			break
		}
	}
	return Array.from(by.keys()).sort().map(key => {
		const list = by.get(key).map(r => Object.assign({}, r, { name: nameIn(key, r.dir) }))
		list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
		return { key, title: key, on: list.filter(r => r.on).length, rows: list }
	})
}

// the change of "all" / "none" of one group: { dir: on } for every folder of the group
export function groupDirs(group, on) {
	const out = {}
	;((group && group.rows) || []).forEach(r => { out[r.dir] = !!on })
	return out
}
