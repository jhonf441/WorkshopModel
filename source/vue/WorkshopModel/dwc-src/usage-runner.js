'use strict'

// One run of the usage finder, with the machine reached through `io` (model-host.js listDir / readText on the page, fakes in the
// tests). Two jobs:
//  - the readers and writers the person asked for (the scope): the M98 chain from config.g (plus daemon.g and start.g), then the
//    folders switched on down to the depth;
//  - the definitions, whatever the scope: every .g file of 0:/sys down to DEFS_DEPTH (backups and examples left out), from which only
//    the `global x = ...` lines are kept, so a global created in a macro the scope does not read is not reported as missing.
// Every .g file is read once, within the budget of the tier (one budget per job). A file whose size and last change are the ones of
// the cache is not read again (incremental scan). The cache is a Map path -> { key, refs, targets }; the page keeps it in memory and,
// with the SBC tier only, in the watch file (never a new file on a standalone Duet). The run also says which folders could still hold
// a definition and were not read (`unscanned`), so a name read but never created is a sure problem only when there is none.
// Pure apart from the injected io: test/usage-scope.test.js.

import { scanUsage } from './usage-scan.js'
import { macroInfo } from './macro-map.js'
import { chainStart, m98Targets, activeDirs, isExcluded, isJunk, folderOn, cleanScope, ROOT_DIRS } from './usage-scope.js'

export const REFS_PER_FILE = 300
export const CACHE_FILES = 400
export const DEFS_ROOT = '0:/sys'
export const DEFS_DEPTH = 4

// size and last change of a listed file: the key of the cache ('' when the board reports neither)
export function metaKey(item) {
	if (!item) return ''
	const size = item.size === undefined || item.size === null ? '' : String(item.size)
	const when = item.lastModified ? new Date(item.lastModified).getTime() : ''
	return size || when ? size + '@' + when : ''
}

const parentOf = p => p.slice(0, p.lastIndexOf('/'))
const baseOf = p => p.slice(p.lastIndexOf('/') + 1).toLowerCase()
const under = (path, root) => path === root || path.startsWith(root + '/')

async function listing(ctx, dir) {
	if (!ctx.listings.has(dir)) {
		const items = await ctx.io.listDir(dir)
		ctx.listings.set(dir, Array.isArray(items) ? items : [])
	}
	return ctx.listings.get(dir)
}

async function metaOf(ctx, path) {
	const items = await listing(ctx, parentOf(path))
	return items.find(i => i && !i.isDirectory && String(i.name).toLowerCase() === baseOf(path)) || null
}

// the budget of the readers: a new file is taken while there is room
function take(ctx, path) {
	if (ctx.taken.has(path)) return false
	if (ctx.taken.size >= ctx.budget.files) {
		ctx.result.skipped++
		return false
	}
	ctx.taken.add(path)
	return true
}

async function scanFile(ctx, path, meta) {
	const key = metaKey(meta)
	const old = ctx.cache.get(path)
	let entry = null
	if (old && key && old.key === key && (old.map || !ctx.needMap)) {
		entry = old
		ctx.result.fromCache++
	} else if (meta && Number(meta.size) > ctx.budget.bytesPerFile) {
		ctx.result.skipped++
	} else {
		const text = await ctx.io.readText(path)
		if (text !== null && text !== undefined) {
			entry = { key, refs: scanUsage(path, text).slice(0, REFS_PER_FILE), targets: m98Targets(text), map: macroInfo(path, text) }
			ctx.result.read++
		}
	}
	if (entry) ctx.next.set(path, entry)
	ctx.done++
	ctx.onProgress(ctx.done, ctx.done + ctx.pending, path)
	return entry
}

async function walkChain(ctx) {
	const queue = chainStart()
	const seen = new Set()
	while (queue.length && !ctx.cancelled()) {
		const path = queue.shift()
		if (seen.has(path)) continue
		seen.add(path)
		if (ctx.scope.hide && isExcluded(path, ctx.pluginIds)) continue
		const meta = await metaOf(ctx, path)
		if (!meta || !take(ctx, path)) continue
		ctx.pending = queue.length
		const e = await scanFile(ctx, path, meta)
		if (e) e.targets.forEach(t => { if (!seen.has(t)) queue.push(t) })
	}
}

// the .g files of the folders switched on, breadth first down to the depth; every subfolder found is reported for its switch
async function folderFiles(ctx) {
	const files = []
	const queue = activeDirs(ctx.scope).map(dir => ({ dir, depth: 1 }))
	while (queue.length && !ctx.cancelled()) {
		const { dir, depth } = queue.shift()
		for (const it of await listing(ctx, dir)) {
			if (!it || typeof it.name !== 'string') continue
			const path = dir + '/' + it.name
			if (it.isDirectory) {
				const excluded = ctx.scope.hide && isExcluded(path, ctx.pluginIds)
				const on = folderOn(ctx.scope, path, excluded)
				ctx.result.folders.push({ dir: path, depth: depth + 1, excluded, junk: isJunk(path), on, reached: depth < ctx.scope.depth })
				if (on && depth < ctx.scope.depth) queue.push({ dir: path, depth: depth + 1 })
			} else if (/\.g$/i.test(it.name) && !(ctx.scope.hide && isJunk(it.name))) files.push({ path, meta: it })
		}
	}
	return files
}

async function walkFolders(ctx) {
	const files = await folderFiles(ctx)
	for (let i = 0; i < files.length && !ctx.cancelled(); i++) {
		ctx.pending = files.length - i - 1
		if (take(ctx, files[i].path)) await scanFile(ctx, files[i].path, files[i].meta)
	}
}

// the definitions: every .g file of 0:/sys down to DEFS_DEPTH not read already, within its own budget
async function definitionFiles(ctx) {
	const files = []
	const queue = [{ dir: DEFS_ROOT, depth: 1 }]
	while (queue.length && !ctx.cancelled()) {
		const { dir, depth } = queue.shift()
		for (const it of await listing(ctx, dir)) {
			if (!it || typeof it.name !== 'string') continue
			const path = dir + '/' + it.name
			if (isJunk(path)) continue
			if (!it.isDirectory) {
				if (/\.g$/i.test(it.name) && !ctx.taken.has(path)) files.push({ path, meta: it })
			} else if (depth < DEFS_DEPTH) queue.push({ dir: path, depth: depth + 1 })
			else ctx.result.unscanned.push({ dir: path, depth: depth + 1 })
		}
	}
	return files
}

async function walkDefinitions(ctx) {
	const files = await definitionFiles(ctx)
	for (let i = 0; i < files.length && !ctx.cancelled(); i++) {
		if (i >= ctx.budget.files) {
			ctx.result.defsComplete = false
			ctx.result.skipped += files.length - i
			return
		}
		ctx.pending = files.length - i - 1
		ctx.defsOnly.add(files[i].path)
		await scanFile(ctx, files[i].path, files[i].meta)
	}
}

// the folders that could hold a definition and were not read: a root switched off (0:/sys is read for definitions anyway) and every
// folder outside 0:/sys left out, switched off or below the depth (backups and examples never count: they do not run)
function unscannedFolders(ctx) {
	const read = new Set(ctx.result.folders.filter(f => f.on && f.reached).map(f => f.dir))
	const out = ctx.result.unscanned.filter(f => !read.has(f.dir))
	for (const root of ROOT_DIRS) if (root !== DEFS_ROOT && !ctx.scope.dirs[root]) out.push({ dir: root, depth: 1 })
	for (const f of ctx.result.folders) {
		if (!f.junk && !under(f.dir, DEFS_ROOT) && (!f.on || !f.reached)) out.push({ dir: f.dir, depth: f.depth })
	}
	const seen = new Set()
	return out.filter(f => (seen.has(f.dir) ? false : (seen.add(f.dir), true)))
}

function collectRefs(ctx) {
	const refs = []
	ctx.next.forEach((e, path) => {
		const own = ctx.defsOnly.has(path) ? e.refs.filter(r => r.kind === 'define') : e.refs
		refs.push(...own)
	})
	return refs
}

// io = { listDir, readText }; opts = { scope, budget: { files, bytesPerFile }, pluginIds, cache (Map), onProgress(done, total, the file just read), cancelled(), needMap }
// needMap: a cached file without its macro map (macro-map.js, kept in memory only) is read again
// -> { refs, cache (the new Map: only the files of this run), read, fromCache, skipped, files, folders, unscanned, defsComplete, cancelled }
export async function runScan(io, opts) {
	const o = opts || {}
	const ctx = {
		io, needMap: o.needMap === true, scope: cleanScope(o.scope), budget: o.budget || { files: 80, bytesPerFile: 131072 }, pluginIds: o.pluginIds || [], cache: o.cache || new Map(),
		next: new Map(), listings: new Map(), taken: new Set(), defsOnly: new Set(), pending: 0, done: 0,
		onProgress: o.onProgress || (() => {}), cancelled: o.cancelled || (() => false),
		result: { read: 0, fromCache: 0, skipped: 0, folders: [], unscanned: [], defsComplete: true }
	}
	if (ctx.scope.chain) await walkChain(ctx)
	await walkFolders(ctx)
	await walkDefinitions(ctx)
	const cancelled = ctx.cancelled()
	return Object.assign(ctx.result, { refs: collectRefs(ctx), cache: ctx.next, files: ctx.next.size, unscanned: unscannedFolders(ctx), defsComplete: ctx.result.defsComplete && !cancelled, cancelled })
}

// the cache in the watch file of the SBC tier: [{ path, key, refs, targets }], at most CACHE_FILES files
export function cacheToJson(cache) {
	const out = []
	const m = cache || new Map()
	m.forEach((e, path) => { if (out.length < CACHE_FILES && e.key) out.push({ path, key: e.key, refs: e.refs, targets: e.targets }) })
	return out
}

export function cacheFromJson(list) {
	const m = new Map()
	for (const e of Array.isArray(list) ? list : []) {
		if (e && typeof e.path === 'string' && typeof e.key === 'string' && e.key && Array.isArray(e.refs)) m.set(e.path, { key: e.key, refs: e.refs.slice(0, REFS_PER_FILE), targets: Array.isArray(e.targets) ? e.targets : [] })
	}
	return m
}
