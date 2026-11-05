'use strict'

// What a line of the file viewer (FilePeek.vue) does with the global, in two colors (ESTANDAR E4): the line that creates or sets it is "write"
// (yellow), the line that only reads it is "read" (blue). 3.6 line only: file-peek.js stays equal to the 3.7 one.
//
// markLine(lineText, name) -> [{ text, mark }] with mark '' (plain), 'write' (`global NAME = ...` or `set global.NAME = ...`) or 'read' (any other
// global.NAME). The word boundary is the one of splitMark: global.laser is not inside global.laserFocus.
export function markLine(lineText, name) {
	const text = String(lineText === undefined || lineText === null ? '' : lineText)
	if (!name) return [{ text, mark: '' }]
	const esc = String(name).replace(/[^A-Za-z0-9_]/g, c => '\\' + c)
	const end = '(?![A-Za-z0-9_])'
	const re = new RegExp('(\\bglobal\\s+' + esc + end + ')|((\\bset\\s+)global\\.' + esc + end + ')|(\\bglobal\\.' + esc + end + ')', 'g')
	const out = []
	let from = 0
	for (let m = re.exec(text); m; m = re.exec(text)) {
		const lead = m[2] ? m[3].length : 0
		const at = m.index + lead
		const hit = m[0].slice(lead)
		if (at > from) out.push({ text: text.slice(from, at), mark: '' })
		out.push({ text: hit, mark: m[3] || m[1] ? 'write' : 'read' })
		from = at + hit.length
	}
	if (from < text.length) out.push({ text: text.slice(from), mark: '' })
	return out.length ? out : [{ text, mark: '' }]
}
