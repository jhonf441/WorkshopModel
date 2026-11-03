'use strict'

// Persistence of globals across a reboot. RepRapFirmware forgets every global when it restarts, so the plugin writes ONE generated
// macro (PERSIST_MACRO) that creates each persistent global, or sets it when it already exists, and the person includes it from
// config.g with INCLUDE_LINE. The macro is the only storage of the list: reading it back gives the names and the saved values.
// Pure: test/presets-persist.test.js, test/globals-groups.test.js.

import { rrfLiteral } from './globals-typing.js'
import { toPlain } from './value-format.js'
import { getAtPath } from './model-path.js'

export const PERSIST_MACRO = '0:/sys/workshop-globals.g'
export const INCLUDE_LINE = 'M98 P"0:/sys/workshop-globals.g"'
export const HEADER = [
	'; workshop-globals.g -- written by Model Explorer (WorkshopModel). Do not edit by hand: the plugin rewrites it.',
	'; Include it from config.g (after the hardware is configured) with:  ' + INCLUDE_LINE,
	'; Each global is created when it does not exist yet, and set to the saved value when it does.'
]

const ENTRY_RE = /^\s*global\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/

// entries [{ name, literal }] -> the text of the macro
export function generatePersistMacro(entries, now) {
	const at = now instanceof Date ? now : new Date()
	const lines = HEADER.concat(['; Saved ' + at.toISOString().replace(/\.\d{3}Z$/, 'Z'), ''])
	const seen = new Set()
	for (const e of entries || []) {
		if (!e || !e.name || seen.has(e.name)) continue
		seen.add(e.name)
		lines.push('if !exists(global.' + e.name + ')')
		lines.push('  global ' + e.name + ' = ' + e.literal)
		lines.push('else')
		lines.push('  set global.' + e.name + ' = ' + e.literal)
	}
	if (!seen.size) lines.push('; (no persistent global yet)')
	return lines.join('\n') + '\n'
}

// the text of the macro -> entries [{ name, literal }] (the `global name = literal` lines; one per name)
export function parsePersistMacro(text) {
	const out = []
	const seen = new Set()
	for (const line of String(text || '').split(/\r?\n/)) {
		const m = ENTRY_RE.exec(line)
		if (m && !seen.has(m[1])) {
			seen.add(m[1])
			out.push({ name: m[1], literal: m[2] })
		}
	}
	return out
}

// does config.g call the macro? (any M98 whose P names workshop-globals.g, with or without the 0:/sys/ prefix)
export function configIncludes(configText) {
	return /^\s*M98\s+P"(0:\/sys\/|\/sys\/|sys\/)?workshop-globals\.g"/im.test(String(configText || ''))
}

// a new entry list with the global set (literal replaced) or removed
export function withEntry(entries, name, literal) {
	const rest = (entries || []).filter(e => e.name !== name)
	return literal === null || literal === undefined ? rest : rest.concat([{ name, literal }]).sort((a, b) => a.name.localeCompare(b.name))
}

// what needs the person's attention: kept globals whose saved value is not the live one (stale), and a macro that config.g does not
// call (missingInclude, only when config.g could be read). -> { stale: [names], missingInclude, open }
export function persistAttention(entries, globals, configIncludesIt) {
	const stale = (entries || []).filter(e => {
		const v = getAtPath(globals, e.name)
		return v !== undefined && rrfLiteral(toPlain(v)) !== e.literal
	}).map(e => e.name)
	const missingInclude = (entries || []).length > 0 && configIncludesIt === false
	return { stale, missingInclude, open: stale.length > 0 || missingInclude }
}
