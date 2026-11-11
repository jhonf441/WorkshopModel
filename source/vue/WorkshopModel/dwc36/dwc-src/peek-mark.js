'use strict'

// What a line of the file viewer (FilePeek.vue) does with the global, in the three kinds of the usage finder and their three colours
// (look-tokens.js): the line that creates it is 'define' (`global NAME = ...`, green), the line that writes it is 'set' (`set global.NAME = ...`,
// amber) and any other `global.NAME` is 'read' (blue). A comment is not a use (usage-scan.js leaves it out), so the text after a ';' stays
// plain. 3.6 line only: file-peek.js stays equal to the 3.7 one.
//
// markLine(lineText, name) -> [{ text, mark }] with mark '' (plain), 'define', 'set' or 'read'. The word boundary is the one of splitMark:
// global.laser is not inside global.laserFocus.
import { stripComment } from './usage-scan.js'

export function markLine(lineText, name) {
	const text = String(lineText === undefined || lineText === null ? '' : lineText)
	if (!name) return [{ text, mark: '' }]
	const code = stripComment(text)
	const esc = String(name).replace(/[^A-Za-z0-9_]/g, c => '\\' + c)
	const end = '(?![A-Za-z0-9_])'
	const re = new RegExp('(\\bglobal\\s+' + esc + end + ')|((\\bset\\s+)global\\.' + esc + end + ')|(\\bglobal\\.' + esc + end + ')', 'g')
	const out = []
	let from = 0
	for (let m = re.exec(code); m; m = re.exec(code)) {
		const lead = m[2] ? m[3].length : 0
		const at = m.index + lead
		const hit = m[0].slice(lead)
		if (at > from) out.push({ text: text.slice(from, at), mark: '' })
		out.push({ text: hit, mark: m[1] ? 'define' : m[2] ? 'set' : 'read' })
		from = at + hit.length
	}
	if (from < text.length) out.push({ text: text.slice(from), mark: '' })
	return out.length ? out : [{ text, mark: '' }]
}

// the kind of a whole line from its pieces: what it does most to the global (create beats write beats read), '' when it does nothing
export function lineKind(parts) {
	const marks = (parts || []).map(p => p && p.mark)
	for (const k of ['define', 'set', 'read']) if (marks.indexOf(k) >= 0) return k
	return ''
}
