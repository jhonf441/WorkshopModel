'use strict'

// What the usage finder reads (the person picks it, remembered in this browser): by default config.g, every file it reaches with M98
// (followed with a set of visited files), daemon.g, start.g and the top level of 0:/macros. Each folder has its own switch; the depth
// of the folders is a visible setting (2 by default); backups (bak, backup, old), examples and the folders of plugins are left out
// unless the person shows them. Every setting carries the help of DESIGN.md section 7. Pure: test/usage-scope.test.js.

import { helpChoice } from './view-choices.js'
import { stripComment } from './usage-scan.js'

export const SCOPE_KEY = 'workshopModelUsageScope'
export const CONFIG_FILE = '0:/sys/config.g'
export const CHAIN_EXTRA = ['0:/sys/daemon.g', '0:/sys/start.g']
export const ROOT_DIRS = ['0:/macros', '0:/sys']
export const DEPTH_MIN = 1
export const DEPTH_MAX = 6
export const DEPTH_DEFAULT = 2

export const SCOPE_SETTINGS = {
	chain: helpChoice('usage_set', 'chain'),
	folder: helpChoice('usage_set', 'folder'),
	depth: helpChoice('usage_set', 'depth'),
	hide: helpChoice('usage_set', 'hide'),
	problems: helpChoice('usage_set', 'problems')
}

// { chain: read config.g and its M98 chain, dirs: { folder: on }, depth, hide: leave out backups, examples and plugin folders }
export function defaultScope() {
	return { chain: true, dirs: { '0:/macros': true, '0:/sys': false }, depth: DEPTH_DEFAULT, hide: true }
}

function clampDepth(n) {
	const d = Math.round(Number(n))
	return Number.isFinite(d) ? Math.min(DEPTH_MAX, Math.max(DEPTH_MIN, d)) : DEPTH_DEFAULT
}

export function cleanScope(o) {
	const d = defaultScope()
	if (!o || typeof o !== 'object') return d
	const dirs = Object.assign({}, d.dirs)
	if (o.dirs && typeof o.dirs === 'object') Object.keys(o.dirs).forEach(k => { if (/^0:\//.test(k)) dirs[k] = !!o.dirs[k] })
	return { chain: o.chain !== false, dirs, depth: clampDepth(o.depth === undefined ? d.depth : o.depth), hide: o.hide !== false }
}

export function readScope(storage) {
	try {
		return cleanScope(JSON.parse((storage && storage.getItem(SCOPE_KEY)) || 'null'))
	} catch (e) {
		return defaultScope()
	}
}

export function saveScope(storage, scope) {
	try {
		storage.setItem(SCOPE_KEY, JSON.stringify(cleanScope(scope)))
		return true
	} catch (e) {
		return false
	}
}

const BACKUP_RE = /(^|[._\-\s])(bak|backups?|old|orig)([._\-\s]|$)|~$/i
const EXAMPLE_RE = /(^|[._\-\s])examples?([._\-\s]|$)/i

// a backup or an example (a file or a folder anywhere in the path): never run, so never where a live global is defined
export function isJunk(path) {
	return String(path || '').replace(/^0:\//, '').split('/').filter(Boolean).some(p => BACKUP_RE.test(p) || EXAMPLE_RE.test(p))
}

// a folder or a file left out with `hide`: a backup, an example, or a folder named like an installed plugin (or "plugins")
export function isExcluded(path, pluginIds) {
	const parts = String(path || '').replace(/^0:\//, '').split('/').filter(Boolean)
	const ids = new Set((pluginIds || []).map(s => String(s).toLowerCase()).concat(['plugins', 'dwc-plugins']))
	return isJunk(path) || parts.some((p, i) => !(i === parts.length - 1 && /\.g$/i.test(p)) && ids.has(p.toLowerCase()))
}

// a folder is read when the person switched it on (that wins over a plugin name or a backup name), or when it is not left out and
// not switched off
export function folderOn(scope, path, excluded) {
	const v = scope && scope.dirs ? scope.dirs[path] : undefined
	return v === true || (!excluded && v !== false)
}

// the folders of a scope that are switched on
export function activeDirs(scope) {
	const s = cleanScope(scope)
	return Object.keys(s.dirs).filter(k => s.dirs[k]).sort()
}

// an M98 target as RepRapFirmware finds it: "0:/x" as written, "/x" on the card 0, anything else in 0:/sys
export function resolveMacro(p) {
	const s = String(p || '').trim()
	if (/^\d:\//.test(s)) return s
	if (s.startsWith('/')) return '0:' + s
	return '0:/sys/' + s
}

// the files a macro calls with M98 P"..." (comments left out), resolved, without repeats
export function m98Targets(text) {
	const out = []
	for (const line of String(text || '').split(/\r?\n/)) {
		const m = /^\s*M98\s+P"([^"]+)"/i.exec(stripComment(line))
		if (m) {
			const p = resolveMacro(m[1])
			if (out.indexOf(p) < 0) out.push(p)
		}
	}
	return out
}

// the starting files of the chain: config.g, daemon.g and start.g
export function chainStart() {
	return [CONFIG_FILE].concat(CHAIN_EXTRA)
}
