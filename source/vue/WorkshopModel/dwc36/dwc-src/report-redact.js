'use strict'

// Redaction for the machine report: what is private, where to find it in the object model, and the scrub that removes it from the free
// texts a person typed (a sensor named after an address, a plugin named after the machine). The report itself is built from a fixed list of
// fields (machine-report.js), so a private value cannot get in by accident; this scrub is the second fence for the names the machine
// reports as free text. Pure: test/machine-report.test.js.

import { getAtPath } from './model-path.js'
import { childrenOf } from './model-tree.js'
import { helpChoice } from './view-choices.js'

export const REDACTED = '[redacted]'

// the things a person may choose to include, one tick box each (all off by default): the help of each is the usual four texts
export const REPORT_INCLUDES = ['name', 'hostname', 'ip', 'mac', 'serial', 'paths'].map(id => helpChoice('report_inc', id))

// the version of DWC the person can type when the page cannot tell it
export const REPORT_DWC_SETTING = helpChoice('report', 'dwc')

// The versions of DWC the report can name, chosen from a list (not typed: a typo made a report nobody could read). The one the page detects goes
// first when it is not in the list; '' is "do not state it".
export const REPORT_DWC_VERSIONS = ['3.7.0', '3.6.3', '3.6.2', '3.6.1', '3.6.0', '3.5.2', '3.5.1', '3.5.0', '3.4.6']

// -> [version, ...] the detected one first when it is new
export function dwcVersionChoices(detected) {
	const d = String(detected === undefined || detected === null ? '' : detected).trim()
	const list = REPORT_DWC_VERSIONS.slice()
	if (d && list.indexOf(d) < 0) list.unshift(d)
	return list
}

export function cleanIncludes(o) {
	const out = {}
	for (const c of REPORT_INCLUDES) out[c.id] = !!(o && o[c.id] === true)
	return out
}

const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const IPV6_RE = /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi
const MAC_RE = /\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/gi
const MIN_SECRET = 3

const text = v => (typeof v === 'string' ? v.trim() : '')
const textsOf = (model, path) => childrenOf(getAtPath(model, path)).map(c => c.value)

// the private values of this machine, by what they are: { name, hostname, ip, mac, serial, paths, users } (arrays of texts)
export function secretsOf(model) {
	const iface = childrenOf(getAtPath(model, 'network.interfaces')).map(c => c.value || {})
	const boards = textsOf(model, 'boards').filter(Boolean)
	const dirs = childrenOf(getAtPath(model, 'directories')).map(c => c.value)
	return {
		name: [getAtPath(model, 'network.name')].map(text).filter(Boolean),
		hostname: [getAtPath(model, 'network.hostname')].map(text).filter(Boolean),
		ip: iface.reduce((a, i) => a.concat([i.actualIP, i.gateway, i.subnet, i.dnsServer, i.ssid]), []).map(text).filter(Boolean),
		mac: iface.map(i => text(i.macAddress)).filter(Boolean),
		serial: boards.map(b => text(b.uniqueId)).filter(Boolean),
		paths: [getAtPath(model, 'job.file.fileName'), getAtPath(model, 'job.lastFileName')].concat(dirs).map(text).filter(Boolean),
		users: textsOf(model, 'userSessions').reduce((a, u) => a.concat([u && u.origin, u && u.id]), []).map(text).filter(Boolean)
	}
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// a free text with every private value that is not included replaced by [redacted]; whitespace collapsed to one line. The shapes of an
// address (four numbers, a MAC) are replaced too, except with noPatterns (a version number, which can have four numbers)
export function scrub(value, secrets, include, noPatterns) {
	let s = String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim()
	const inc = include || {}
	const all = secrets || {}
	for (const cat of Object.keys(all)) {
		if (inc[cat]) continue
		for (const lit of all[cat]) if (lit.length >= MIN_SECRET) s = s.replace(new RegExp(escapeRe(lit), 'gi'), REDACTED)
	}
	if (noPatterns) return s // a version such as 3.5.0.1 is not an address
	if (!inc.ip) s = s.replace(IPV4_RE, REDACTED).replace(IPV6_RE, REDACTED)
	if (!inc.mac) s = s.replace(MAC_RE, REDACTED)
	return s
}
